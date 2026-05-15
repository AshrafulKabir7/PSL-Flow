"""
Pattern management endpoints:
  GET    /api/patterns          — list all patterns
  GET    /api/patterns/stats    — edit distance trend
  PATCH  /api/patterns/{id}     — toggle active flag
  DELETE /api/patterns/{id}     — delete pattern
"""

import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_connection

router = APIRouter()


class PatternToggleRequest(BaseModel):
    active: bool


# ---------------------------------------------------------------------------
# GET /api/patterns/stats  — must be defined BEFORE /{id} routes
# ---------------------------------------------------------------------------

@router.get("/patterns/stats")
def pattern_stats():
    """
    Return edit distance trend: list of edit records with draft number,
    edit distance, doc_id, and date.
    """
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT
                er.id,
                er.draft_id,
                er.doc_id,
                er.edit_distance,
                er.submitted_at
            FROM edit_records er
            ORDER BY er.submitted_at ASC
            """
        ).fetchall()

        stats = [
            {
                "draft_number": idx + 1,
                "edit_distance": row["edit_distance"],
                "doc_id": row["doc_id"],
                "draft_id": row["draft_id"],
                "date": row["submitted_at"],
            }
            for idx, row in enumerate(rows)
        ]

        return {"trend": stats, "total_edits": len(stats)}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/patterns
# ---------------------------------------------------------------------------

@router.get("/patterns")
def list_patterns():
    """List all patterns sorted by frequency descending."""
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, description, category, confidence, example_before, example_after,
                   frequency, active, created_at
            FROM edit_patterns
            ORDER BY frequency DESC, created_at DESC
            """
        ).fetchall()
        return {"patterns": [dict(r) for r in rows]}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# PATCH /api/patterns/{id}
# ---------------------------------------------------------------------------

@router.patch("/patterns/{pattern_id}")
def toggle_pattern(pattern_id: str, body: PatternToggleRequest):
    """Toggle the active flag on a pattern."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM edit_patterns WHERE id = ?", (pattern_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pattern not found")

        active_val = 1 if body.active else 0
        conn.execute(
            "UPDATE edit_patterns SET active = ? WHERE id = ?",
            (active_val, pattern_id),
        )
        conn.commit()
        # Return full pattern so frontend cache stays consistent
        row = conn.execute(
            """
            SELECT id, description, category, confidence, example_before, example_after,
                   frequency, active, created_at
            FROM edit_patterns WHERE id = ?
            """,
            (pattern_id,),
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# DELETE /api/patterns/{id}
# ---------------------------------------------------------------------------

@router.delete("/patterns/{pattern_id}", status_code=204)
def delete_pattern(pattern_id: str):
    """Permanently delete a pattern."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM edit_patterns WHERE id = ?", (pattern_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pattern not found")

        conn.execute("DELETE FROM edit_patterns WHERE id = ?", (pattern_id,))
        conn.commit()
    finally:
        conn.close()

    return None
