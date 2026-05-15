"""
Map inline [chunk_id] citations in a draft to numbered superscripts,
and build a structured citations list.
"""

import re
from typing import Tuple


# Superscript digit mapping
_SUPERSCRIPTS = "¹²³⁴⁵⁶⁷⁸⁹"


def _superscript(n: int) -> str:
    """Return a superscript string for integer n (1-indexed)."""
    s = str(n)
    result = ""
    for ch in s:
        idx = int(ch)
        if idx == 0:
            result += "⁰"
        else:
            result += _SUPERSCRIPTS[idx - 1]
    return result


def map_citations(
    draft_text: str, chunks_by_id: dict
) -> Tuple[str, list]:
    """
    Find all [chunk_id] patterns in draft_text.
    Replace each unique chunk_id with a numbered superscript.
    Build a citations list for the sidebar.

    Parameters
    ----------
    draft_text   : raw draft with [chunk_id] inline citations
    chunks_by_id : dict mapping chunk_id → chunk dict
                   (keys: chunk_id, page_number, text, score)

    Returns
    -------
    (updated_text, citations)
    citations : list of {
        superscript: str,
        chunk_id: str,
        page_number: int,
        excerpt: str,
        score: float | None,
    }
    """
    # Find all chunk_id references in order of first appearance
    pattern = re.compile(r"\[([a-zA-Z0-9_]+)\]")
    seen_order: list = []
    seen_set: set = set()

    for match in pattern.finditer(draft_text):
        cid = match.group(1)
        if cid not in seen_set and cid in chunks_by_id:
            seen_order.append(cid)
            seen_set.add(cid)

    # Assign superscript numbers
    superscript_map: dict = {}
    citations: list = []
    for i, cid in enumerate(seen_order, start=1):
        sup = _superscript(i)
        superscript_map[cid] = sup
        chunk = chunks_by_id[cid]
        excerpt = chunk.get("text", "")[:200].strip()
        citations.append(
            {
                "superscript": sup,
                "chunk_id": cid,
                "page_number": chunk.get("page_number", 1),
                "excerpt": excerpt,
                "score": chunk.get("score"),
            }
        )

    # Replace [chunk_id] with superscript (or remove unknown references)
    def replacer(m: re.Match) -> str:
        cid = m.group(1)
        if cid in superscript_map:
            return f"[{superscript_map[cid]}]"
        return ""  # unknown reference — remove silently

    updated_text = pattern.sub(replacer, draft_text)
    return updated_text, citations


def get_grounding_report(draft_text: str, citations: list) -> dict:
    """
    Heuristic section-level grounding check.

    Looks for citation superscripts near each major section header.
    Returns:
        {
            "parties":  "grounded" | "partially_grounded" | "unsupported",
            "claims":   ...,
            "timeline": ...,
            "relief":   ...,
        }
    """
    sections = {
        "parties": "### Parties",
        "claims": "### Claims",
        "timeline": "### Timeline",
        "relief": "### Relief",
    }

    sup_pattern = re.compile(r"\[([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\]")

    result = {}
    lines = draft_text.splitlines()

    for key, header in sections.items():
        section_text = _extract_section(lines, header)
        if not section_text:
            result[key] = "unsupported"
            continue

        sup_matches = sup_pattern.findall(section_text)
        citation_count = len(sup_matches)
        sentence_count = max(1, section_text.count("."))

        if citation_count == 0:
            result[key] = "unsupported"
        elif citation_count / sentence_count >= 0.5:
            result[key] = "grounded"
        else:
            result[key] = "partially_grounded"

    return result


def _extract_section(lines: list, header: str) -> str:
    """Extract text between a section header and the next ### header.
    Uses startswith match so '### Claims & Allegations' matches '### Claims'."""
    in_section = False
    collected = []
    header_lower = header.strip().lower()
    for line in lines:
        line_lower = line.strip().lower()
        if line_lower.startswith(header_lower):
            in_section = True
            continue
        if in_section:
            if line.startswith("###") and not line_lower.startswith(header_lower):
                break
            collected.append(line)
    return "\n".join(collected)
