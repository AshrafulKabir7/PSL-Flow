# Backend Requirements — Pearson Specter Litt Legal AI

## Overview

Python/FastAPI backend implementing a 5-stage pipeline: document ingestion → OCR/extraction → semantic retrieval → grounded draft generation → operator edit learning loop.

**Core principle:** Every generated token must be traceable to a source passage. No hallucination, no unsupported text.

---

## Tech Stack

| Component | Choice | Reason |
|---|---|---|
| Framework | FastAPI | Async, OpenAPI docs auto-generated, SSE support |
| OCR (clean PDFs) | PyMuPDF (fitz) | Fast, no external service needed |
| OCR (scanned/images) | Tesseract + pdf2image | Battle-tested open source OCR |
| OCR (messy/handwritten) | Claude Vision API (`claude-sonnet-4-6`) | Handles degraded scans, handwriting |
| Structured Extraction | Claude API (tool use / structured output) | Reliable field extraction via JSON schema |
| Text Chunking | LangChain `RecursiveCharacterTextSplitter` | Semantic overlap, configurable chunk size |
| Embeddings | `text-embedding-3-small` (OpenAI) | Cost-effective, strong semantic quality |
| Vector Store | ChromaDB (local persistent) | No external service, easy Docker volume |
| LLM — Drafting | Claude claude-sonnet-4-6 | Best grounding quality, long context |
| LLM — Pattern Extraction | Claude Haiku 4.5 | Fast + cheap for diff analysis |
| Database | SQLite via SQLModel | Simple, file-based, no setup needed |
| Task Queue | None (sync pipeline, SSE for streaming) | Keep scope practical |
| Diff Engine | `difflib` (stdlib) | No extra dependency for edit diffing |
| Server | Uvicorn | Standard ASGI server |

---

## Project Structure

```
backend/
├── main.py                        # FastAPI app, router registration
├── requirements.txt
├── .env.example
├── data/
│   ├── uploads/                   # Raw uploaded files
│   ├── extracted/                 # OCR output text files
│   ├── chroma/                    # ChromaDB persistent storage
│   └── patterns.db                # SQLite database
├── api/
│   ├── documents.py               # Upload, stream, extraction endpoints
│   ├── drafts.py                  # Generate, save, retrieve draft endpoints
│   ├── edits.py                   # Submit edits, capture, extract patterns
│   └── patterns.py                # List patterns, toggle active/disabled
├── pipeline/
│   ├── ingestion.py               # File validation, routing to correct OCR
│   ├── ocr.py                     # OCR strategies: pymupdf / tesseract / claude-vision
│   ├── extraction.py              # Structured field extraction via Claude tool use
│   ├── chunker.py                 # Text chunking + metadata tagging
│   └── indexer.py                 # Embed chunks + upsert to ChromaDB
├── retrieval/
│   ├── retriever.py               # Hybrid retrieval: semantic + keyword
│   └── reranker.py                # Cross-encoder rerank (optional)
├── generation/
│   ├── drafter.py                 # Grounded draft generation
│   ├── prompts.py                 # All system/user prompts (versioned)
│   └── citation_mapper.py         # Map draft output → source chunk IDs
├── improvement/
│   ├── diff_engine.py             # Capture operator edits as structured diff
│   ├── pattern_extractor.py       # Claude Haiku: extract reusable patterns from diff
│   └── pattern_store.py           # CRUD for patterns in SQLite
├── models/
│   ├── document.py                # SQLModel: Document, Chunk
│   ├── draft.py                   # SQLModel: Draft, DraftVersion
│   └── pattern.py                 # SQLModel: EditPattern
└── utils/
    ├── confidence.py              # OCR confidence scoring
    └── file_handler.py            # File type detection, validation
```

---

## Pipeline — Stage by Stage

### Stage 1: Document Ingestion & OCR

**File:** `pipeline/ingestion.py`, `pipeline/ocr.py`

Three-strategy OCR with automatic routing:

