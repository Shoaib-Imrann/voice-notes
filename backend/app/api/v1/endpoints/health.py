from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "Audio Notes API",
        "version": "v1",
        "services": {
            "gnani": {
                "connected": bool(settings.GNANI_API_KEY),
                "name": "Gnani Speech-to-Text"
            },
            "gemini": {
                "connected": bool(settings.GEMINI_API_KEY),
                "name": "Gemini AI Summary"
            }
        }
    }
