import uuid
import re
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Text, DateTime
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

def generate_slug(title: str, note_id: str) -> str:
    clean_title = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    if not clean_title:
        clean_title = "audio-note"
    short_id = note_id[:8] if note_id else uuid.uuid4().hex[:8]
    return f"{clean_title}-{short_id}"

class AudioNote(Base):
    __tablename__ = "audio_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    slug = Column(String(255), nullable=True, unique=True, index=True)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_url = Column(String(512), nullable=True)
    duration_seconds = Column(Float, nullable=True, default=0.0)
    file_size_bytes = Column(Integer, nullable=False, default=0)
    
    # Status lifecycle: UPLOADED -> PROCESSING_ASR -> SUMMARIZING -> COMPLETED / FAILED
    status = Column(String(50), nullable=False, default="UPLOADED", index=True)
    
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

