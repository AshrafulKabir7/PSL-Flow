"""
LLM client using OpenRouter (primary) with Google Gemini as fallback.
Includes automatic retry with backoff on 429 rate-limit responses.
"""

import time
import re
import PIL.Image
import google.generativeai as genai
from openai import OpenAI
from config import settings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_openrouter_client():
    if not settings.OPENROUTER_API_KEY:
        return None
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.OPENROUTER_API_KEY,
    )


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
    """Extract retry delay seconds from error text. Default 30s."""
    # Google format: retry_delay { seconds: 55 }
    m = re.search(r"retry_delay\s*\{\s*seconds:\s*([0-9.]+)", exc_str)
    if m:
        return min(float(m.group(1)) + 1.0, 120.0)

    # OpenRouter/Venice format: retry_after_seconds: 29  (or with surrounding quotes)
    m2 = re.search(r"retry_after_seconds[^0-9]*([0-9.]+)", exc_str)
    if m2:
        return min(float(m2.group(1)) + 1.0, 120.0)

    # Standard Retry-After header (may appear as 'Retry-After': '21' in str(exc))
    m3 = re.search(r"Retry-After[^0-9]*([0-9.]+)", exc_str)
    if m3:
        return min(float(m3.group(1)) + 1.0, 120.0)

    return 30.0


def _is_rate_limit(exc: Exception) -> bool:
    s = str(exc).lower()
    return "429" in s or "quota" in s or "rate" in s or "limit" in s


# ---------------------------------------------------------------------------
# Core chat completion  (OpenRouter → Gemini fallback, with 429 retry)
# ---------------------------------------------------------------------------

def chat_completion(messages: list, model: str = None, max_retries: int = 5, **kwargs) -> str:
    """
    Send messages to the LLM. Returns the text response.
    Retries automatically on 429 rate-limit errors (up to max_retries times).
    Raises RuntimeError on unrecoverable failure.
    """
    last_exc = None

    for attempt in range(max_retries):
        try:
            return _attempt_chat(messages, model, **kwargs)
        except Exception as exc:
            last_exc = exc
            if _is_rate_limit(exc) and attempt < max_retries - 1:
                delay = _parse_retry_delay(str(exc))
                print(f"[llm_client] Rate limit hit (attempt {attempt + 1}/{max_retries}). "
                      f"Retrying in {delay:.1f}s…")
                time.sleep(delay)
                continue
            # Not a rate limit, or exhausted retries — re-raise immediately
            raise RuntimeError(f"LLM call failed after {attempt + 1} attempt(s): {exc}") from exc

    raise RuntimeError(f"LLM call failed after {max_retries} attempts: {last_exc}") from last_exc


def _attempt_chat(messages: list, model: str = None, **kwargs) -> str:
    """Single attempt — tries OpenRouter first, then Gemini fallback."""
    client = _get_openrouter_client()

    if client:
        model_name = model or settings.OPENROUTER_MODEL
        completion_kwargs: dict = {"model": model_name, "messages": messages}
        if kwargs.get("response_format"):
            completion_kwargs["response_format"] = kwargs["response_format"]
        try:
            response = client.chat.completions.create(**completion_kwargs)
            return response.choices[0].message.content
        except Exception as exc:
            exc_str = str(exc).lower()

            # Rate limit on OpenRouter — re-raise so chat_completion retries OpenRouter,
            # not Gemini (Gemini may be misconfigured or also rate-limited).
            if _is_rate_limit(exc):
                raise

            # Some free OpenRouter models reject response_format — retry without it.
            if "response_format" in exc_str or "json" in exc_str:
                try:
                    stripped = {k: v for k, v in completion_kwargs.items() if k != "response_format"}
                    response = client.chat.completions.create(**stripped)
                    return response.choices[0].message.content
                except Exception as exc2:
                    if _is_rate_limit(exc2):
                        raise exc2
                    # Non-rate-limit failure — fall through to Gemini below.

            if not settings.GOOGLE_API_KEY:
                raise RuntimeError(f"OpenRouter failed, no Gemini fallback: {exc}") from exc
            # Non-rate-limit OpenRouter failure → fall through to Gemini.

    # --- Gemini fallback ---
    if not settings.GOOGLE_API_KEY:
        raise RuntimeError("No LLM configured: set GOOGLE_API_KEY or OPENROUTER_API_KEY in .env")

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
    response = m.generate_content(user_content, generation_config=generation_config)
    return response.text


# ---------------------------------------------------------------------------
# Vision completion (Gemini only — best multimodal quality)
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
