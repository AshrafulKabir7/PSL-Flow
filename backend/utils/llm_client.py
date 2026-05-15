"""
LLM client using Google Gemini with automatic retry on 429 rate-limit responses.
"""

import time
import re
import PIL.Image
import google.generativeai as genai
from config import settings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _configure_gemini():
    genai.configure(api_key=settings.GOOGLE_API_KEY)


def _split_messages_for_gemini(messages: list) -> tuple:
    system_parts, user_parts = [], []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            system_parts.append(content)
        else:
            user_parts.append(content)
    system = "\n\n".join(system_parts) if system_parts else None
    user = "\n\n".join(user_parts)
    return system, user


def _parse_retry_delay(exc_str: str) -> float:
    """Extract retry delay seconds from Gemini error text. Default 30s."""
    m = re.search(r"retry_delay\s*\{\s*seconds:\s*([0-9.]+)", exc_str)
    if m:
        return min(float(m.group(1)) + 1.0, 120.0)
    return 30.0


def _is_rate_limit(exc: Exception) -> bool:
    s = str(exc).lower()
    return "429" in s or "quota" in s or "rate" in s or "limit" in s


# ---------------------------------------------------------------------------
# Core chat completion (Gemini, with 429 retry)
# ---------------------------------------------------------------------------

def chat_completion(messages: list, model: str = None, max_retries: int = 5, **kwargs) -> str:
    """
    Send messages to Gemini. Returns the text response.
    Retries automatically on 429 rate-limit errors (up to max_retries times).
    Raises RuntimeError on unrecoverable failure.
    """
    if not settings.GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY not set in .env")

    _configure_gemini()
    model_name = model or settings.GOOGLE_MODEL
    system_instruction, user_content = _split_messages_for_gemini(messages)

    gen_kwargs: dict = {}
    if system_instruction:
        gen_kwargs["system_instruction"] = system_instruction

    generation_config: dict = {}
    response_format = kwargs.get("response_format")
    if isinstance(response_format, dict) and response_format.get("type") == "json_object":
        generation_config["response_mime_type"] = "application/json"

    m = genai.GenerativeModel(model_name, **gen_kwargs)
    last_exc = None

    for attempt in range(max_retries):
        try:
            response = m.generate_content(user_content, generation_config=generation_config)
            return response.text
        except Exception as exc:
            last_exc = exc
            if _is_rate_limit(exc) and attempt < max_retries - 1:
                delay = _parse_retry_delay(str(exc))
                print(f"[llm_client] Rate limit (attempt {attempt + 1}/{max_retries}). "
                      f"Retrying in {delay:.1f}s…")
                time.sleep(delay)
                continue
            raise RuntimeError(f"LLM call failed after {attempt + 1} attempt(s): {exc}") from exc

    raise RuntimeError(f"LLM call failed after {max_retries} attempts: {last_exc}") from last_exc


# ---------------------------------------------------------------------------
# Vision completion (Gemini)
# ---------------------------------------------------------------------------

def vision_completion(image_path: str, prompt: str, max_retries: int = 5) -> str:
    """Send image + prompt to Gemini Vision. Retries on 429."""
    _configure_gemini()
    model_name = settings.GOOGLE_VISION_MODEL
    m = genai.GenerativeModel(model_name)
    last_exc = None

    for attempt in range(max_retries):
        try:
            image = PIL.Image.open(image_path)
            response = m.generate_content([image, prompt])
            return response.text
        except Exception as exc:
            last_exc = exc
            if _is_rate_limit(exc) and attempt < max_retries - 1:
                delay = _parse_retry_delay(str(exc))
                print(f"[llm_client] Vision rate limit (attempt {attempt + 1}/{max_retries}). "
                      f"Retrying in {delay:.1f}s…")
                time.sleep(delay)
                continue
            raise RuntimeError(f"Vision completion failed: {exc}") from exc

    raise RuntimeError(f"Vision completion failed after {max_retries} attempts: {last_exc}") from last_exc
