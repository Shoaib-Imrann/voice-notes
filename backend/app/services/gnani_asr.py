import os
import shutil
import tempfile
import logging
import asyncio
import httpx
from pydub import AudioSegment
from app.core.config import settings

logger = logging.getLogger(__name__)

async def _transcribe_single_chunk(client: httpx.AsyncClient, chunk_file_path: str) -> str:
    """
    Sends a single audio clip (<= 25s) to Gnani Vachana STT REST API (https://api.vachana.ai/stt/v3).
    Follows Gnani's official documentation specs:
      - Header: X-API-Key-ID
      - Form Field: audio_file
      - Form Field: language_code (en-IN)
    """
    api_key = settings.GNANI_API_KEY or os.getenv("GNANI_API_KEY")
    if not api_key:
        raise ValueError("Gnani STT API Key (GNANI_API_KEY) is missing in Render environment variables.")

    filename = os.path.basename(chunk_file_path)
    ext = os.path.splitext(filename)[1].lower()

    mime_type = "audio/wav"
    if ext == ".mp3":
        mime_type = "audio/mpeg"
    elif ext in (".m4a", ".mp4"):
        mime_type = "audio/mp4"

    headers = {
        "X-API-Key-ID": api_key.strip(),
        "User-Agent": "GnaniSTTClient/3.0",
        "Accept": "application/json"
    }

    with open(chunk_file_path, "rb") as audio_file:
        file_bytes = audio_file.read()

    files = {
        "audio_file": (filename, file_bytes, mime_type)
    }
    data = {
        "language_code": "en-IN"
    }

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            response = await client.post(
                settings.GNANI_STT_URL,
                headers=headers,
                files=files,
                data=data
            )
        except httpx.TimeoutException:
            logger.error(f"Gnani STT API Request Timed Out (attempt {attempt}/{max_retries})")
            if attempt < max_retries:
                await asyncio.sleep(attempt * 2)
                continue
            raise ValueError("Gnani STT API request timed out. Please try again.")
        except httpx.RequestError as req_err:
            logger.error(f"Gnani STT Network Error: {req_err}")
            if attempt < max_retries:
                await asyncio.sleep(attempt * 2)
                continue
            raise ValueError(f"Network error connecting to Gnani STT API: {str(req_err)}")

        if response.status_code == 200:
            res_json = response.json()
            logger.info(f"Gnani STT raw response for {filename}: {res_json}")
            transcript = (
                res_json.get("transcript") or 
                res_json.get("text") or 
                res_json.get("result") or 
                res_json.get("output", "")
            )
            if isinstance(transcript, dict):
                transcript = transcript.get("text") or transcript.get("transcript") or str(transcript)
            elif isinstance(transcript, list):
                transcript = " ".join([str(item.get("text", item)) if isinstance(item, dict) else str(item) for item in transcript])
            
            clean_text = str(transcript).strip() if transcript else ""
            return clean_text
            
        if response.status_code == 429 and attempt < max_retries:
            logger.warning(f"Gnani STT API Rate Limited (429). Pausing {attempt * 2}s before retry {attempt}/{max_retries}...")
            await asyncio.sleep(attempt * 2)
            continue

        logger.error(f"Gnani STT API Error (HTTP {response.status_code}): {response.text}")
        if response.status_code == 401:
            raise ValueError("Gnani STT Authentication Failed: Invalid X-API-Key-ID.")
        if response.status_code == 403:
            raise ValueError("Gnani STT API Access Forbidden (HTTP 403). Please check your Gnani API key permissions.")
        raise ValueError(f"Gnani STT Error (HTTP {response.status_code}: {response.text})")

    raise ValueError("Gnani STT API rate limit exceeded. Please try again.")

async def transcribe_audio_gnani(file_path: str) -> str:
    """
    Calls Gnani's Speech-to-Text API to transcribe an audio file.
    According to docs.gnani.ai, STT REST accepts clips <= 60s per request.
    Longer recordings are automatically split into 25-second segments and transcribed.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError("Audio recording could not be found on server.")

    api_key = settings.GNANI_API_KEY
    if not api_key:
        logger.error("Gnani API key (GNANI_API_KEY) missing in environment.")
        raise ValueError("Speech-to-text transcription service is currently unavailable.")

    # 1. Load Audio & Check Duration
    try:
        ext = os.path.splitext(file_path)[1].lower().lstrip(".")
        if ext == "m4a":
            ext = "mp4"
        audio = AudioSegment.from_file(file_path, format=ext if ext else None)
        duration_seconds = len(audio) / 1000.0
    except Exception as e:
        logger.warning(f"Could not calculate audio duration with pydub: {e}. Sending single request...")
        audio = None
        duration_seconds = 0.0

    # 2. Short audio (<= 25 seconds): Send directly
    if not audio or duration_seconds <= 25.0:
        async with httpx.AsyncClient(timeout=120.0) as client:
            return await _transcribe_single_chunk(client, file_path)

    # 3. Long Audio (2+ min): Chunk into 25s segments per Gnani STT REST limits (<=60s)
    logger.info(f"Long audio detected ({duration_seconds:.1f}s). Splitting into 25s segments for Gnani STT REST API...")
    
    chunk_length_ms = 25 * 1000  # 25 seconds
    chunks = [audio[i : i + chunk_length_ms] for i in range(0, len(audio), chunk_length_ms)]
    
    temp_dir = tempfile.mkdtemp(prefix="gnani_chunks_")
    transcripts = []

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            for idx, chunk in enumerate(chunks):
                chunk_filename = f"chunk_{idx:04d}.wav"
                chunk_path = os.path.join(temp_dir, chunk_filename)
                chunk.export(chunk_path, format="wav")

                logger.info(f"Transcribing segment {idx + 1}/{len(chunks)} via Gnani STT...")
                chunk_text = await _transcribe_single_chunk(client, chunk_path)
                if chunk_text:
                    transcripts.append(chunk_text)

                # Rate-limit safety pause
                if idx < len(chunks) - 1:
                    await asyncio.sleep(0.4)

        full_transcript = " ".join(transcripts).strip()
        if not full_transcript:
            raise ValueError("Gnani STT returned empty transcript output across all audio segments.")
        
        return full_transcript
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
