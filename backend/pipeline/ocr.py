"""
Three-strategy OCR pipeline:
  1. PyMuPDF   — embedded text extraction (fast, lossless)
  2. Tesseract — rasterise pages → pytesseract (handles scanned PDFs / images)
  3. Vision    — Claude vision model via OpenRouter (fallback for low confidence)
"""

import os
import tempfile
from typing import Tuple

from config import settings
from utils.confidence import normalise_tesseract_confidence, estimate_vision_confidence
from utils.llm_client import vision_completion


# ---------------------------------------------------------------------------
# Strategy 1: PyMuPDF
# ---------------------------------------------------------------------------

def extract_with_pymupdf(filepath: str) -> Tuple[str, float, str]:
    """
    Extract embedded text from a PDF using PyMuPDF.
    Returns (text, confidence, strategy_name).
    Confidence is always 1.0 — no lossy conversion involved.
    """
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(filepath)
        pages_text = []
        for page in doc:
            pages_text.append(page.get_text())
        doc.close()

        text = "\n".join(pages_text).strip()
        return text, 1.0, "pymupdf"
    except Exception as exc:
        return "", 0.0, "pymupdf_failed"


# ---------------------------------------------------------------------------
# Strategy 2: Tesseract
# ---------------------------------------------------------------------------

def extract_with_tesseract(filepath: str) -> Tuple[str, float, str]:
    """
    Rasterise each page of a PDF (or read an image directly) and run
    pytesseract.  Returns (text, avg_confidence, "tesseract").
    """
    try:
        import pytesseract
        from PIL import Image

        suffix = filepath.lower().rsplit(".", 1)[-1]

        if suffix == "pdf":
            from pdf2image import convert_from_path
            # Explicit poppler path for Homebrew on Apple Silicon / Intel Macs
            import shutil, os
            poppler_path = (
                shutil.which("pdftoppm") and os.path.dirname(shutil.which("pdftoppm"))
                or "/opt/homebrew/bin"
            )
            images = convert_from_path(filepath, dpi=200, poppler_path=poppler_path)
        else:
            images = [Image.open(filepath)]

        all_text = []
        all_confidences = []

        for img in images:
            data = pytesseract.image_to_data(
                img, output_type=pytesseract.Output.DICT
            )
            page_text = pytesseract.image_to_string(img)
            all_text.append(page_text)
            all_confidences.extend(data.get("conf", []))

        text = "\n".join(all_text).strip()
        confidence = normalise_tesseract_confidence(all_confidences)
        return text, confidence, "tesseract"
    except Exception as exc:
        return "", 0.0, "tesseract_failed"


# ---------------------------------------------------------------------------
# Strategy 3: Vision LLM
# ---------------------------------------------------------------------------

_VISION_PROMPT = (
    "You are a legal document OCR specialist. Extract ALL text from this document "
    "exactly as it appears. Preserve paragraph structure and line breaks. "
    "If any portion is unclear or unreadable, wrap that section in [?] markers. "
    "Do not summarise — output the full verbatim text only."
)


def extract_with_vision(filepath: str) -> Tuple[str, float, str]:
    """
    Use the vision LLM to extract text from an image or PDF page.
    Returns (text, estimated_confidence, "claude_vision").
    """
    try:
        suffix = filepath.lower().rsplit(".", 1)[-1]

        # For PDFs, convert first page to image then pass to vision
        if suffix == "pdf":
            try:
                from pdf2image import convert_from_path
                import shutil as _shutil, os as _os
                _pp = (_shutil.which("pdftoppm") and _os.path.dirname(_shutil.which("pdftoppm"))) or "/opt/homebrew/bin"
                images = convert_from_path(filepath, dpi=200, first_page=1, last_page=1, poppler_path=_pp)
                if images:
                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                        tmp_path = tmp.name
                        images[0].save(tmp_path, "PNG")
                    try:
                        text = vision_completion(tmp_path, _VISION_PROMPT)
                    finally:
                        os.unlink(tmp_path)
                else:
                    text = vision_completion(filepath, _VISION_PROMPT)
            except Exception:
                text = vision_completion(filepath, _VISION_PROMPT)
        else:
            text = vision_completion(filepath, _VISION_PROMPT)

        confidence = estimate_vision_confidence(text)
        return text.strip(), confidence, "claude_vision"
    except Exception as exc:
        return "", 0.0, "vision_failed"


# ---------------------------------------------------------------------------
# Auto-routing
# ---------------------------------------------------------------------------

def auto_extract(filepath: str) -> Tuple[str, float, str]:
    """
    Routing logic:
    - PDF  → try PyMuPDF; if text >= 100 chars and confidence == 1.0, use it.
             Otherwise try Tesseract.
    - If Tesseract confidence < threshold OR file is an image → use Vision.
    Returns (raw_text, confidence, strategy_used).
    """
    suffix = filepath.lower().rsplit(".", 1)[-1]
    threshold = settings.OCR_CONFIDENCE_THRESHOLD

    if suffix == "pdf":
        text, conf, strategy = extract_with_pymupdf(filepath)
        if len(text) >= 100 and conf == 1.0:
            return text, conf, strategy

        # PyMuPDF gave too little text; fall through to Tesseract
        text, conf, strategy = extract_with_tesseract(filepath)
        if conf >= threshold:
            return text, conf, strategy

        # Tesseract confidence is low; fall back to vision
        text, conf, strategy = extract_with_vision(filepath)
        return text, conf, strategy

    else:
        # Direct image file — try Tesseract first, then Vision
        text, conf, strategy = extract_with_tesseract(filepath)
        if conf >= threshold:
            return text, conf, strategy

        text, conf, strategy = extract_with_vision(filepath)
        return text, conf, strategy
