"""Pydantic models for the Pattern domain."""

from typing import Optional
from pydantic import BaseModel


class PatternResponse(BaseModel):
    id: str
    description: str
    category: Optional[str] = None
    confidence: Optional[str] = None
    example_before: Optional[str] = None
    example_after: Optional[str] = None
    frequency: int = 1
    active: int = 1
    created_at: str


class PatternToggleRequest(BaseModel):
    active: bool
