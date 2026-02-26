# Documentation Update - apply_patch for Workflow Editing

Adds a workflow authoring rule to reduce text corruption in `.clinerules` workflow files when they contain special symbols.

---

## Summary

- Updated `.clinerules/workflow-rules.md` under **Tool usage conventions**.
- Updated `CLAUDE.md` under **Explicitly Forbidden Actions**.
- Updated all code-review workflows in `.clinerules/workflows/` to include an explicit encoding-safe editing policy.
- Added guidance to prefer `apply_patch` for targeted edits to existing files.
- Added a plain-language reason: direct file edits are safer for symbols than shell text output on Windows.

---

## Why This Change Was Needed

Workflow files currently use symbols such as arrows and emoji. In some Windows shell paths, text output can use a different character encoding and corrupt those symbols. The new rule reduces that risk by steering edits to `apply_patch`.

---

## Files Changed

- `.clinerules/workflow-rules.md` - added encoding-safe editing guidance in tool usage conventions.
- `CLAUDE.md` - added a matching rule to prefer `apply_patch` for symbol-safe text edits.
- `.clinerules/workflows/code-review-step-1-first-review.md` - added encoding-safe editing policy section.
- `.clinerules/workflows/code-review-step-2-meta-review.md` - added encoding-safe editing policy section.
- `.clinerules/workflows/code-review-step-3-implementation.md` - added encoding-safe editing policy section.
- `.clinerules/workflows/post-implementation-review.md` - added encoding-safe editing policy section.

---

## Status

- [x] Rule added to workflow documentation
- [x] Task documentation created
