# Main Tasks Workflow — Overview

This document describes the full lifecycle of a task, from the moment an idea or bug is reported to the moment it is archived. It is a reference for understanding the system at a glance — each step links to the full workflow prompt for details.

---

## Queue Structure

All tasks move through a single file: `tasks/main-tasks-queue.md`.

| Section | What it holds |
|---|---|
| **New tasks** | Items the user has added manually — not yet analyzed |
| **Documented tasks** | Items that went through Step 1 (Analyze Request) — have a task file and are ready for Step 2 (Implement Task) |
| **Implemented tasks** | Items that have been implemented |
| **Tasks pending review** | Items that have been implemented and are waiting for Step 3 |
| **Reviewed — no issues found** | Step 3 found nothing; ready for Step 5 (Archive) |
| **Reviewed — issues found** | Step 3 found problems; goes to Step 4 (Fix Plan) |
| **Fix plan — all issues fixed** | Step 4 resolved everything; ready for Step 5 (Archive) |
| **Fix plan — unresolved issues** | Step 4 could not fix everything (high risk or needs human review) |
| **Archived tasks** | Step 5 has fully processed these; final state |

After every step, **sync_queue** runs to move entries to the correct section and move files on disk.

---

## Step 1 — Analyze Request

**Workflow:** `workflows/main-tasks-workflow/step-1-analyze-request.md`
**Purpose:** Turn a vague idea, bug report, or change request into a precise, shared understanding before any code is written and document it.

- Read architecture docs to ground the analysis.
- Interview the user using `AskUserQuestion` to establish: current behavior, expected behavior, trigger/context, scope, and edge cases.
- Use `FEATURE_MAP.md` to identify which module(s) own the behavior being changed.
- Choose the correct task file type (`Issue_`, `NewFeature_`, `Rework_`, `Refactoring_`) and write the task file.
- Set status as DOCUMENTED.

**Output:** A task file with type, status, summary, current behavior, expected behavior, agreed scope, out of scope, implementation plan. No code is written.

---

## Step 2 — Implement Task


**Purpose:** Take the next task from the queue and implement it with minimal, correct code changes.

- Pick the first item from **Tasks to be implemented** in `main-tasks-queue.md`.
- Load all authoritative docs
- Read the task file and resolve any open questions via code inspection.
- Build a concrete, ordered implementation plan checklist inside the task file.
- Implement each step; check off items as they are completed.
- Update `FEATURE_MAP.md` / `ARCHITECTURE.md` if module ownership changed.
- Write an **After Implementation** section: files changed, risks, and manual checks.
- Move the task to **Tasks to be reviewed** in `main-tasks-queue.md`.

**Output:** Working code changes + updated task file. No commit is made.

---

## Step 3 — Post-Implementation Review

**Workflow:** `workflows/main-tasks-workflow/step-3-post-implementation-review.md`
**Purpose:** Inspect the implemented code and catch bugs, architectural violations, or JS best practice issues.

- Pick the first item from **Tasks pending review** in `main-tasks-queue.md`.
- Load all authoritative docs.
- Identify which source files to inspect from the task file's **Files Changed** section (or infer from `FEATURE_MAP.md`).
- Inspect each file for: bugs introduced by the implementation, architectural violations, and JS best practice issues (SEC/PERF/COMPAT rules).
- Append a **Post-Implementation Review** section to the task file with numbered findings (PIR-01, PIR-02, …). Each finding includes: category, severity, location, summary, confidence, fix risk, fix plan, and whether human judgment is required.
- Set the task's `## Status` field: `no_issues` / `issues_found` / `pending_human_review` / `high_risk_fix`.

**Output:** Updated task file with review findings and a status field.

---

## Step 4 — Execute Fix Plan

**Workflow:** *(not yet formally defined — draft)*
**Purpose:** Work through the findings from Step 3 and apply fixes. Each finding is handled separately.

- Collect all tasks with status `issues_found` from `main-tasks-queue.md`.
- For each task, read its PIR findings.
- For each finding that has a fix plan and does **not** require human judgment: implement the fix; create a separate commit for each finding (if there is more than one).
- After all fixable findings are resolved: move the task to **Fix plan — all issues fixed**.
- If any findings remain unresolved (high fix risk or requires human judgment): move the task to **Fix plan — unresolved issues**.

**Output:** Code fixes committed per finding. Task file updated with which findings were resolved.

> **Note:** This step is a placeholder. The full workflow prompt has not been written yet.

---

## Step 5 — Add to Changelog & Archive

**Workflow:** *(not yet formally defined — draft)*
**Purpose:** Formally close out all finished tasks and record what was done.

- Scan all files inside the `finished-tasks/` folder.
- For each file: extract what was done and add a human-readable entry to `tasks-changelog.md`.
- Move each file from `finished-tasks/` to `archived-tasks/`.

**Output:** `tasks-changelog.md` updated; finished task files moved to `archived-tasks/`.

> **Note:** This step is a placeholder. The full workflow prompt has not been written yet.

---

## Utility — sync_queue

**Purpose:** Keep `main-tasks-queue.md` and the file system in sync. Runs automatically after every step.

- Scan all task files across all task folders.
- Read each file's `## Status` field to determine where it currently stands.
- Update `main-tasks-queue.md`: move each entry to the section that matches its status.
- Move files on disk between folders (e.g., `implemented-tasks/` → `finished-tasks/`) to reflect their current position in the workflow.

> **Note:** This workflow has not been written yet. It is planned to run after every step as a cleanup pass.
