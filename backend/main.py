import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import documents, drafts, edits, patterns
from database import init_db

app = FastAPI(
    title="Legal AI Assistant — Pearson Specter Litt",
    version="1.0.0",
    description="Internal legal document AI assistant: OCR, RAG, Case Fact Summary generation, and continuous learning from attorney edits.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Create required directories and initialise the database."""
    for d in ["data/uploads", "data/extracted", "data/chroma"]:
        os.makedirs(d, exist_ok=True)
    init_db()


# Include routers
app.include_router(documents.router, prefix="/api")
app.include_router(drafts.router, prefix="/api")
app.include_router(edits.router, prefix="/api")
app.include_router(patterns.router, prefix="/api")


@app.get("/health", tags=["Health"])
def health():
    """Simple liveness check."""
    return {"status": "ok", "service": "Legal AI Assistant"}


@app.get("/", tags=["Root"])
def root():
    return {
        "service": "Pearson Specter Litt — Legal AI Assistant",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
