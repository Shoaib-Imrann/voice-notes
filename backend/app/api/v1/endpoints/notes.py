import os
import json
import uuid
import shutil
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.note import AudioNote, generate_slug
from app.schemas.note import AudioNoteResponse, AudioNoteStatusResponse
from app.core.config import settings
from app.services.tasks import process_audio_note_task
from app.services.supabase_storage import upload_to_supabase_storage

router = APIRouter()

def get_note_by_identifier(db: Session, identifier: str) -> Optional[AudioNote]:
    return db.query(AudioNote).filter(
        (AudioNote.id == identifier) | (AudioNote.slug == identifier)
    ).first()

def format_note_response(note: AudioNote) -> AudioNoteResponse:
    summary_obj = None
    if note.summary:
        try:
            summary_obj = json.loads(note.summary)
        except Exception:
            summary_obj = {"executive_summary": note.summary}
            
    note_slug = note.slug or generate_slug(note.title, note.id)
    return AudioNoteResponse(
        id=note.id,
        slug=note_slug,
        title=note.title,
        filename=note.filename,
        file_url=note.file_url or f"/static/uploads/{note.filename}",
        duration_seconds=note.duration_seconds,
        file_size_bytes=note.file_size_bytes,
        status=note.status,
        transcript=note.transcript,
        summary=summary_obj,
        error_message=note.error_message,
        created_at=note.created_at,
        updated_at=note.updated_at
    )

@router.post("/notes/upload", response_model=AudioNoteResponse, status_code=status.HTTP_201_CREATED)
async def upload_audio_note(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    # 0. Check Service Configuration First
    if not settings.GNANI_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="Speech-to-text transcription service is currently unavailable."
        )
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="AI summarization service is currently unavailable."
        )

    # 1. Extension Validation
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed audio formats: {', '.join(settings.ALLOWED_AUDIO_EXTENSIONS)}"
        )

    # Ensure uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Generate unique filename on disk
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    
    # 2. Save File & Check File Size
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    file_size = os.path.getsize(file_path)
    if file_size == 0:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")
        
    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # 3. Convert non-MP3/WAV audio to MP3 for universal web player playback (Safari/iOS/Chrome)
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in (".mp3", ".wav"):
        try:
            from pydub import AudioSegment
            mp3_filename = f"{file_id}_{os.path.splitext(file.filename)[0]}.mp3"
            mp3_path = os.path.join(settings.UPLOAD_DIR, mp3_filename)
            format_name = ext.lstrip(".")
            if format_name == "m4a":
                format_name = "mp4"
            audio_segment = AudioSegment.from_file(file_path, format=format_name if format_name else None)
            audio_segment.export(mp3_path, format="mp3", bitrate="128k")
            
            if os.path.exists(file_path):
                os.remove(file_path)
            file_path = mp3_path
            safe_filename = mp3_filename
            file_size = os.path.getsize(file_path)
        except Exception as conv_err:
            logger.warning(f"Could not convert {ext} to mp3: {conv_err}. Keeping original file.")

    # 4. Create Note Record in DB
    note_title = title.strip() if title and title.strip() else os.path.splitext(file.filename)[0]
    note_title = note_title[:40]
    note_slug = generate_slug(note_title, file_id)
    
    supabase_file_url = await upload_to_supabase_storage(file_path, safe_filename)
    final_file_url = supabase_file_url or f"/static/uploads/{safe_filename}"

    new_note = AudioNote(
        id=file_id,
        slug=note_slug,
        title=note_title,
        filename=safe_filename,
        file_path=file_path,
        file_url=final_file_url,
        file_size_bytes=file_size,
        status="UPLOADED"
    )
    
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    # 4. Trigger Async Processing Pipeline
    background_tasks.add_task(process_audio_note_task, new_note.id)

    return format_note_response(new_note)

@router.post("/notes/{note_id}/retry", response_model=AudioNoteResponse)
async def retry_audio_note(
    note_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    note = get_note_by_identifier(db, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Audio note not found")

    note.error_message = None
    if note.transcript and note.transcript.strip():
        note.status = "PROCESSING_LLM"
    else:
        note.status = "UPLOADED"

    db.commit()
    db.refresh(note)

    background_tasks.add_task(process_audio_note_task, note.id)
    return format_note_response(note)

@router.get("/notes", response_model=List[AudioNoteResponse])
def list_audio_notes(db: Session = Depends(get_db)):
    notes = db.query(AudioNote).order_by(AudioNote.created_at.desc()).all()
    return [format_note_response(n) for n in notes]

@router.get("/notes/{note_id}", response_model=AudioNoteResponse)
def get_audio_note(note_id: str, db: Session = Depends(get_db)):
    note = get_note_by_identifier(db, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Audio note not found")
    return format_note_response(note)

@router.get("/notes/{note_id}/status", response_model=AudioNoteStatusResponse)
def get_audio_note_status(note_id: str, db: Session = Depends(get_db)):
    note = get_note_by_identifier(db, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Audio note not found")
    note_slug = note.slug or generate_slug(note.title, note.id)
    return AudioNoteStatusResponse(
        id=note.id,
        slug=note_slug,
        status=note.status,
        error_message=note.error_message,
        updated_at=note.updated_at
    )

@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_audio_note(note_id: str, db: Session = Depends(get_db)):
    note = get_note_by_identifier(db, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Audio note not found")
        
    if os.path.exists(note.file_path):
        try:
            os.remove(note.file_path)
        except Exception:
            pass
            
    db.delete(note)
    db.commit()
    return None

