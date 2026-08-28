from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "Audio Notes API",
        "version": "v1"
    }
