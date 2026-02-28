# REWORK: execute-fix-plan pending-fix folder mode
*Created: February 28, 2026*

**Type:** REWORK
**Status:** FINISHED

---

## Summary

Change the `execute-fix-plan` skill so default mode no longer reads
`tasks/main-tasks-queue.md`.
Default mode now scans `tasks/main-tasks/pending-fix`.

## What changed

- Updated `skills/execute-fix-plan/SKILL.md` description to remove queue wording.
- Replaced `Queue mode` with `Pending-fix folder mode`.
- Updated target selection to scan `tasks/main-tasks/pending-fix`, gather `*.md`,
  sort alphabetically, and pick the first file.
- Removed fix plan review and rewrite stage.
- Updated implementation flow to skip directly to applying fixable PIR items.
- Kept PIR classification rules:
  - Fixable: Low/Medium risk, no human judgment, fix plan present.
  - Skippable: High risk, human judgment required, fix plan missing, or fix plan N/A.
- Kept required append step for `## Post-Implementation Fixes`.
- Updated skipped-status outcome from `PENDING_FIX` to `PENDING_HUMAN_REVIEW`.
- Added move rules:
  - All PIRs fixed -> move task to `tasks/main-tasks/finished-tasks`.
  - Any skipped PIR -> move task to `tasks/main-tasks/pending-human-review`.
  - If destination folder is missing, create it first.

## Why this change

- Removes queue-file dependency from fix execution.
- Makes the workflow start directly from `pending-fix` tasks.
- Aligns task routing with requested human-review handling when any item is skipped.

## Manual check

- Open `skills/execute-fix-plan/SKILL.md`.
- Confirm there are no references to `Queue mode` or `tasks/main-tasks-queue.md`.
- Confirm default mode is `Pending-fix folder mode` and uses
  `tasks/main-tasks/pending-fix`.
- Confirm there is no section that reviews or rewrites fix plans before coding.
- Confirm section `## 6. Update status and move task file` routes to:
  - `tasks/main-tasks/finished-tasks` when all PIRs are fixed.
  - `tasks/main-tasks/pending-human-review` when any PIR is skipped.
