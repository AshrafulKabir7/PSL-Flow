"""
Draft management endpoints:
  POST   /api/documents/{id}/draft     — generate a new draft
  GET    /api/drafts/{id}              — get draft by id
  PATCH  /api/drafts/{id}              — update saved_content
  GET    /api/drafts/{id}/evidence     — evidence chunks used
  GET    /api/drafts/{id}/grounding    — grounding report
"""

import json
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_connection
from generation.drafter import generate_draft
from improvement.pattern_store import get_active_patterns

router = APIRouter()


class DraftUpdateRequest(BaseModel):
    content: str


# ---------------------------------------------------------------------------
# POST /api/documents/{id}/draft
# ---------------------------------------------------------------------------

@router.post("/documents/{doc_id}/draft", status_code=201)
def create_draft(doc_id: str):
    """Generate a Case Fact Summary draft for the given document."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ?", (doc_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        if row["status"] != "ready":
            raise HTTPException(
                status_code=409,
                detail=f"Document is not ready yet (status: {row['status']}). Wait for processing to complete.",
            )

        # Parse structured fields
        structured_fields = {}
        if row["structured_fields"]:
            try:
                structured_fields = json.loads(row["structured_fields"])
            except (json.JSONDecodeError, TypeError):
                pass

        # Get active patterns to inject
        active_patterns = get_active_patterns(conn)

        # Generate the draft
        try:
            draft_data = generate_draft(doc_id, structured_fields, active_patterns)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Draft generation failed: {exc}")

        # Determine version number
        existing_count = conn.execute(
            "SELECT COUNT(*) as cnt FROM drafts WHERE doc_id = ?", (doc_id,)
        ).fetchone()["cnt"]
        version = existing_count + 1

        draft_id = uuid.uuid4().hex[:12]
        now = datetime.utcnow().isoformat() + "Z"

        conn.execute(
            """
            INSERT INTO drafts
                (id, doc_id, content_markdown, citations_json, grounding_report_json,
                 patterns_applied_json, version, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                draft_id,
                doc_id,
                draft_data["content_markdown"],
                json.dumps(draft_data["citations_json"]),
                json.dumps(draft_data["grounding_report_json"]),
                json.dumps(draft_data["patterns_applied_json"]),
                version,
                now,
            ),
        )
        conn.commit()

        return {
            "id": draft_id,
            "doc_id": doc_id,
            "content_markdown": draft_data["content_markdown"],
            "citations": draft_data["citations_json"],
            "grounding_report": draft_data["grounding_report_json"],
            "patterns_applied": draft_data["patterns_applied_json"],
            "version": version,
            "generated_at": now,
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/drafts/{id}
# ---------------------------------------------------------------------------

@router.get("/drafts/{draft_id}")
def get_draft(draft_id: str):
    """Get a draft by ID."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM drafts WHERE id = ?", (draft_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Draft not found")

        d = dict(row)

        citations = []
        if d.get("citations_json"):
            try:
                citations = json.loads(d["citations_json"])
            except (json.JSONDecodeError, TypeError):
                pass

        grounding_report = {}
        if d.get("grounding_report_json"):
            try:
                grounding_report = json.loads(d["grounding_report_json"])
            except (json.JSONDecodeError, TypeError):
                pass

        patterns_applied = []
        if d.get("patterns_applied_json"):
            try:
                patterns_applied = json.loads(d["patterns_applied_json"])
            except (json.JSONDecodeError, TypeError):
                pass

        return {
            "id": d["id"],
            "doc_id": d["doc_id"],
            "content_markdown": d["content_markdown"],
            "citations": citations,
            "grounding_report": grounding_report,
            "patterns_applied": patterns_applied,
            "version": d["version"],
            "generated_at": d["generated_at"],
            "saved_content": d.get("saved_content"),
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# PATCH /api/drafts/{id}
# ---------------------------------------------------------------------------

@router.patch("/drafts/{draft_id}")
def update_draft(draft_id: str, body: DraftUpdateRequest):
    """Save edited content for a draft."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM drafts WHERE id = ?", (draft_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Draft not found")

        conn.execute(
            "UPDATE drafts SET saved_content = ? WHERE id = ?",
            (body.content, draft_id),
        )
        conn.commit()
        return {"id": draft_id, "status": "saved"}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/drafts/{id}/evidence
# ---------------------------------------------------------------------------

@router.get("/drafts/{draft_id}/evidence")
def get_evidence(draft_id: str):
    """Return the evidence chunks referenced in this draft's citations."""
    from pipeline.indexer import get_chroma_client
    from config import settings

    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT doc_id, citations_json FROM drafts WHERE id = ?", (draft_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Draft not found")

        doc_id = row["doc_id"]
        citations = []
        if row["citations_json"]:
            try:
                citations = json.loads(row["citations_json"])
            except (json.JSONDecodeError, TypeError):
                citations = []

        if not citations:
            return {"draft_id": draft_id, "doc_id": doc_id, "evidence": []}

        # Get unique chunk_ids from citations
        chunk_ids = list({c["chunk_id"] for c in citations if "chunk_id" in c})

        # Try to fetch from ChromaDB
        chunks = []
        try:
            chroma_client = get_chroma_client()
            collection_name = f"doc_{doc_id}"
            collection = chroma_client.get_collection(collection_name)
            results = collection.get(ids=chunk_ids, include=["documents", "metadatas"])

            citation_score_map = {c["chunk_id"]: c.get("score", 0.0) for c in citations}

            for i, chunk_id in enumerate(results["ids"]):
                metadata = results["metadatas"][i] if results["metadatas"] else {}
                chunks.append({
                    "chunk_id": chunk_id,
                    "doc_id": doc_id,
                    "page_number": metadata.get("page_number", 1),
                    "score": citation_score_map.get(chunk_id, 0.0),
                    "text": results["documents"][i] if results["documents"] else "",
                    "ocr_confidence": metadata.get("ocr_confidence", 1.0),
                })
        except Exception:
            # Fallback: convert citations to chunk-like objects using excerpt
            for c in citations:
                chunks.append({
                    "chunk_id": c.get("chunk_id", ""),
                    "doc_id": doc_id,
                    "page_number": c.get("page_number", 1),
                    "score": c.get("score", 0.0),
                    "text": c.get("excerpt", ""),
                    "ocr_confidence": 1.0,
                })

        return {"draft_id": draft_id, "doc_id": doc_id, "evidence": chunks}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/drafts/{id}/grounding
# ---------------------------------------------------------------------------

@router.get("/drafts/{draft_id}/grounding")
def get_grounding(draft_id: str):
    """Return the grounding report for a draft."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT grounding_report_json FROM drafts WHERE id = ?", (draft_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Draft not found")

        report = {}
        if row["grounding_report_json"]:
            try:
                report = json.loads(row["grounding_report_json"])
            except (json.JSONDecodeError, TypeError):
                pass

        return {"draft_id": draft_id, "grounding_report": report}
    finally:
        conn.close()
