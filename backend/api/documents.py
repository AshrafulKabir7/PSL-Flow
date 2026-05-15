"""
Document management endpoints:
  POST   /api/documents          — upload + start pipeline
  GET    /api/documents          — list documents
  GET    /api/documents/{id}     — get document detail
  GET    /api/documents/{id}/stream     — SSE pipeline progress
  GET    /api/documents/{id}/extraction — structured fields + raw text
  DELETE /api/documents/{id}     — delete document
"""

import asyncio
import json
import os
import uuid
from datetime import datetime
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse

from config import settings
from database import get_connection
from utils.file_handler import (
    validate_extension,
    save_upload,
    read_raw_text,
    delete_document_files,
)
from pipeline.ingestion import run_ingestion_pipeline
from pipeline.indexer import delete_doc_collection

router = APIRouter()

# Module-level dict: doc_id → asyncio.Queue for SSE streaming
pipeline_state: dict = {}


# ---------------------------------------------------------------------------
# POST /api/documents
# ---------------------------------------------------------------------------

@router.post("/documents", status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Upload a document and start the ingestion pipeline in the background."""
    # Validate file type
    if not validate_extension(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: pdf, png, jpg, jpeg, tiff",
        )

    # Validate file size
    file_bytes = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_MB} MB",
        )

    doc_id = uuid.uuid4().hex[:12]
    now = datetime.utcnow().isoformat() + "Z"
    ext = os.path.splitext(file.filename)[1].lower().lstrip(".")

    # Save the uploaded file
    try:
        filepath = save_upload(file_bytes, file.filename, doc_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {exc}")

    # Insert document record
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO documents (id, filename, file_type, status, uploaded_at)
            VALUES (?, ?, ?, 'pending', ?)
            """,
            (doc_id, file.filename, ext, now),
        )
        conn.commit()
    finally:
        conn.close()

    # Create a queue for SSE and register it
    queue: asyncio.Queue = asyncio.Queue()
    pipeline_state[doc_id] = queue

    # Start pipeline as a background task
    background_tasks.add_task(
        _run_pipeline_task, doc_id, filepath, queue
    )

    return {"id": doc_id, "status": "pending", "filename": file.filename}


async def _run_pipeline_task(doc_id: str, filepath: str, queue: asyncio.Queue):
    """Wrapper to run the ingestion pipeline as a background task."""
    try:
        await run_ingestion_pipeline(doc_id, filepath, queue)
    except Exception as exc:
        await queue.put({"event": "error", "data": {"doc_id": doc_id, "message": str(exc)}})
        await queue.put(None)
    finally:
        # Keep queue registered for a while so SSE can drain it
        pass


# ---------------------------------------------------------------------------
# GET /api/documents
# ---------------------------------------------------------------------------

@router.get("/documents")
def list_documents():
    """List all documents sorted by upload date descending."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM documents ORDER BY uploaded_at DESC"
        ).fetchall()
        docs = []
        for row in rows:
            d = dict(row)
            if d.get("structured_fields"):
                try:
                    d["structured_fields"] = json.loads(d["structured_fields"])
                except (json.JSONDecodeError, TypeError):
                    pass
            docs.append(d)
        return {"documents": docs}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/documents/{id}
# ---------------------------------------------------------------------------

@router.get("/documents/{doc_id}")
def get_document(doc_id: str):
    """Get a single document by ID."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ?", (doc_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        d = dict(row)
        if d.get("structured_fields"):
            try:
                d["structured_fields"] = json.loads(d["structured_fields"])
            except (json.JSONDecodeError, TypeError):
                pass
        return d
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/documents/{id}/stream  — SSE
# ---------------------------------------------------------------------------

@router.get("/documents/{doc_id}/stream")
async def stream_pipeline(doc_id: str):
    """
    SSE endpoint that streams pipeline progress events.
    If no pipeline queue exists for this doc, checks DB status and emits
    a synthetic ready/error event.
    """
    # Check DB first
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT status FROM documents WHERE id = ?", (doc_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        db_status = row["status"]
    finally:
        conn.close()

    queue = pipeline_state.get(doc_id)

    async def event_generator() -> AsyncGenerator[str, None]:
        if queue is None:
            # Pipeline already finished or was never tracked
            if db_status == "ready":
                yield _sse_format("ready", {"doc_id": doc_id})
            elif db_status in ("failed", "error"):
                yield _sse_format("error", {"doc_id": doc_id, "message": "Pipeline failed"})
            else:
                yield _sse_format("pipeline_step", {"step": "unknown", "status": "unknown", "message": f"Status: {db_status}"})
            return

        # Drain the queue — keepalive pings prevent proxy/browser timeouts
        # during long LLM calls (extraction, draft generation).
        _KEEPALIVE_INTERVAL = 8.0   # seconds between pings
        _HARD_TIMEOUT       = 300.0 # 5 min total pipeline budget
        elapsed = 0.0

        try:
            while elapsed < _HARD_TIMEOUT:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=_KEEPALIVE_INTERVAL)
                except asyncio.TimeoutError:
                    # No event yet — send SSE comment to keep the connection alive.
                    # Browsers ignore comment lines; proxies reset their idle timers.
                    yield ": keepalive\n\n"
                    elapsed += _KEEPALIVE_INTERVAL
                    continue

                if item is None:
                    break

                event = item.get("event", "pipeline_step")
                data  = item.get("data", {})
                yield _sse_format(event, data)
                elapsed = 0.0  # reset on real event

                if event in ("ready", "error"):
                    break
            else:
                yield _sse_format("error", {"doc_id": doc_id, "message": "Pipeline timed out after 5 minutes"})
        finally:
            pipeline_state.pop(doc_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def _sse_format(event: str, data: dict) -> str:
    """Format a single SSE message."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ---------------------------------------------------------------------------
# GET /api/documents/{id}/extraction
# ---------------------------------------------------------------------------

@router.get("/documents/{doc_id}/extraction")
def get_extraction(doc_id: str):
    """Return structured fields and raw extracted text."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT structured_fields FROM documents WHERE id = ?", (doc_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        structured_fields = {}
        if row["structured_fields"]:
            try:
                structured_fields = json.loads(row["structured_fields"])
            except (json.JSONDecodeError, TypeError):
                pass

        raw_text = read_raw_text(doc_id)

        return {
            "doc_id": doc_id,
            "structured_fields": structured_fields,
            "raw_text": raw_text,
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# DELETE /api/documents/{id}
# ---------------------------------------------------------------------------

@router.delete("/documents/{doc_id}", status_code=204)
def delete_document(doc_id: str):
    """Delete a document and all associated data."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM documents WHERE id = ?", (doc_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        # Delete ChromaDB collection
        try:
            delete_doc_collection(doc_id)
        except Exception:
            pass  # non-fatal

        # Delete files
        try:
            delete_document_files(doc_id)
        except Exception:
            pass  # non-fatal

        # Delete from DB (cascading draft/edit cleanup handled manually)
        conn.execute("DELETE FROM edit_records WHERE doc_id = ?", (doc_id,))
        conn.execute(
            "DELETE FROM edit_records WHERE draft_id IN "
            "(SELECT id FROM drafts WHERE doc_id = ?)",
            (doc_id,),
        )
        conn.execute("DELETE FROM drafts WHERE doc_id = ?", (doc_id,))
        conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        conn.commit()

    finally:
        conn.close()

    return None
