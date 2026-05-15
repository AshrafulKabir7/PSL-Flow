"""File handling utilities for uploads and extracted data."""

import os
import shutil
from config import settings


ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"}


def validate_extension(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


def save_upload(file_bytes: bytes, filename: str, doc_id: str) -> str:
    """
    Persist uploaded bytes to UPLOAD_DIR/<doc_id>/<filename>.
    Returns the absolute path to the saved file.
    """
    dest_dir = os.path.join(settings.UPLOAD_DIR, doc_id)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, filename)
    with open(dest_path, "wb") as f:
        f.write(file_bytes)
    return dest_path


def get_upload_path(doc_id: str, filename: str) -> str:
    return os.path.join(settings.UPLOAD_DIR, doc_id, filename)


def get_extracted_dir(doc_id: str) -> str:
    path = os.path.join(settings.EXTRACTED_DIR, doc_id)
    os.makedirs(path, exist_ok=True)
    return path


def save_raw_text(doc_id: str, text: str) -> str:
    """Write raw extracted text to EXTRACTED_DIR/<doc_id>/raw_text.txt."""
    extracted_dir = get_extracted_dir(doc_id)
    path = os.path.join(extracted_dir, "raw_text.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return path


def read_raw_text(doc_id: str) -> str:
    """Read previously saved raw text; returns empty string if not found."""
    path = os.path.join(settings.EXTRACTED_DIR, doc_id, "raw_text.txt")
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def delete_document_files(doc_id: str):
    """Remove all uploaded and extracted files for a document."""
    upload_dir = os.path.join(settings.UPLOAD_DIR, doc_id)
    extracted_dir = os.path.join(settings.EXTRACTED_DIR, doc_id)
    for d in [upload_dir, extracted_dir]:
        if os.path.exists(d):
            shutil.rmtree(d)
