import os
import gc
import shutil
import tempfile
import logging
import asyncio
import httpx
from pydub import AudioSegment
from pydub.silence import split_on_silence
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
    api_key = settings.GNANI_API_KEY
    filename = os.path.basename(chunk_file_path)
    ext = os.path.splitext(filename)[1].lower()

    mime_type = "audio/wav"
    if ext == ".mp3":
        mime_type = "audio/mpeg"
    elif ext in (".m4a", ".mp4"):
        mime_type = "audio/mp4"

    headers = {
        "X-API-Key-ID": api_key,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
    }

    with open(chunk_file_path, "rb") as audio_file:
        file_bytes = audio_file.read()

    files = {
        "audio_file": (filename, file_bytes, mime_type)
    }
    data = {
        "language_code": "en-IN",
        "format": "transcribe"
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
            raise ValueError("Gnani STT API request timed out after 120s. Please try again.")
        except httpx.RequestError as req_err:
            logger.error(f"Gnani STT Network Error: {req_err}")
            if attempt < max_retries:
                await asyncio.sleep(attempt * 2)
                continue
            raise ValueError(f"Network connection failure contacting Gnani STT API: {str(req_err)}")

        if response.status_code == 200:
            res_json = response.json()
            transcript = (
                res_json.get("transcript") or 
                res_json.get("text") or 
                res_json.get("result") or 
                res_json.get("output", "")
            )
            return str(transcript).strip() if transcript else ""
            
        if response.status_code == 429 and attempt < max_retries:
            logger.warning(f"Gnani STT API Rate Limited (429). Pausing {attempt * 2}s before retry {attempt}/{max_retries}...")
            await asyncio.sleep(attempt * 2)
            continue

        body_text = response.text.strip()
        logger.error(f"Gnani STT API Error (HTTP {response.status_code}): {body_text[:300]}")

        # Detect Cloudflare WAF block HTML page vs Gnani API error
        if "Cloudflare" in body_text or "cf-wrapper" in body_text or "<!DOCTYPE html>" in body_text:
            raise ValueError(f"Gnani STT API connection blocked by Cloudflare WAF on vachana.ai (HTTP {response.status_code}).")

        try:
            err_json = response.json()
            err_msg = (
                err_json.get("error", {}).get("message")
                or err_json.get("message")
                or err_json.get("detail")
            )
            if err_msg:
                raise ValueError(f"Gnani STT API: {err_msg}")
        except ValueError as ve:
            raise ve
        except Exception:
            pass

        if response.status_code in (401, 403):
            raise ValueError(f"Gnani STT Authentication Failed (HTTP {response.status_code}): Invalid X-API-Key-ID.")

        raise ValueError(f"Gnani STT API returned HTTP {response.status_code}: {body_text[:100]}")

    raise ValueError("Gnani STT API rate limit exceeded after maximum retries. Please try again.")

from pydub.silence import split_on_silence

async def transcribe_audio_gnani(file_path: str) -> str:
    """
    Calls Gnani's Speech-to-Text API to transcribe an audio file.
    Uses silence-aware speech segmentation (8s-12s optimal chunks) with 16kHz mono normalization
    and recursive sub-chunk fallback to guarantee complete transcript coverage.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError("Audio recording could not be found on server.")

    api_key = settings.GNANI_API_KEY
    if not api_key:
        logger.error("Gnani API key (GNANI_API_KEY) missing in environment.")
        raise ValueError("Speech-to-text transcription service is currently unavailable.")

    # 1. Load Audio & Normalize Format to 16kHz, 16-bit, Mono PCM
    try:
        ext = os.path.splitext(file_path)[1].lower().lstrip(".")
        if ext == "m4a":
            ext = "mp4"
        audio = AudioSegment.from_file(file_path, format=ext if ext else None)
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        duration_seconds = len(audio) / 1000.0
    except Exception as e:
        logger.warning(f"Could not normalize audio with pydub: {e}. Sending single request...")
        audio = None
        duration_seconds = 0.0

    temp_dir = tempfile.mkdtemp(prefix="gnani_chunks_")
    transcripts = []

    try:
        # 2. Short audio (<= 15 seconds): Export normalized WAV and send directly
        if not audio or duration_seconds <= 15.0:
            norm_wav_path = os.path.join(temp_dir, "normalized_full.wav")
            if audio:
                audio.export(norm_wav_path, format="wav", parameters=["-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1"])
                target_path = norm_wav_path
            else:
                target_path = file_path

            async with httpx.AsyncClient(timeout=120.0) as client:
                return await _transcribe_single_chunk(client, target_path)

        # 3. Silence-Aware Speech Segmentation (8s - 12s optimal chunks)
        logger.info(f"Long audio detected ({duration_seconds:.1f}s). Performing silence-aware speech segmentation...")
        try:
            silence_thresh = audio.dBFS - 12 if audio.dBFS > -50 else -40
            raw_segments = split_on_silence(
                audio,
                min_silence_len=350,
                silence_thresh=silence_thresh,
                keep_silence=200
            )
        except Exception as sil_err:
            logger.warning(f"Silence detection failed: {sil_err}. Falling back to 10s intervals.")
            raw_segments = []

        # If silence detection found natural pauses, group them into 8s-12s speech chunks.
        # Ensure NO chunk ever exceeds 12 seconds (Gnani API hard limit is 30s, sweet spot is 8-12s).
        chunks = []
        if raw_segments and len(raw_segments) > 1:
            current_chunk = AudioSegment.empty()
            for seg in raw_segments:
                # If a single speech segment without silence is longer than 12s, split into 10s sub-pieces
                sub_segs = [seg[i : i + 10000] for i in range(0, len(seg), 10000)] if len(seg) > 12000 else [seg]
                for s in sub_segs:
                    if len(current_chunk) + len(s) > 12000:
                        if len(current_chunk) > 0:
                            chunks.append(current_chunk)
                        current_chunk = s
                    else:
                        current_chunk = current_chunk + s
            if len(current_chunk) > 0:
                chunks.append(current_chunk)
        else:
            # Fallback to 10s intervals if silence segmentation was uniform
            chunk_length_ms = 10 * 1000
            chunks = [audio[i : i + chunk_length_ms] for i in range(0, len(audio), chunk_length_ms)]

        # Free raw audio and segments from memory before transcribing
        del raw_segments
        del audio
        gc.collect()

        logger.info(f"Transcribing audio ({duration_seconds:.1f}s, {len(chunks)} speech segments via Gnani STT)...")

        async with httpx.AsyncClient(timeout=120.0) as client:
            for idx, chunk in enumerate(chunks):
                chunk_filename = f"chunk_{idx:04d}.wav"
                chunk_path = os.path.join(temp_dir, chunk_filename)
                chunk.export(chunk_path, format="wav", parameters=["-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1"])

                chunk_text = await _transcribe_single_chunk(client, chunk_path)

                # Sub-chunk fallback: if segment returned empty, split in half (shorter context)
                if not chunk_text and len(chunk) > 6000:
                    half_len = len(chunk) // 2
                    sub1 = chunk[:half_len]
                    sub2 = chunk[half_len:]
                    
                    sub1_path = os.path.join(temp_dir, f"sub1_{idx}.wav")
                    sub2_path = os.path.join(temp_dir, f"sub2_{idx}.wav")
                    sub1.export(sub1_path, format="wav", parameters=["-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1"])
                    sub2.export(sub2_path, format="wav", parameters=["-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1"])

                    t1 = await _transcribe_single_chunk(client, sub1_path)
                    await asyncio.sleep(0.3)
                    t2 = await _transcribe_single_chunk(client, sub2_path)
                    
                    combined_sub = f"{t1} {t2}".strip()
                    if combined_sub:
                        chunk_text = combined_sub
                    
                    if os.path.exists(sub1_path):
                        os.remove(sub1_path)
                    if os.path.exists(sub2_path):
                        os.remove(sub2_path)

                # Delete chunk wav from disk immediately after transcription
                if os.path.exists(chunk_path):
                    os.remove(chunk_path)

                if chunk_text:
                    transcripts.append(chunk_text)

                # Rate-limit safety pause
                if idx < len(chunks) - 1:
                    await asyncio.sleep(0.3)

        full_transcript = " ".join(transcripts).strip()
        if not full_transcript:
            raise ValueError("Gnani STT returned empty transcript output across all audio segments.")

        logger.info(f"Transcription completed ({len(transcripts)}/{len(chunks)} speech segments transcribed).")
        return full_transcript
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
