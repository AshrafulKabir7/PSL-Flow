"""
Persist and de-duplicate edit patterns in SQLite.
Embeddings are used for cosine-similarity deduplication.
"""

import json
import uuid
import sqlite3
from datetime import datetime

import numpy as np

from pipeline.indexer import embed_texts
from config import settings


def _cosine_similarity(a: list, b: list) -> float:
    """Compute cosine similarity between two embedding vectors."""
    va = np.array(a, dtype=float)
    vb = np.array(b, dtype=float)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))


def save_patterns(patterns: list, db: sqlite3.Connection) -> list:
    """
    For each pattern:
      - Embed the description.
      - Compare cosine similarity against all existing active patterns.
      - If similarity > PATTERN_SIMILARITY_THRESHOLD → increment frequency.
      - Otherwise → insert as a new pattern.

    Returns a list of pattern IDs that were created or updated.
    """
    if not patterns:
        return []

    threshold = settings.PATTERN_SIMILARITY_THRESHOLD

    # Fetch existing patterns with embeddings
    existing_rows = db.execute(
        "SELECT id, description, embedding_json, frequency FROM edit_patterns WHERE active = 1"
    ).fetchall()

    existing = []
    for row in existing_rows:
        emb_json = row["embedding_json"]
        if emb_json:
            try:
                emb = json.loads(emb_json)
                existing.append({"id": row["id"], "embedding": emb, "frequency": row["frequency"]})
            except (json.JSONDecodeError, TypeError):
                pass

    # Embed new pattern descriptions
    descriptions = [p["description"] for p in patterns]
    try:
        new_embeddings = embed_texts(descriptions)
    except Exception:
        new_embeddings = [[] for _ in patterns]

    saved_ids = []
    now = datetime.utcnow().isoformat() + "Z"

    for pattern, embedding in zip(patterns, new_embeddings):
        # Check similarity against existing patterns
        matched_id = None
        best_sim = 0.0

        if embedding:
            for ex in existing:
                if ex["embedding"]:
                    sim = _cosine_similarity(embedding, ex["embedding"])
                    if sim > best_sim:
                        best_sim = sim
                        if sim >= threshold:
                            matched_id = ex["id"]

        if matched_id:
            # Increment frequency of the existing pattern
            db.execute(
                "UPDATE edit_patterns SET frequency = frequency + 1 WHERE id = ?",
                (matched_id,),
            )
            db.commit()
            saved_ids.append(matched_id)
        else:
            # Insert new pattern
            new_id = uuid.uuid4().hex[:12]
            db.execute(
                """
                INSERT INTO edit_patterns
                    (id, description, category, confidence, example_before, example_after,
                     frequency, active, embedding_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
                """,
                (
                    new_id,
                    pattern["description"],
                    pattern.get("category", "other"),
                    pattern.get("confidence", "medium"),
                    pattern.get("example_before", ""),
                    pattern.get("example_after", ""),
                    json.dumps(embedding) if embedding else None,
                    now,
                ),
            )
            db.commit()
            # Add to existing list for subsequent comparisons in this batch
            if embedding:
                existing.append({"id": new_id, "embedding": embedding, "frequency": 1})
            saved_ids.append(new_id)

    return saved_ids


def get_active_patterns(db: sqlite3.Connection) -> list:
    """
    Fetch all active patterns sorted by frequency descending.
    Returns a list of dicts.
    """
    rows = db.execute(
        """
        SELECT id, description, category, confidence, example_before, example_after,
               frequency, active, created_at
        FROM edit_patterns
        WHERE active = 1
        ORDER BY frequency DESC
        """
    ).fetchall()

    return [dict(row) for row in rows]
