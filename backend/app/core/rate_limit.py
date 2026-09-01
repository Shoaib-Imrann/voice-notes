import time
import logging
from collections import defaultdict
from fastapi import Request, HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory sliding window IP rate limiter (IP -> list of timestamps)
_upload_history = defaultdict(list)

def enforce_ip_rate_limit(request: Request) -> None:
    """
    Enforces a strict per-IP sliding window rate limit on upload and retry endpoints
    to prevent spam and protect API quotas on public demo deployments.
    """
    # Extract client IP (handling Cloudflare, Render, and standard reverse proxy headers)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.headers.get("CF-Connecting-IP"):
        client_ip = request.headers.get("CF-Connecting-IP", "").strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    max_uploads = settings.RATE_LIMIT_UPLOADS_PER_HOUR
    window_seconds = 3600  # 1 hour
    now = time.time()

    # Clean history older than 1 hour
    active_attempts = [t for t in _upload_history[client_ip] if now - t < window_seconds]

    if len(active_attempts) >= max_uploads:
        logger.warning(f"Rate limit exceeded for IP: {client_ip} ({len(active_attempts)} uploads in past hour).")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Upload rate limit reached. In this demo showcase, you can process up to {max_uploads} voice notes per hour. Please try again later."
        )

    active_attempts.append(now)
    _upload_history[client_ip] = active_attempts
