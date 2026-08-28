from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AudioNoteBase(BaseModel):
    title: str

class AudioNoteCreate(AudioNoteBase):
    pass

class AudioNoteResponse(BaseModel):
    id: str
    slug: Optional[str] = None
    title: str
    filename: str
    file_url: Optional[str] = None
    duration_seconds: Optional[float] = 0.0
    file_size_bytes: int
    status: str
    transcript: Optional[str] = None
    summary: Optional[Any] = None  # JSON parsed summary object or text
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AudioNoteStatusResponse(BaseModel):
    id: str
    slug: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

