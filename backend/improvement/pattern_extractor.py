"""
Extract reusable writing patterns from attorney edits using the LLM.
"""

import json
from utils.llm_client import chat_completion
from generation.prompts import PATTERN_EXTRACTION_PROMPT


def extract_patterns(original: str, edited: str, diff_raw: str) -> list:
    """
    Analyse the diff between original and edited draft and return a list of
    reusable writing patterns identified by the LLM.

    Each pattern dict:
        {
            "description": str,
            "category": str,
            "confidence": str,
            "example_before": str,
            "example_after": str,
        }
    """
    # Truncate inputs to keep token usage reasonable
    orig_snippet = original[:3000] if len(original) > 3000 else original
    edit_snippet = edited[:3000] if len(edited) > 3000 else edited
    diff_snippet = diff_raw[:2000] if len(diff_raw) > 2000 else diff_raw

    user_message = (
        f"ORIGINAL:\n{orig_snippet}\n\n"
        f"EDITED:\n{edit_snippet}\n\n"
        f"DIFF:\n{diff_snippet}"
    )

    messages = [
        {"role": "system", "content": PATTERN_EXTRACTION_PROMPT},
        {"role": "user", "content": user_message},
    ]

    try:
        response_text = chat_completion(
            messages=messages,
            response_format={"type": "json_object"},
        )
    except Exception:
        # Try without json_object mode as fallback
        try:
            response_text = chat_completion(messages=messages)
        except Exception:
            return []

    # Parse JSON array from response
    try:
        data = json.loads(response_text)
        if isinstance(data, list):
            patterns = data
        elif isinstance(data, dict):
            # Sometimes wrapped: {"patterns": [...]}
            for key in ("patterns", "items", "results"):
                if isinstance(data.get(key), list):
                    patterns = data[key]
                    break
            else:
                patterns = []
        else:
            patterns = []
    except (json.JSONDecodeError, TypeError):
        # Try to extract JSON array from raw text
        try:
            start = response_text.index("[")
            end = response_text.rindex("]") + 1
            patterns = json.loads(response_text[start:end])
        except (ValueError, json.JSONDecodeError):
            return []

    # Validate and clean each pattern
    # Normalise category to the canonical set used by the DB and frontend
    _CATEGORY_MAP = {
        "tone":            "Tone",
        "Tone":            "Tone",
        "structure":       "Structure",
        "Structure":       "Structure",
        "legal_precision": "Content",
        "completeness":    "Content",
        "content":         "Content",
        "Content":         "Content",
        "citation_style":  "Citation",
        "citation":        "Citation",
        "Citation":        "Citation",
        "other":           "Content",
    }
    valid_confidences = {"high", "medium", "low"}

    cleaned = []
    for p in patterns:
        if not isinstance(p, dict):
            continue
        desc = str(p.get("description") or "").strip()
        if not desc:
            continue
        raw_cat = p.get("category", "Content")
        category = _CATEGORY_MAP.get(raw_cat, "Content")
        confidence = p.get("confidence", "medium")
        if confidence not in valid_confidences:
            confidence = "medium"
        cleaned.append(
            {
                "description": desc,
                "category": category,
                "confidence": confidence,
                "example_before": str(p.get("example_before") or "").strip(),
                "example_after": str(p.get("example_after") or "").strip(),
            }
        )

    return cleaned[:5]  # cap at 5 per edit