```
Uploaded file
     │
     ├── Is PDF with embedded text?
     │        └─ YES → PyMuPDF extraction (fast, lossless)
     │
     ├── Is PDF but scanned / image-based?
     │        └─ YES → pdf2image → Tesseract OCR per page
     │
     └── Is image / poor quality / handwritten?
              └─ YES → Claude Vision API (claude-sonnet-4-6)
                       with prompt: "Extract all text from this
                       legal document image. Preserve structure.
                       Flag any text you are uncertain about with [?]."
```

**OCR Confidence Scoring:**
- PyMuPDF: always 100% (native text)
- Tesseract: per-word confidence from `--psm 6` output, aggregated per page
- Claude Vision: no native score → parse `[?]` flags as low-confidence markers

**Structured Field Extraction:**
After raw text, Claude API with tool use extracts:
```json
{
  "case_number": "string | null",
  "document_type": "Complaint | Motion | Order | Contract | Notice | Unknown",
  "parties": ["string"],
  "date_filed": "ISO date | null",
  "jurisdiction": "string | null",
  "key_claims": ["string"],
  "key_dates": [{"label": "string", "date": "string"}],
  "referenced_statutes": ["string"],
  "summary_one_line": "string"
}
```

Null fields are explicit — not assumed. Missing data stays null.

**Output of Stage 1:**
```
data/extracted/{doc_id}/
├── raw_text.txt           # Full OCR output
├── structured.json        # Extracted fields
├── confidence.json        # Page-level OCR confidence scores
└── metadata.json          # Filename, upload time, file type, page count
```

---

### Stage 2: Chunking & Indexing

**File:** `pipeline/chunker.py`, `pipeline/indexer.py`

**Chunking Strategy:**
```python
chunk_size = 512        # tokens
chunk_overlap = 64      # tokens, preserves cross-boundary context
```

Each chunk carries metadata:
```json
{
  "chunk_id": "doc123_chunk_007",
  "doc_id": "doc123",
  "page_number": 2,
  "char_start": 1840,
  "char_end": 2352,
  "ocr_confidence": 0.87,
  "text": "..."
}
```

**Embedding + Storage:**
- Embed via `text-embedding-3-small`
- Upsert to ChromaDB collection named `doc_{doc_id}`
- Also upsert to global collection `all_documents` for cross-doc retrieval (future use)

**SSE Events emitted during Stage 1 + 2:**
```
event: pipeline_step
data: {"step": "ocr", "status": "running", "progress": 0.4, "page": 2}

event: pipeline_step
data: {"step": "ocr", "status": "complete", "confidence": 0.88}

event: pipeline_step
data: {"step": "chunking", "status": "complete", "chunk_count": 34}

event: pipeline_step
data: {"step": "indexing", "status": "complete"}

event: ready
data: {"doc_id": "doc123", "redirect": "/documents/doc123/draft"}
```

---

### Stage 3: Grounded Retrieval

**File:** `retrieval/retriever.py`

Hybrid retrieval — semantic + keyword:

```python
def retrieve(query: str, doc_id: str, top_k: int = 8) -> list[Chunk]:
    # Semantic search via ChromaDB
    semantic_results = chroma.query(
        query_embeddings=[embed(query)],
        n_results=top_k,
        where={"doc_id": doc_id}
    )
    
    # BM25 keyword search over extracted raw text
    keyword_results = bm25_index.get_top_n(query.split(), all_chunks, n=top_k)
    
    # Merge + deduplicate by chunk_id
    # Score = 0.7 * semantic_score + 0.3 * keyword_score
    merged = merge_and_score(semantic_results, keyword_results)
    
    return sorted(merged, key=lambda x: x.score, reverse=True)[:top_k]
```

**Evidence Surfacing:**
For draft generation, the system retrieves top-8 chunks per major section:
- Parties & Background
- Claims & Allegations  
- Timeline of Events
- Relief Sought

Each chunk returned includes its `chunk_id`, `page_number`, `score`, and `text`. These become the citations in the draft.

---

### Stage 4: Grounded Draft Generation

**File:** `generation/drafter.py`, `generation/prompts.py`

