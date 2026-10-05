"""Render the code-review prompt from PR metadata and the reviewable diff.

string.Template substitutes only the named placeholders, so PR text and diff
content (which the author controls) never reach a shell or a format string.
"""
import json
import os
import pathlib
import string

env = os.environ


def read_text(path, default=""):
    try:
        return pathlib.Path(path).read_text(encoding="utf-8", errors="replace")
    except FileNotFoundError:
        return default


pr_meta = json.loads(read_text(env["PR_META_FILE"], "{}"))
excluded = [line for line in read_text(env["EXCLUDED_FILES"]).splitlines() if line.strip()]

pr_changes = (
    f"{pr_meta.get('changedFiles') or 0} files, "
    f"+{pr_meta.get('additions') or 0} / -{pr_meta.get('deletions') or 0} lines"
)
excluded_note = ""
if excluded:
    listing = "\n".join(f"- `{path}`" for path in excluded)
    pr_changes += f" (of which {len(excluded)} are excluded from this review, see below)"
    excluded_note = (
        "## Files excluded from this review\n"
        "These files changed in the PR but are absent from the diff below: translated interface "
        "dictionaries (their keys and placeholders are enforced by the type checker and "
        "`src/i18n.test.ts`) and the generated lock file. Do NOT report them as missing or unreviewed.\n\n"
        f"{listing}\n\n"
    )

trunc_note = ""
if env.get("DIFF_TRUNCATED") == "true":
    trunc_note = f"(truncated; the full diff was {env.get('DIFF_LINES', '0')} lines)"

template = string.Template(read_text(env["PROMPT_TEMPLATE"]))
rendered = template.safe_substitute(
    review_language=env.get("REVIEW_LANGUAGE") or "Ukrainian",
    pr_number=env.get("PR_NUMBER", ""),
    pr_title=pr_meta.get("title") or "",
    pr_author=(pr_meta.get("author") or {}).get("login") or "",
    pr_body=pr_meta.get("body") or "(no description)",
    head_ref=pr_meta.get("headRefName") or "",
    base_ref=pr_meta.get("baseRefName") or "",
    base_sha=pr_meta.get("baseRefOid") or "",
    head_sha=pr_meta.get("headRefOid") or "",
    pr_changes=pr_changes,
    diff_stat=read_text(env["DIFF_STAT_FILE"], "No diff stat available."),
    excluded_note=excluded_note,
    trunc_note=trunc_note,
    diff=read_text(env["DIFF_FILE"], "(no diff)"),
)
pathlib.Path(env["PROMPT_OUT"]).write_text(rendered, encoding="utf-8")
print(f"Prompt written to {env['PROMPT_OUT']} ({len(rendered)} characters)")
