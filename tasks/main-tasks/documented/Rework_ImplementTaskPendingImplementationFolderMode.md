# REWORK: implement-task pending-implementation folder mode
*Created: February 28, 2026*

**Type:** REWORK
**Status:** FINISHED

---

## Summary

Change the `implement-task` skill so its default mode no longer uses
`tasks/main-tasks-queue.md`.
The default mode now scans `tasks/main-tasks/pending-implementation`.

## What changed

- Updated `skills/implement-task/SKILL.md` description to remove queue wording.
- Replaced `Queue mode` with `Pending-implementation folder mode`.
- Updated step 1 target selection to scan `tasks/main-tasks/pending-implementation`,
  collect `*.md` files, sort alphabetically, and pick the first file.
- Updated the empty-folder message to
  `"No pending-implementation tasks to implement"`.
- Updated section `## 4. Review and correct the implementation plan` so it
  loads `skills/st-js-best-practices/SKILL.md` and uses that skill for plan
  validation.
- Added section `## 9. Move task file` instructing the workflow to move
  implemented task files into `tasks/main-tasks/implemented-tasks`.

## Why this change

- Removes queue maintenance from this workflow.
- Matches the requested behavior to use the folder as the source of truth.

## Manual check

- Open `skills/implement-task/SKILL.md`.
- Confirm there are no references to `tasks/main-tasks-queue.md` or `Queue mode`.
- Confirm section `## 1. Select target` uses
  `Pending-implementation folder mode` and scans
  `tasks/main-tasks/pending-implementation`.
- Confirm section `## 4. Review and correct the implementation plan` tells the
  agent to load `skills/st-js-best-practices/SKILL.md`.
- Confirm a `## 9. Move task file` section exists and points to
  `tasks/main-tasks/implemented-tasks`.
