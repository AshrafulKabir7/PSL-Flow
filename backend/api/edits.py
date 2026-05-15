"""
Edit capture and pattern learning endpoints:
  POST /api/drafts/{id}/edits  — submit an edited draft, extract patterns
  GET  /api/drafts/{id}/edits  — list edit records for a draft
"""

import json
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_connection
from improvement.diff_engine import capture_edit
from improvement.pattern_extractor import extract_patterns
from improvement.pattern_store import save_patterns

router = APIRouter()


class EditSubmitRequest(BaseModel):
    edited_content: str


# ---------------------------------------------------------------------------
# POST /api/drafts/{id}/edits
# ---------------------------------------------------------------------------

@router.post("/drafts/{draft_id}/edits", status_code=201)
def submit_edit(draft_id: str, body: EditSubmitRequest):
    """
    Capture an attorney edit, compute the diff, extract reusable patterns,
    and persist everything.
    """
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, doc_id, content_markdown, saved_content FROM drafts WHERE id = ?",
            (draft_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Draft not found")

        doc_id = row["doc_id"]
        # Use saved_content if available, else content_markdown as the baseline
        original_text = row["saved_content"] or row["content_markdown"] or ""
        edited_text = body.edited_content

        # Compute diff
        diff_result = capture_edit(original_text, edited_text)

        # Extract patterns from diff
        try:
            patterns = extract_patterns(
                original_text, edited_text, diff_result["diff_raw"]
            )
        except Exception:
            patterns = []

        # Save patterns (deduplicating against existing)
        try:
            pattern_ids = save_patterns(patterns, conn)
        except Exception:
            pattern_ids = []

        # Persist edit record
        edit_id = uuid.uuid4().hex[:12]
        now = datetime.utcnow().isoformat() + "Z"

        conn.execute(
            """
            INSERT INTO edit_records
                (id, draft_id, doc_id, diff_raw, additions_json, deletions_json,
                 edit_distance, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                edit_id,
                draft_id,
                doc_id,
                diff_result["diff_raw"],
                json.dumps(diff_result["additions"]),
                json.dumps(diff_result["deletions"]),
                diff_result["edit_distance"],
                now,
            ),
        )

        # Also update saved_content to the new edited version
        conn.execute(
            "UPDATE drafts SET saved_content = ? WHERE id = ?",
            (edited_text, draft_id),
        )

        conn.commit()

        return {
            "edit_id": edit_id,
            "draft_id": draft_id,
            "edit_distance": diff_result["edit_distance"],
            "patterns_extracted": len(patterns),
            "pattern_ids": pattern_ids,
            "patterns": patterns,
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/drafts/{id}/edits
# ---------------------------------------------------------------------------

@router.get("/drafts/{draft_id}/edits")
def list_edits(draft_id: str):
    """List all edit records for a given draft."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM drafts WHERE id = ?", (draft_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Draft not found")

        rows = conn.execute(
            """
            SELECT id, draft_id, doc_id, edit_distance, submitted_at
            FROM edit_records
            WHERE draft_id = ?
            ORDER BY submitted_at DESC
            """,
            (draft_id,),
        ).fetchall()

        return {
            "draft_id": draft_id,
            "edits": [dict(r) for r in rows],
        }
    finally:
        conn.close()