**System Prompt (base):**
```
You are a legal document analyst generating a Case Fact Summary 
for internal use at Pearson Specter Litt.

Rules:
- Only use information present in the EVIDENCE blocks provided.
- Every factual claim must be followed by a citation: [chunk_id].
- If information is missing or unclear, say "Not specified in source documents."
- Do NOT infer, speculate, or fill gaps with assumptions.
- Structure: Parties → Document Type → Key Claims → Timeline → Relief Sought.
```

**Pattern Injection (after operator edits accumulate):**
```
LEARNED PREFERENCES (from operator edits):
1. Always open with case number and filing date in bold.
2. Use passive voice in the Claims section.
3. Include jurisdiction immediately after party names.
[...additional active patterns...]
```

**Draft Request:**
```python
messages = [
    {"role": "user", "content": f"""
    DOCUMENT METADATA:
    {json.dumps(structured_fields)}
    
    EVIDENCE:
    {format_evidence_blocks(retrieved_chunks)}
    
    Generate a Case Fact Summary following the system instructions.
    """}
]
```

**Citation Mapping:**
After generation, `citation_mapper.py` parses `[chunk_id]` markers and:
- Replaces with numbered superscripts `[¹]`, `[²]`, etc.
- Returns a `citations` array: `[{superscript: 1, chunk_id: "...", page: 2, text: "..."}]`
- Any section with no citations gets `grounding: "unsupported"` tag

**Draft Output Schema:**
```json
{
  "draft_id": "draft_abc123",
  "doc_id": "doc123",
  "content_markdown": "# Case Fact Summary\n\n**Case No.:** 2024-CV-00142 [¹]...",
  "citations": [
    {
      "superscript": 1,
      "chunk_id": "doc123_chunk_003",
      "page_number": 1,
      "excerpt": "Case No. 2024-CV-00142, filed March 15, 2024",
      "score": 0.94
    }
  ],
  "grounding_report": {
    "parties": "grounded",
    "claims": "grounded",
    "timeline": "partially_grounded",
    "relief": "unsupported"
  },
  "patterns_applied": ["pattern_001", "pattern_003"],
  "generated_at": "2026-05-15T10:30:00Z"
}
```

---

### Stage 5: Improvement from Operator Edits

**File:** `improvement/diff_engine.py`, `improvement/pattern_extractor.py`, `improvement/pattern_store.py`

**Edit Capture:**
When operator submits final draft from the editor:
```python
def capture_edit(original: str, edited: str, doc_id: str) -> EditRecord:
    diff = list(difflib.unified_diff(
        original.splitlines(),
        edited.splitlines(),
        lineterm=""
    ))
    
    additions = [l[1:] for l in diff if l.startswith('+') and not l.startswith('+++')]
    deletions = [l[1:] for l in diff if l.startswith('-') and not l.startswith('---')]
    
    return EditRecord(
        doc_id=doc_id,
        diff_raw="\n".join(diff),
        additions=additions,
        deletions=deletions,
        edit_distance=len(additions) + len(deletions),
        submitted_at=datetime.utcnow()
    )
```

**Pattern Extraction (Claude Haiku):**
```
You are analyzing the difference between an AI-generated legal draft 
and a human operator's edited version.

ORIGINAL:
{original_draft}

EDITED VERSION:
{edited_draft}

DIFF:
{unified_diff}

Extract 1–5 reusable writing patterns from these edits. 
For each pattern:
- Describe it as a general rule (not specific to this document)
- Assign a category: Tone | Structure | Content | Citation
- Rate confidence: low | medium | high

Output JSON array only.
```

**Extracted Pattern Schema:**
```json
[
  {
    "description": "Always open with case number and filing date in bold on line 1",
    "category": "Structure",
    "confidence": "high",
    "example_before": "Case Fact Summary\n\nParties:",
    "example_after": "**Case No. 2024-CV-00142 | Filed: 2024-03-15**\n\nParties:"
  }
]
```

**Pattern Deduplication:**
Before storing, embed new pattern description and compare cosine similarity against existing patterns. If similarity > 0.85, merge (increment frequency count) rather than store duplicate.

