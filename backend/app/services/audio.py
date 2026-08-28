import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_audio_duration_and_validate(file_path: str) -> float:
    """
    Validates that the file at file_path is a valid audio file
    and returns its duration in seconds.
    Enforces maximum duration limit (MAX_AUDIO_DURATION_SECONDS).
    """
    if not os.path.exists(file_path):
        raise ValueError("Audio file does not exist on disk.")
        
    file_size = os.path.getsize(file_path)
    if file_size == 0:
        raise ValueError("Uploaded file is empty (0 bytes).")
        
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        from pydub import AudioSegment
        format_name = ext.lstrip(".")
        if format_name == "m4a":
            format_name = "mp4"
        
        audio = AudioSegment.from_file(file_path, format=format_name if format_name else None)
        duration_seconds = round(len(audio) / 1000.0, 2)

        if duration_seconds > settings.MAX_AUDIO_DURATION_SECONDS:
            raise ValueError(
                f"Audio duration ({int(duration_seconds // 60)}m {int(duration_seconds % 60)}s) exceeds "
                f"maximum limit of {int(settings.MAX_AUDIO_DURATION_SECONDS // 60)} minutes."
            )

        return duration_seconds
    except ValueError as ve:
        raise ve
    except Exception as e:
        logger.error(f"Failed to parse audio file at {file_path}: {e}")
        raise ValueError(f"Corrupted or unreadable audio file. Unable to decode audio stream.")

