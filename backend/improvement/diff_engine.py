"""
Diff computation between original AI draft and attorney-edited version.
"""

import difflib


def capture_edit(original: str, edited: str) -> dict:
    """
    Compute a unified diff between original and edited text.

    Returns:
        {
            "diff_raw": str,         # unified diff as a string
            "additions": list[str],  # added lines (without leading '+')
            "deletions": list[str],  # deleted lines (without leading '-')
            "edit_distance": int,    # len(additions) + len(deletions)
        }
    """
    original_lines = original.splitlines(keepends=True)
    edited_lines = edited.splitlines(keepends=True)

    diff_lines = list(
        difflib.unified_diff(
            original_lines,
            edited_lines,
            fromfile="original",
            tofile="edited",
            lineterm="",
        )
    )

    diff_raw = "".join(diff_lines)

    additions = []
    deletions = []

    for line in diff_lines:
        if line.startswith("+") and not line.startswith("+++"):
            additions.append(line[1:].rstrip("\n"))
        elif line.startswith("-") and not line.startswith("---"):
            deletions.append(line[1:].rstrip("\n"))

    edit_distance = len(additions) + len(deletions)

    return {
        "diff_raw": diff_raw,
        "additions": additions,
        "deletions": deletions,
        "edit_distance": edit_distance,
    }
