"""Pydantic models for the Document domain."""

from typing import Optional, Any
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    status: str
    ocr_strategy: Optional[str] = None
    ocr_confidence: Optional[float] = None
    page_count: Optional[int] = None
    uploaded_at: str
    structured_fields: Optional[Any] = None


class DocumentCreateResponse(BaseModel):
    id: str
    status: str
    filename: str