**Pattern Activation:**
- All extracted patterns default to `active = true`
- Operator can disable via `/patterns` UI
- Only active patterns inject into future drafts
- Patterns gain `frequency` count each time they match a new diff

**Improvement Measurement:**
Track `edit_distance` per draft. Plot over time. Decreasing edit distance = patterns working.

---

## API Endpoints

### Documents

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/documents` | Upload document, start pipeline |
| `GET` | `/api/documents` | List all documents |
| `GET` | `/api/documents/{id}` | Get document metadata + status |
| `GET` | `/api/documents/{id}/stream` | SSE: pipeline progress events |
| `GET` | `/api/documents/{id}/extraction` | Get structured fields + raw text |
| `DELETE` | `/api/documents/{id}` | Delete document + all associated data |

### Drafts

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/documents/{id}/draft` | Generate new draft (uses patterns) |
| `GET` | `/api/drafts/{id}` | Get draft content + citations |
| `PATCH` | `/api/drafts/{id}` | Auto-save partial edit |
| `GET` | `/api/drafts/{id}/evidence` | Get evidence chunks for draft |
| `GET` | `/api/drafts/{id}/grounding` | Get grounding report per section |

### Edits

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/drafts/{id}/edits` | Submit final operator edit |
| `GET` | `/api/drafts/{id}/edits` | Get edit history for draft |
| `GET` | `/api/drafts/{id}/edits/diff` | Get structured diff |

### Patterns

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/patterns` | List all extracted patterns |
| `PATCH` | `/api/patterns/{id}` | Toggle active/disabled |
| `DELETE` | `/api/patterns/{id}` | Delete pattern |
| `GET` | `/api/patterns/stats` | Edit distance trend data |

---

## Database Schema (SQLModel / SQLite)

```python
class Document(SQLModel, table=True):
    id: str                    # UUID
    filename: str
    file_type: str             # pdf | image
    status: str                # uploading | ocr | extracting | indexing | ready
    ocr_strategy: str          # pymupdf | tesseract | claude_vision
    ocr_confidence: float | None
    page_count: int | None
    uploaded_at: datetime
    structured_fields: str     # JSON blob

class Draft(SQLModel, table=True):
    id: str
    doc_id: str
    content_markdown: str
    citations_json: str        # JSON blob
    grounding_report_json: str # JSON blob
    patterns_applied_json: str # JSON array of pattern IDs
    version: int               # increments on each new generation
    generated_at: datetime
    saved_content: str | None  # auto-save content

class EditRecord(SQLModel, table=True):
    id: str
    draft_id: str
    doc_id: str
    diff_raw: str
    additions_json: str
    deletions_json: str
    edit_distance: int
    submitted_at: datetime

class EditPattern(SQLModel, table=True):
    id: str
    description: str
    category: str              # Tone | Structure | Content | Citation
    confidence: str            # low | medium | high
    example_before: str
    example_after: str
    frequency: int             # times this pattern matched a diff
    active: bool               # operator can disable
    embedding: str             # JSON array, for dedup
    created_at: datetime
```

---

## Setup & Run

```bash
# 1. Clone and create virtualenv
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Install Tesseract (macOS)
brew install tesseract
brew install poppler  # for pdf2image

# 4. Configure environment
cp .env.example .env
# Fill in:
#   ANTHROPIC_API_KEY=sk-ant-...
#   OPENAI_API_KEY=sk-...       (for embeddings)
#   CHROMA_PERSIST_DIR=./data/chroma
#   SQLITE_URL=sqlite:///./data/patterns.db

# 5. Run
uvicorn main:app --reload --port 8000
# → http://localhost:8000
# → http://localhost:8000/docs  (auto-generated API docs)
```

