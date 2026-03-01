# NEW FEATURE: implement-bulk-batch.ps1
*Created: March 1, 2026*

**Type:** NEW FEATURE
**Status:** IMPLEMENTED

---

## Summary

Create `scripts/codex/implement-bulk-batch.ps1` — a batch automation script
that runs the `/code-review-implement` skill on every file in the
`tasks/code-reviews/ready-for-implementation/bulk/` folder, one at a time,
then commits all changes.

The bulk folder contains review files that have only green (safe) findings,
making them safe to process automatically without human review between runs.
The skill handles moving each file to `pending-changelog/` as part of its
own processing.

## Requirements gathered via interview

| Area | Decision |
| --- | --- |
| Script path | `scripts/codex/implement-bulk-batch.ps1` |
| Source folder | `tasks/code-reviews/ready-for-implementation/bulk/` |
| Codex flags | `--yolo` |
| Visual style | Same as `triage-batch.ps1` (banners, per-file timing, footer) |
| Per-file timestamps | Yes — Started / Completed / Elapsed |
| Total elapsed | Yes — in closing footer |
| Error handling | `throw` on codex failure, git add failure, git commit failure |
| Git staging | `git add -A` (captures source file edits + moved review files) |
| Commit message | `code-review(bulk-implement): implement bulk review findings from codex batch run` |

## Implementation notes

- The script does NOT manually move files — the skill does that itself.
- The loop exits when the bulk folder is empty (same pattern as triage-batch).
- Codex is called in "direct mode" by providing the target file path in the
  instruction, preventing the skill from auto-selecting a different file.
- ASCII-only restriction is NOT applied — the review files already contain
  emoji severity markers (🟢, 🟡) that the STEP 3 output references.
