import os
import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

async def upload_to_supabase_storage(file_path: str, filename: str) -> str | None:
    """
    Uploads a file to Supabase Storage bucket if SUPABASE_URL and SUPABASE_KEY are configured.
    Returns the public URL of the uploaded file, or None if Supabase storage is not configured.
    """
    supabase_url = getattr(settings, "SUPABASE_URL", None) or os.getenv("SUPABASE_URL")
    supabase_key = getattr(settings, "SUPABASE_KEY", None) or os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    bucket = getattr(settings, "SUPABASE_BUCKET", None) or os.getenv("SUPABASE_BUCKET") or "audio-notes"

    if not supabase_url or not supabase_key:
        return None

    supabase_url = supabase_url.rstrip("/")
    upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{filename}"
    public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{filename}"

    ext = os.path.splitext(filename)[1].lower()
    mime_type = (
        "audio/mpeg" if ext == ".mp3" else
        "audio/wav" if ext == ".wav" else
        "audio/mp4" if ext in (".m4a", ".mp4") else
        "audio/ogg" if ext == ".ogg" else
        "audio/webm" if ext == ".webm" else
        "application/octet-stream"
    )

    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "apiKey": supabase_key,
        "Content-Type": mime_type,
        "x-upsert": "true",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_path, "rb") as f:
                content = f.read()

            res = await client.post(upload_url, headers=headers, content=content)
            if res.status_code in (200, 201):
                logger.info(f"Successfully uploaded {filename} to Supabase Storage bucket '{bucket}'.")
                return public_url
            else:
                logger.warning(f"Supabase Storage upload returned HTTP {res.status_code}: {res.text}")
                return None
    except Exception as e:
        logger.error(f"Failed to upload audio to Supabase Storage: {e}")
        return None
