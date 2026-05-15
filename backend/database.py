import sqlite3
import os
from config import settings


def get_connection() -> sqlite3.Connection:
    """Return a sqlite3 connection with row_factory set."""
    conn = sqlite3.connect(settings.SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create all tables if they don't exist."""
    os.makedirs(os.path.dirname(settings.SQLITE_PATH), exist_ok=True)
    conn = get_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                file_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                ocr_strategy TEXT,
                ocr_confidence REAL,
                page_count INTEGER,
                uploaded_at TEXT NOT NULL,
                structured_fields TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS drafts (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                content_markdown TEXT,
                citations_json TEXT,
                grounding_report_json TEXT,
                patterns_applied_json TEXT,
                version INTEGER DEFAULT 1,
                generated_at TEXT NOT NULL,
                saved_content TEXT,
                FOREIGN KEY (doc_id) REFERENCES documents(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS edit_records (
                id TEXT PRIMARY KEY,
                draft_id TEXT NOT NULL,
                doc_id TEXT NOT NULL,
                diff_raw TEXT,
                additions_json TEXT,
                deletions_json TEXT,
                edit_distance INTEGER DEFAULT 0,
                submitted_at TEXT NOT NULL,
                FOREIGN KEY (draft_id) REFERENCES drafts(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS edit_patterns (
                id TEXT PRIMARY KEY,
                description TEXT NOT NULL,
                category TEXT,
                confidence TEXT,
                example_before TEXT,
                example_after TEXT,
                frequency INTEGER DEFAULT 1,
                active INTEGER DEFAULT 1,
                embedding_json TEXT,
                created_at TEXT NOT NULL
            )
        """)

        conn.commit()
    finally:
        conn.close()
