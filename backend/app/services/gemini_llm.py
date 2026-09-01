import json
import logging
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

def generate_summary_gemini(transcript: str) -> Dict[str, Any]:
    """
    Uses Google Gemini API to generate a structured summary of any audio transcript
    (meeting, book reading, lecture, podcast, voice memo).
    """
    if not transcript or not transcript.strip():
        raise ValueError("Transcript is empty. Cannot generate summary.")

    gemini_key = settings.GEMINI_API_KEY
    if not gemini_key:
        logger.error("Gemini API key missing in backend environment.")
        raise ValueError("AI summarization service is currently unavailable.")

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=gemini_key)
        
        prompt = f"""
You are an intelligent audio notes assistant. Analyze the transcript below and generate a clear, adaptive summary in JSON format.
The audio could be a meeting, book narration, lecture, podcast clip, or personal voice note.

Transcript:
\"\"\"
{transcript}
\"\"\"

Return ONLY a valid JSON object with the following schema:
{{
  "executive_summary": "A clear, engaging 2-4 sentence overview of what this audio recording is about.",
  "key_takeaways": ["Main point, concept, or story highlight 1", "Main point 2", "Main point 3"],
  "action_items": ["Only include specific tasks or follow-ups mentioned in the audio. If this is a book reading, story, or lecture with no tasks, return an empty array []"],
  "topics": ["Key theme or subject 1", "Key theme 2"]
}}
"""
        candidate_models = [
            settings.GEMINI_MODEL or "gemini-3.6-flash",
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-3.7-flash",
        ]

        response = None
        last_err = None
        successful_model = None

        for model_name in candidate_models:
            try:
                logger.info(f"Attempting Gemini summary with model '{model_name}'...")
                chat = client.chats.create(
                    model=model_name,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                    ),
                )
                response = chat.send_message(prompt)
                if response and response.text:
                    successful_model = model_name
                    logger.info(f"Gemini summary successfully generated using model '{model_name}'.")
                    break
            except Exception as err:
                last_err = err
                logger.warning(f"Gemini model '{model_name}' failed: {err}")

        if response and response.text:
            try:
                structured_data = json.loads(response.text)
                structured_data["model_used"] = successful_model or "gemini-3.6-flash"
                return structured_data
            except json.JSONDecodeError:
                return {
                    "executive_summary": response.text.strip(),
                    "key_takeaways": ["Overview generated"],
                    "action_items": [],
                    "topics": [],
                    "model_used": successful_model or "gemini-3.6-flash",
                }
                
        raise ValueError(f"AI summarization failed across candidate models: {last_err}")
        
    except ValueError as ve:
        raise ve
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}", exc_info=True)
        raise Exception(f"Gemini API Error: {str(e)}")

