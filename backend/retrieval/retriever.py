"""
Hybrid retrieval: semantic (ChromaDB / sentence-transformers) + keyword (BM25).
Final score = 0.65 * semantic_score + 0.35 * bm25_score (normalised 0-1).
"""

from pipeline.indexer import get_chroma_client, embed_query
from config import settings


def _bm25_search(query: str, chunks: list, top_k: int) -> dict:
    """
    Run BM25 over the provided chunk list.
    Returns {chunk_id: normalised_score} for the top_k results.
    """
    try:
        from rank_bm25 import BM25Okapi

        tokenised_corpus = [c["text"].lower().split() for c in chunks]
        bm25 = BM25Okapi(tokenised_corpus)
        query_tokens = query.lower().split()
        raw_scores = bm25.get_scores(query_tokens)

        max_score = max(raw_scores) if max(raw_scores) > 0 else 1.0
        normalised = [s / max_score for s in raw_scores]

        indexed = sorted(
            enumerate(normalised), key=lambda x: x[1], reverse=True
        )[:top_k]
        return {chunks[i]["chunk_id"]: score for i, score in indexed if score > 0}
    except Exception:
        return {}


def retrieve(query: str, doc_id: str, top_k: int = None) -> list:
    """
    Hybrid retrieval combining semantic search and BM25 keyword matching.

    Returns a list of chunk dicts sorted by hybrid score (descending):
        {chunk_id, doc_id, page_number, score, text, ocr_confidence}
    """
    k = top_k or settings.RETRIEVAL_TOP_K
    client = get_chroma_client()

    collection_name = f"doc_{doc_id}"
    try:
        collection = client.get_collection(collection_name)
    except Exception:
        return []

    total_chunks = collection.count()
    if total_chunks == 0:
        return []

    # -----------------------------------------------------------------------
    # 1. Semantic search — retrieve more candidates for BM25 to re-rank
    # -----------------------------------------------------------------------
    semantic_k = min(total_chunks, max(k * 3, 20))
    query_embedding = embed_query(query)

    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=semantic_k,
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        return []

    ids       = results.get("ids",       [[]])[0]
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    # Build candidate pool
    candidates = []
    for cid, text, meta, dist in zip(ids, documents, metadatas, distances):
        candidates.append(
            {
                "chunk_id":       cid,
                "doc_id":         meta.get("doc_id", doc_id),
                "page_number":    meta.get("page_number", 1),
                "ocr_confidence": meta.get("ocr_confidence"),
                "text":           text,
                "semantic_score": round(max(0.0, 1.0 - dist), 4),
            }
        )

    # -----------------------------------------------------------------------
    # 2. BM25 keyword search over the same candidate pool
    # -----------------------------------------------------------------------
    bm25_scores = _bm25_search(query, candidates, top_k=semantic_k)

    # -----------------------------------------------------------------------
    # 3. Merge: hybrid score = 0.65 semantic + 0.35 BM25
    # -----------------------------------------------------------------------
    SEMANTIC_WEIGHT = 0.65
    BM25_WEIGHT     = 0.35

    for chunk in candidates:
        bm25_score = bm25_scores.get(chunk["chunk_id"], 0.0)
        chunk["score"] = round(
            SEMANTIC_WEIGHT * chunk["semantic_score"] + BM25_WEIGHT * bm25_score, 4
        )

    candidates.sort(key=lambda x: x["score"], reverse=True)
    top = candidates[:k]

    return [
        {
            "chunk_id":       c["chunk_id"],
            "doc_id":         c["doc_id"],
            "page_number":    c["page_number"],
            "score":          c["score"],
            "text":           c["text"],
            "ocr_confidence": c["ocr_confidence"],
        }
        for c in top
    ]


def retrieve_for_sections(doc_id: str) -> dict:
    """
    Run four thematic hybrid-retrieval queries and return results keyed by section.

    Returns:
        {
            "parties":  [...chunks],
            "claims":   [...chunks],
            "timeline": [...chunks],
            "relief":   [...chunks],
        }
    """
    queries = {
        "parties":  "parties involved plaintiff defendant claimant respondent",
        "claims":   "claims allegations legal violations breach cause of action",
        "timeline": "timeline chronology events dates sequence filing",
        "relief":   "relief sought damages requested remedy injunction award",
    }

    return {
        section: retrieve(query, doc_id)
        for section, query in queries.items()
    }
