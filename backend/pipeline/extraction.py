"""
Structured field extraction from raw OCR text using an LLM.
"""

import json
from utils.llm_client import chat_completion
from generation.prompts import EXTRACTION_PROMPT


_DEFAULT_FIELDS = {
    "case_number": None,
    "document_type": "Unknown",
    "parties": [],
    "date_filed": None,
    "jurisdiction": None,
    "key_claims": [],
    "key_dates": [],
    "referenced_statutes": [],
    "summary_one_line": "",
}

_VALID_DOC_TYPES = {
    "Complaint", "Motion", "Order", "Contract",
    "Notice", "Affidavit", "Unknown",
}


def extract_structured_fields(raw_text: str) -> dict:
    """
    Send raw_text to the LLM and parse the returned JSON into a structured
    fields dict.  Missing or invalid fields fall back to sensible defaults.
    """
    if not raw_text or not raw_text.strip():
        return dict(_DEFAULT_FIELDS)

    # Key legal fields (case number, parties, dates, doc type) almost always
    # appear in the first 1-2 pages. 4000 chars ≈ 1000 tokens — fast, cheap.
    truncated = raw_text[:4000]

    messages = [
        {"role": "system", "content": EXTRACTION_PROMPT},
        {
            "role": "user",
            "content": (
                "Extract structured fields from the following legal document text.\n\n"
                f"DOCUMENT TEXT:\n{truncated}"
            ),
        },
    ]

    try:
        response_text = chat_completion(
            messages=messages,
            response_format={"type": "json_object"},
        )
        data = json.loads(response_text)
    except json.JSONDecodeError:
        # Try to find a JSON block in the response
        try:
            start = response_text.index("{")
            end = response_text.rindex("}") + 1
            data = json.loads(response_text[start:end])
        except (ValueError, AttributeError):
            return dict(_DEFAULT_FIELDS)
    except Exception:
        return dict(_DEFAULT_FIELDS)

    # Build result with defaults for missing keys
    result = dict(_DEFAULT_FIELDS)
    result["case_number"] = data.get("case_number") or None
    doc_type = data.get("document_type", "Unknown")
    result["document_type"] = doc_type if doc_type in _VALID_DOC_TYPES else "Unknown"
    result["parties"] = _ensure_list(data.get("parties"))
    result["date_filed"] = data.get("date_filed") or None
    result["jurisdiction"] = data.get("jurisdiction") or None
    result["key_claims"] = _ensure_list(data.get("key_claims"))[:5]
    result["key_dates"] = _ensure_date_list(data.get("key_dates"))
    result["referenced_statutes"] = _ensure_list(data.get("referenced_statutes"))
    result["summary_one_line"] = str(data.get("summary_one_line") or "")

    return result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_list(value) -> list:
    if isinstance(value, list):
        return [str(v) for v in value if v]
    if isinstance(value, str) and value:
        return [value]
    return []


def _ensure_date_list(value) -> list:
    """Ensure value is a list of {label, date} dicts."""
    if not isinstance(value, list):
        return []
    result = []
    for item in value:
        if isinstance(item, dict) and "label" in item and "date" in item:
            result.append({"label": str(item["label"]), "date": str(item["date"])})
    return result