**requirements.txt (key packages):**
```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
python-multipart>=0.0.9       # file upload
anthropic>=0.28.0
openai>=1.30.0
chromadb>=0.5.0
langchain-text-splitters>=0.2.0
pymupdf>=1.24.0
pytesseract>=0.3.10
pdf2image>=1.17.0
Pillow>=10.3.0
sqlmodel>=0.0.19
rank-bm25>=0.2.2              # keyword retrieval
python-dotenv>=1.0.1
difflib                        # stdlib, no install needed
```

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=          # Claude API — OCR vision + drafting + pattern extraction
OPENAI_API_KEY=             # Embeddings (text-embedding-3-small)
CHROMA_PERSIST_DIR=./data/chroma
SQLITE_URL=sqlite:///./data/patterns.db
UPLOAD_DIR=./data/uploads
EXTRACTED_DIR=./data/extracted
MAX_UPLOAD_MB=50
OCR_CONFIDENCE_THRESHOLD=0.7    # Below this → escalate to Claude Vision
CHUNK_SIZE=512
CHUNK_OVERLAP=64
RETRIEVAL_TOP_K=8
PATTERN_SIMILARITY_THRESHOLD=0.85  # Dedup threshold
```

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │              FastAPI App                │
                    └──────────────┬──────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
   ┌──────▼──────┐        ┌────────▼───────┐       ┌───────▼──────┐
   │  PIPELINE   │        │   RETRIEVAL    │       │  IMPROVEMENT │
   │             │        │               │       │              │
   │ ingestion   │        │ hybrid search  │       │ diff_engine  │
   │ ocr         │───────▶│ (chroma+bm25)  │──────▶│ pattern_ext  │
   │ extraction  │        │ reranker       │       │ pattern_store│
   │ chunker     │        └───────┬────────┘       └───────┬──────┘
   │ indexer     │                │                        │
   └──────┬──────┘         ┌──────▼──────┐                │
          │                │  GENERATION  │◀───────────────┘
          │                │             │  (inject patterns)
          ▼                │ drafter     │
   ┌─────────────┐         │ prompts     │
   │  ChromaDB   │         │ citation    │
   │  (vectors)  │         │   mapper   │
   └─────────────┘         └──────┬──────┘
                                   │
                            ┌──────▼──────┐
                            │   SQLite    │
                            │  (docs,     │
                            │  drafts,    │
                            │  edits,     │
                            │  patterns)  │
                            └─────────────┘
```

---

## Assumptions & Tradeoffs

| Decision | Tradeoff |
|---|---|
| ChromaDB over Pinecone/Weaviate | No external service, simpler setup, scales to thousands of docs |
| SQLite over PostgreSQL | Zero setup, portable, sufficient for single-server deployment |
| Claude Vision for bad OCR | Costs per page vs Tesseract free — justified by quality on degraded inputs |
| Haiku for pattern extraction | Cheaper/faster for diff analysis, quality sufficient |
| Hybrid retrieval (semantic + BM25) | Slightly more complex but catches exact legal terms BM25 handles better |
| No task queue (Celery/Redis) | SSE streams sync pipeline — keeps scope practical, fine for single concurrent user |
| Chunk size 512 tokens | Balances context richness vs retrieval precision for legal text |
| Unified diff for edit capture | Captures structural changes; misses semantic rewrites — Claude Haiku compensates |

---

## Evaluation Approach

**Retrieval Quality:**
- Manual inspection: do top-3 chunks contain the answer for 10 test queries?
- Target: >80% hit rate

**Grounding Quality:**
- Count citation coverage: what % of draft sentences have a citation?
- Target: >90% of factual sentences cited

**Edit Loop Effectiveness:**
- Track `edit_distance` (lines changed) across 5+ document runs
- Expect downward trend after 3+ edits
- Plot in `/patterns/stats` endpoint

**Sample Inputs:**
- `samples/complaint_clean.pdf` — clean PDF complaint
- `samples/contract_scanned.jpg` — scanned contract image
- `samples/notice_degraded.pdf` — low-res scanned notice
- `samples/memo_handwritten.png` — partially handwritten notes

---

## Docker (Optional)

```dockerfile
# Dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y tesseract-ocr poppler-utils
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes:
      - ./backend/data:/app/data
    env_file: ./backend/.env
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on: [backend]
```
