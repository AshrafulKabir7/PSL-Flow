"""
Case Fact Summary generator.
Retrieves evidence, builds prompts, calls the LLM, maps citations.
"""

import json
from datetime import datetime

from retrieval.retriever import retrieve_for_sections
from generation.prompts import SYSTEM_PROMPT_BASE, PATTERN_INJECTION_TEMPLATE
from generation.citation_mapper import map_citations, get_grounding_report
from utils.llm_client import chat_completion


def _format_evidence_block(chunk: dict) -> str:
    """Format a single chunk as a fenced evidence block for the prompt."""
    return (
        f"[EVIDENCE: {chunk['chunk_id']}]\n"
        f"Page {chunk.get('page_number', '?')}: {chunk['text']}\n"
        "[/EVIDENCE]"
    )


def _build_evidence_section(section_name: str, chunks: list) -> str:
    if not chunks:
        return f"## {section_name.upper()} EVIDENCE\n(No evidence retrieved)\n"
    blocks = "\n\n".join(_format_evidence_block(c) for c in chunks)
    return f"## {section_name.upper()} EVIDENCE\n{blocks}\n"


def _inject_patterns(active_patterns: list) -> str:
    if not active_patterns:
        return ""
    lines = []
    for p in active_patterns:
        lines.append(
            f"- [{p.get('category', 'general')}] {p['description']}\n"
            f"  BEFORE: {p.get('example_before', 'n/a')}\n"
            f"  AFTER:  {p.get('example_after', 'n/a')}"
        )
    patterns_block = "\n".join(lines)
    return PATTERN_INJECTION_TEMPLATE.format(patterns_block=patterns_block)


def generate_draft(
    doc_id: str,
    structured_fields: dict,
    active_patterns: list,
) -> dict:
    """
    Generate a Case Fact Summary for the given document.

    Returns a dict ready to be stored in the `drafts` table:
        {
            content_markdown: str,
            citations_json: list,
            grounding_report_json: dict,
            patterns_applied_json: list[str],  # pattern IDs/descriptions
        }
    """
    # -------------------------------------------------------------------
    # 1. Retrieve evidence for each section
    # -------------------------------------------------------------------
    sections = retrieve_for_sections(doc_id)

    # Build lookup: chunk_id → chunk dict (for citation mapping)
    chunks_by_id: dict = {}
    for section_chunks in sections.values():
        for c in section_chunks:
            chunks_by_id[c["chunk_id"]] = c

    # -------------------------------------------------------------------
    # 2. Build the user message
    # -------------------------------------------------------------------
    sf = structured_fields or {}
    meta_block = (
        f"DOCUMENT METADATA:\n"
        f"- Case Number: {sf.get('case_number') or 'Unknown'}\n"
        f"- Document Type: {sf.get('document_type') or 'Unknown'}\n"
        f"- Date Filed: {sf.get('date_filed') or 'Unknown'}\n"
        f"- Jurisdiction: {sf.get('jurisdiction') or 'Unknown'}\n"
        f"- Parties: {', '.join(sf.get('parties') or []) or 'Unknown'}\n"
        f"- One-line Summary: {sf.get('summary_one_line') or ''}\n"
    )

    evidence_block = "\n".join(
        _build_evidence_section(name, chunks)
        for name, chunks in sections.items()
    )

    user_message = (
        f"{meta_block}\n\n"
        f"RETRIEVED EVIDENCE:\n{evidence_block}\n\n"
        "Using ONLY the evidence above, write the Case Fact Summary following the "
        "format in your instructions. Cite every factual claim with [chunk_id]."
    )

    # -------------------------------------------------------------------
    # 3. Build system prompt
    # -------------------------------------------------------------------
    system_prompt = SYSTEM_PROMPT_BASE + _inject_patterns(active_patterns)

    # -------------------------------------------------------------------
    # 4. Call LLM
    # -------------------------------------------------------------------
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    # Let LLM exceptions propagate — the API layer turns them into proper HTTP errors.
    # (Catching here caused the raw error to appear as draft content in the UI.)
    raw_draft = chat_completion(messages=messages)

    # -------------------------------------------------------------------
    # 5. Map citations → superscripts
    # -------------------------------------------------------------------
    try:
        content_markdown, citations = map_citations(raw_draft, chunks_by_id)
    except Exception:
        content_markdown = raw_draft
        citations = []

    # -------------------------------------------------------------------
    # 6. Grounding report
    # -------------------------------------------------------------------
    try:
        grounding_report = get_grounding_report(content_markdown, citations)
    except Exception:
        grounding_report = {
            "parties": "unsupported",
            "claims": "unsupported",
            "timeline": "unsupported",
            "relief": "unsupported",
        }

    # -------------------------------------------------------------------
    # 7. Return
    # -------------------------------------------------------------------
    patterns_applied = [p.get("description", "") for p in active_patterns]

    return {
        "content_markdown": content_markdown,
        "citations_json": citations,
        "grounding_report_json": grounding_report,
        "patterns_applied_json": patterns_applied,
    }
