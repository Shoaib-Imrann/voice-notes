import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "Voice Notes Platform"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str | None = None
    
    GNANI_API_KEY: str | None = None
    GNANI_STT_URL: str = "https://api.vachana.ai/stt/v3"
    
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-3.6-flash"
    
    SUPABASE_URL: str | None = None
    SUPABASE_KEY: str | None = None
    SUPABASE_BUCKET: str = "audio-notes"
    
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    MAX_UPLOAD_SIZE_MB: int = 15
    MAX_AUDIO_DURATION_SECONDS: float = 600.0  # 10 minutes max
    ALLOWED_AUDIO_EXTENSIONS: set[str] = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm"}
    
    # Telegram Alerts (Optional)
    TELEGRAM_BOT_TOKEN: str | None = None
    TELEGRAM_CHAT_ID: str | None = None

    # CORS: Configurable comma-separated list of origins (no wildcard by default)
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
