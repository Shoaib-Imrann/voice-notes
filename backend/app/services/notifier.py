import logging
import httpx
from app.core.config import settings

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

def send_telegram_message(text: str) -> None:
    """
    Sends a formatted notification message to the configured Telegram chat.
    Fails silently with a warning log if Telegram tokens are not configured or request fails,
    ensuring zero impact on user upload/processing pipelines.
    """
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHAT_ID

    if not token or not chat_id:
        return  # Telegram alerts not configured; skip silently

    # Telegram client strips trailing newlines; appending zero-width space forces a bottom empty line
    formatted_text = f"{text.rstrip()}\n\n\u200B"

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": formatted_text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    try:
        with httpx.Client(timeout=5.0) as client:
            res = client.post(url, json=payload)
            if res.status_code != 200:
                logger.warning(f"Telegram alert response HTTP {res.status_code}: {res.text}")
    except Exception as e:
        logger.warning(f"Could not deliver Telegram alert: {e}")


def notify_new_upload(title: str, duration_sec: float, size_bytes: int, filename: str) -> None:
    """Alerts when an interviewer or user uploads/records a new audio note."""
    size_mb = size_bytes / (1024 * 1024) if size_bytes else 0.0
    dur_min = int(duration_sec // 60)
    dur_sec = int(duration_sec % 60)
    dur_str = f"{dur_min}m {dur_sec}s" if dur_min > 0 else f"{dur_sec}s"

    msg = (
        f"🎙️ <b>New Audio Note Uploaded!</b>\n\n"
        f"📌 <b>Title:</b> <code>{title}</code>\n"
        f"⏱️ <b>Duration:</b> {dur_str}\n"
        f"📦 <b>Size:</b> {size_mb:.2f} MB\n"
        f"📁 <b>File:</b> <code>{filename}</code>\n\n"
        f"⚙️ <i>Processing with Gnani STT & Gemini LLM...</i>\n"
    )
    send_telegram_message(msg)


def notify_processing_completed(title: str, summary_preview: str, duration_sec: float) -> None:
    """Alerts when ASR and Gemini AI summarization finish successfully."""
    dur_min = int(duration_sec // 60)
    dur_sec = int(duration_sec % 60)
    dur_str = f"{dur_min}m {dur_sec}s" if dur_min > 0 else f"{dur_sec}s"

    snippet = (summary_preview[:150] + "...") if len(summary_preview) > 150 else summary_preview

    msg = (
        f"✅ <b>Note Processing Completed!</b>\n\n"
        f"📌 <b>Title:</b> <code>{title}</code> ({dur_str})\n"
        f"🤖 <b>AI Summary Preview:</b>\n"
        f"<i>{snippet}</i>\n\n"
        f"Ready in user dashboard.\n"
    )
    send_telegram_message(msg)


def notify_processing_failed(title: str, error_message: str) -> None:
    """Alerts when a task encounters an error."""
    msg = (
        f"❌ <b>Audio Processing Failed!</b>\n\n"
        f"📌 <b>Title:</b> <code>{title}</code>\n"
        f"⚠️ <b>Error Details:</b>\n"
        f"<code>{error_message[:300]}</code>\n\n"
        f"🔄 <i>The user was provided with the Retry button.</i>\n"
    )
    send_telegram_message(msg)


def notify_server_reboot(rescued_count: int = 0) -> None:
    """Alerts when the backend boots or reboots on Render with individual service health status."""
    db_icon = "✅"
    db_label = "Connected"

    audio_icon = "✅"
    audio_label = "Connected"

    gnani_icon = "✅" if settings.GNANI_API_KEY else "❌"
    gnani_label = "Connected" if settings.GNANI_API_KEY else "Missing Key"

    gemini_icon = "✅" if settings.GEMINI_API_KEY else "❌"
    gemini_label = "Connected" if settings.GEMINI_API_KEY else "Missing Key"

    rescue_msg = (
        f"⚠️ <i>Rescued {rescued_count} interrupted note(s) from previous crash.</i>\n\n"
        if rescued_count > 0
        else ""
    )

    msg = (
        f"<b>Voice Notes Backend Started / Rebooted</b>\n\n"
        f"📊 <b>Services Status:</b>\n"
        f"{db_icon} Database: {db_label}\n"
        f"{audio_icon} Audio Files: {audio_label}\n"
        f"{gnani_icon} Speech STT: {gnani_label}\n"
        f"{gemini_icon} AI Summary: {gemini_label}\n\n"
        f"{rescue_msg}"
    )
    send_telegram_message(msg)
