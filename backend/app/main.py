import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.session import engine, Base, SessionLocal
from app.models.note import AudioNote

logger = logging.getLogger(__name__)

# Auto-create database tables (Alembic can manage migrations for production)
Base.metadata.create_all(bind=engine)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Auto-recover notes interrupted mid-processing during server crashes/restarts
    try:
        db = SessionLocal()
        try:
            interrupted_notes = db.query(AudioNote).filter(
                AudioNote.status.in_(["PROCESSING_ASR", "PROCESSING_LLM", "UPLOADED"])
            ).all()
            if interrupted_notes:
                logger.warning(f"Found {len(interrupted_notes)} interrupted notes on startup. Marking as FAILED with retry prompt.")
                for item in interrupted_notes:
                    item.status = "FAILED"
                    item.error_message = "Server restarted during processing. Click Retry to reprocess."
                db.commit()
        finally:
            db.close()
    except Exception as startup_err:
        logger.error(f"Startup task recovery check failed: {startup_err}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration: Configurable via env, no wildcard by default, restricted HTTP methods
allowed_origins = [
    origin.strip()
    for origin in settings.BACKEND_CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), interest-cohort=()"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Mount static uploads directory for audio playback
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Voice Notes Platform API",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }
