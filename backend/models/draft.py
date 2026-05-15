"""Pydantic models for the Draft domain."""

from typing import Optional, Any, List
from pydantic import BaseModel


class DraftResponse(BaseModel):
    id: str
    doc_id: str
    content_markdown: Optional[str] = None
    citations_json: Optional[Any] = None
    grounding_report_json: Optional[Any] = None
    patterns_applied_json: Optional[Any] = None
    version: int = 1
    generated_at: str
    saved_content: Optional[str] = None


class DraftUpdateRequest(BaseModel):
    content: str


class EditSubmitRequest(BaseModel):
    edited_content: str
