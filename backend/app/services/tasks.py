import logging
import json
import asyncio
from sqlalchemy.orm import Session
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
    """
    db: Session = SessionLocal()
    try:
        note = db.query(AudioNote).filter(AudioNote.id == note_id).first()
        if not note:
            logger.error(f"Task error: Note {note_id} not found in DB.")
            return

        # 1. Calculate audio duration if missing
        if not note.duration_seconds or note.duration_seconds == 0.0:
            try:
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
        except Exception as e:
            logger.error(f"Summarization failed for note {note_id}: {e}")
            db.rollback()
            note = db.query(AudioNote).filter(AudioNote.id == note_id).first()
            if note:
                note.status = "FAILED"
                note.error_message = f"Summarization failure: {str(e)}"
                db.commit()

    except Exception as outer_e:
        logger.error(f"Unexpected worker failure for note {note_id}: {outer_e}")
    finally:
        db.close()
