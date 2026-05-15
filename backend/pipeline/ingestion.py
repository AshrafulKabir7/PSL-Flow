"""
Full document ingestion pipeline.
Runs OCR → structured extraction → chunking → indexing.
Emits progress events into an asyncio.Queue for SSE streaming.
"""

import asyncio
import json
import os

from config import settings
from database import get_connection
from pipeline.ocr import auto_extract
from pipeline.extraction import extract_structured_fields
from pipeline.chunker import chunk_text
from pipeline.indexer import index_chunks
from utils.file_handler import save_raw_text


def _update_doc_status(conn, doc_id: str, status: str, **kwargs):
    """Update document fields in the DB."""
    set_clauses = ["status = ?"]
    params = [status]
    for key, value in kwargs.items():
        set_clauses.append(f"{key} = ?")
        params.append(value)
    params.append(doc_id)
    conn.execute(
        f"UPDATE documents SET {', '.join(set_clauses)} WHERE id = ?",
        params,
    )
    conn.commit()


async def run_ingestion_pipeline(
    doc_id: str,
    filepath: str,
    queue: asyncio.Queue,
):
    """
    Execute the full pipeline and push SSE-compatible event dicts into `queue`.
    Call this from a background asyncio task.
    """

    async def emit(event: str, data: dict):
        await queue.put({"event": event, "data": data})

    conn = get_connection()
    try:
        # ----------------------------------------------------------------
        # Step 1: OCR
        # ----------------------------------------------------------------
        await emit("pipeline_step", {"step": "ocr", "status": "running", "message": "Extracting text from document..."})

        try:
            raw_text, confidence, strategy = await asyncio.get_event_loop().run_in_executor(
                None, auto_extract, filepath
            )
        except Exception as exc:
            await emit("pipeline_step", {"step": "ocr", "status": "error", "message": str(exc)})
            _update_doc_status(conn, doc_id, "error")
            await emit("error", {"doc_id": doc_id, "message": str(exc)})
            return

        # Persist raw text
        save_raw_text(doc_id, raw_text)

        # Estimate page count
        page_count = max(1, len(raw_text) // 2000) if raw_text else 1

        _update_doc_status(
            conn, doc_id, "extracting",
            ocr_strategy=strategy,
            ocr_confidence=confidence,
            page_count=page_count,
        )

        await emit(
            "pipeline_step",
            {
                "step": "ocr",
                "status": "complete",
                "confidence": round(confidence, 4),
                "strategy": strategy,
                "chars": len(raw_text),
            },
        )

        # ----------------------------------------------------------------
        # Step 2: Structured extraction
        # ----------------------------------------------------------------
        await emit("pipeline_step", {"step": "extracting", "status": "running", "message": "Extracting structured fields..."})

        try:
            structured_fields = await asyncio.get_event_loop().run_in_executor(
                None, extract_structured_fields, raw_text
            )
        except Exception as exc:
            structured_fields = {}
            await emit("pipeline_step", {"step": "extracting", "status": "warning", "message": f"Field extraction partial: {exc}"})

        _update_doc_status(
            conn, doc_id, "chunking",
            structured_fields=json.dumps(structured_fields),
        )

        await emit("pipeline_step", {"step": "extracting", "status": "complete", "fields_found": list(structured_fields.keys())})

        # ----------------------------------------------------------------
        # Step 3: Chunking
        # ----------------------------------------------------------------
        await emit("pipeline_step", {"step": "chunking", "status": "running", "message": "Splitting document into chunks..."})

        chunks = chunk_text(raw_text, doc_id, ocr_confidence=confidence)

        await emit("pipeline_step", {"step": "chunking", "status": "complete", "chunk_count": len(chunks)})

        # ----------------------------------------------------------------
        # Step 4: Indexing
        # ----------------------------------------------------------------
        await emit("pipeline_step", {"step": "indexing", "status": "running", "message": "Building vector index..."})

        try:
            await asyncio.get_event_loop().run_in_executor(
                None, index_chunks, chunks, doc_id
            )
        except Exception as exc:
            await emit("pipeline_step", {"step": "indexing", "status": "error", "message": str(exc)})
            _update_doc_status(conn, doc_id, "error")
            await emit("error", {"doc_id": doc_id, "message": str(exc)})
            return

        await emit("pipeline_step", {"step": "indexing", "status": "complete", "vectors_stored": len(chunks)})

        # ----------------------------------------------------------------
        # Done
        # ----------------------------------------------------------------
        _update_doc_status(conn, doc_id, "ready")
        await emit("ready", {"doc_id": doc_id})

    finally:
        conn.close()
        # Signal that the queue is done
        await queue.put(None)
