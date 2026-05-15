"""Utilities for computing and normalising OCR / extraction confidence scores."""


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    """Clamp a float to [lo, hi]."""
    return max(lo, min(hi, value))


def normalise_tesseract_confidence(raw_confidences: list) -> float:
    """
    Tesseract returns per-word confidences in the range [0, 100].
    Filter out -1 sentinel values, average, and scale to [0, 1].
    """
    valid = [c for c in raw_confidences if c >= 0]
    if not valid:
        return 0.0
    avg = sum(valid) / len(valid)
    return clamp(avg / 100.0)


def estimate_vision_confidence(text: str) -> float:
    """
    Heuristic: count [?] markers left by the vision model as signals of
    uncertainty.  Each marker reduces confidence from the base of 0.90.
    """
    if not text:
        return 0.0
    markers = text.count("[?]")
    base = 0.90
    penalty = markers * 0.05
    return clamp(base - penalty)
