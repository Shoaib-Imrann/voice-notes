import logging
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger(__name__)

def get_real_ip(request: Request) -> str:
    """
    Extracts the real client IP address, checking X-Forwarded-For and CF-Connecting-IP
    headers set by Render, Vercel, or Cloudflare reverse proxies.
    """
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.split(",")[0].strip()

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return get_remote_address(request) or "127.0.0.1"

limiter = Limiter(key_func=get_real_ip)

def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom 429 handler returning a clean, user-friendly JSON error response.
    """
    logger.warning(f"Rate limit exceeded for IP {get_real_ip(request)} on {request.url.path}")
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}. Please wait before sending more requests."
        }
    )
