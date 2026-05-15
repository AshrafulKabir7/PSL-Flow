"""
Simple character-based text chunker — no external dependencies.
"""

from config import settings


def chunk_text(raw_text: str, doc_id: str, ocr_confidence: float = 1.0) -> list:
    """
    Split raw_text into overlapping chunks.

    Each returned dict:
        {
            "chunk_id": str,
            "doc_id": str,
            "page_number": int,   # estimated from character position
            "char_start": int,
            "char_end": int,
            "text": str,
        }
    """
    chunk_size = settings.CHUNK_SIZE
    overlap = settings.CHUNK_OVERLAP
    text_len = len(raw_text)

    if text_len == 0:
        return []

    # Estimate chars-per-page assuming ~2000 chars per page
    chars_per_page = 2000

    chunks = []
    start = 0
    index = 0

    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk_text_slice = raw_text[start:end]

        # Estimate page number from midpoint character position
        midpoint = (start + end) // 2
        page_number = max(1, (midpoint // chars_per_page) + 1)

        chunk_id = f"{doc_id}_c{index:04d}"

        chunks.append(
            {
                "chunk_id":       chunk_id,
                "doc_id":         doc_id,
                "page_number":    page_number,
                "char_start":     start,
                "char_end":       end,
                "text":           chunk_text_slice,
                "ocr_confidence": round(ocr_confidence, 4),
            }
        )

        # Advance by chunk_size - overlap (never go backwards)
        advance = max(1, chunk_size - overlap)
        start += advance
        index += 1

    return chunks
