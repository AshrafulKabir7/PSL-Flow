"""
Sentence-transformer embeddings + ChromaDB indexing.
"""

import json
from functools import lru_cache

import chromadb
from sentence_transformers import SentenceTransformer

from config import settings


# ---------------------------------------------------------------------------
# Singletons
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_embedding_model() -> SentenceTransformer:
    """Load and cache the sentence-transformers model."""
    return SentenceTransformer(settings.EMBEDDING_MODEL)


def get_chroma_client() -> chromadb.PersistentClient:
    """Return a persistent ChromaDB client."""
    return chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def embed_texts(texts: list) -> list:
    """Return a list of embedding vectors (as Python lists)."""
    model = _get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True)
    return [emb.tolist() for emb in embeddings]


def embed_query(query: str) -> list:
    """Embed a single query string."""
    return embed_texts([query])[0]


def index_chunks(chunks: list, doc_id: str):
    """
    Embed all chunk texts and upsert into:
      - collection  `doc_{doc_id}`  (per-document)
      - collection  `all_docs`      (global cross-document)
    """
    if not chunks:
        return

    client = get_chroma_client()

    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)
    ids = [c["chunk_id"] for c in chunks]
    metadatas = [
        {
            "doc_id":         c["doc_id"],
            "page_number":    c["page_number"],
            "char_start":     c["char_start"],
            "char_end":       c["char_end"],
            "ocr_confidence": c.get("ocr_confidence", 1.0),
        }
        for c in chunks
    ]

    # Per-document collection
    doc_collection = client.get_or_create_collection(
        name=f"doc_{doc_id}",
        metadata={"hnsw:space": "cosine"},
    )
    doc_collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )

    # Global collection
    all_collection = client.get_or_create_collection(
        name="all_docs",
        metadata={"hnsw:space": "cosine"},
    )
    all_collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )


def delete_doc_collection(doc_id: str):
    """Delete the per-document ChromaDB collection."""
    client = get_chroma_client()
    try:
        client.delete_collection(name=f"doc_{doc_id}")
    except Exception:
        pass  # collection may not exist
