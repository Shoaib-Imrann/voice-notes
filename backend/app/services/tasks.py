import os
import json
import logging
import asyncio
import httpx
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.note import AudioNote
from app.services.audio import get_audio_duration_and_validate
from app.services.gnani_asr import transcribe_audio_gnani
from app.services.gemini_llm import generate_summary_gemini

logger = logging.getLogger(__name__)

def process_audio_note_task(note_id: str):
    """
    Background worker process to handle audio duration calculation,
    Gnani ASR transcription (skipped if transcript already exists),
    and Gemini LLM summarization.
    Cleans up local disk working file once cloud processing completes.
    """
    db: Session = SessionLocal()
    try:
        note = db.query(AudioNote).filter(AudioNote.id == note_id).first()
        if not note:
            logger.error(f"Task error: Note {note_id} not found in DB.")
            return

        # 0. Ensure audio file exists locally (download from Supabase Storage if missing on ephemeral disk)
        if not os.path.exists(note.file_path):
            if note.file_url and note.file_url.startswith("http"):
                logger.info(f"File {note.file_path} missing on local disk. Fetching from Supabase: {note.file_url}")
                os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
                local_path = os.path.join(settings.UPLOAD_DIR, note.filename)
                try:
                    with httpx.Client(timeout=60.0) as client:
                        res = client.get(note.file_url)
                        if res.status_code == 200:
                            with open(local_path, "wb") as f:
                                f.write(res.content)
                            note.file_path = local_path
                            db.commit()
                            logger.info(f"Successfully downloaded audio file to {local_path}")
                        else:
                            logger.error(f"Failed to fetch {note.file_url}: HTTP {res.status_code}")
                except Exception as dl_err:
                    logger.error(f"Error downloading audio from Supabase Storage: {dl_err}")

        # 1. Calculate audio duration if missing
        if not note.duration_seconds or note.duration_seconds == 0.0:
            try:
                if os.path.exists(note.file_path):
                    duration = get_audio_duration_and_validate(note.file_path)
                    note.duration_seconds = duration
                    db.commit()
            except Exception as e:
                logger.warning(f"Could not compute audio duration for {note_id}: {e}")

        # 2. Check if Transcript already exists (e.g. retry scenario)
        if note.transcript and isinstance(note.transcript, str) and note.transcript.strip():
            logger.info(f"Existing transcript found for note {note_id}. Skipping Gnani ASR...")
            transcript = note.transcript.strip()
        else:
            # Transcribe via Gnani ASR (Run coroutine cleanly via asyncio.run)
            note.status = "PROCESSING_ASR"
            note.error_message = None
            db.commit()

            try:
                logger.info(f"Starting Gnani ASR for note {note_id}...")
                transcript = asyncio.run(transcribe_audio_gnani(note.file_path))
                note.transcript = transcript
                db.commit()
            except Exception as e:
                logger.error(f"ASR transcription failed for note {note_id}: {e}")
                db.rollback()
                note = db.query(AudioNote).filter(AudioNote.id == note_id).first()
                if note:
                    note.status = "FAILED"
                    note.error_message = f"Transcription failure: {str(e)}"
                    db.commit()
                    try:
                        from app.services.notifier import notify_processing_failed
                        notify_processing_failed(note.title, note.error_message)
                    except Exception:
                        pass
                return

        # 3. LLM Summarization via Gemini
        note.status = "PROCESSING_LLM"
        note.error_message = None
        db.commit()

        try:
            logger.info(f"Starting Gemini LLM summarization for note {note_id}...")
            summary_dict = generate_summary_gemini(transcript)
            note.summary = json.dumps(summary_dict)
            note.status = "COMPLETED"
            note.error_message = None
            db.commit()
            logger.info(f"Note {note_id} processing completed successfully.")

            try:
                from app.services.notifier import notify_processing_completed
                exec_summary = summary_dict.get("executive_summary", "") if isinstance(summary_dict, dict) else str(summary_dict)
                notify_processing_completed(
                    title=note.title,
                    summary_preview=exec_summary or transcript[:200],
                    duration_sec=note.duration_seconds or 0.0
                )
            except Exception as notify_err:
                logger.warning(f"Could not dispatch completion alert: {notify_err}")

        except Exception as e:
            logger.error(f"Summarization failed for note {note_id}: {e}")
            db.rollback()
            note = db.query(AudioNote).filter(AudioNote.id == note_id).first()
            if note:
                note.status = "FAILED"
                note.error_message = f"Summarization failure: {str(e)}"
                db.commit()
                try:
                    from app.services.notifier import notify_processing_failed
                    notify_processing_failed(note.title, note.error_message)
                except Exception:
                    pass

    except Exception as outer_e:
        logger.error(f"Unexpected worker failure for note {note_id}: {outer_e}")
    finally:
        # Guarantee server disk cleanup: if file is stored in Supabase, remove local copy regardless of success or failure
        try:
            note_record = db.query(AudioNote).filter(AudioNote.id == note_id).first()
            if note_record and note_record.file_url and note_record.file_url.startswith("http"):
                if note_record.file_path and os.path.exists(note_record.file_path):
                    os.remove(note_record.file_path)
                    logger.info(f"Cleaned up temporary working audio file {note_record.file_path} from server disk.")
        except Exception as cleanup_err:
            logger.warning(f"Error during file cleanup: {cleanup_err}")
        finally:
            db.close()
