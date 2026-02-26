# Main Tasks Workflow — Overview

This document describes the full lifecycle of a task, from the moment an idea or bug is reported to the moment it is archived. It is a reference for understanding the system at a glance — each step links to the full workflow prompt for details.

---

## Queue Structure

All tasks move through a single file: `tasks/main-tasks-queue.md`.

| Section | What it holds |
| --- | --- |
| **New tasks** | Items the user has added manually — not yet analyzed |
| **Documented tasks** | Items that went through Step 1 (Analyze Request) — have a task file and are ready for Step 2 (Implement Task) |
| **Tasks pending review** | Items that have been implemented and are waiting for Step 3 (Post-Implementation Review) |
| **Reviewed tasks** | Parent section for Step 3 outcomes |
| → *Tasks with no issues found* | Step 3 found nothing; moved to `finished-tasks/` and ready for Step 5 (Archive) |
| → *Tasks with issues found* | Step 3 found problems; goes to Step 4 (Execute Fix Plan) |
| **Fix plan** | Parent section for Step 4 outcomes |
| → *Tasks with all issues fixed* | Step 4 resolved everything; moved to `finished-tasks/` and ready for Step 5 (Archive) |
| → *Tasks with unresolved issues* | Step 4 could not fix everything; moved to `unresolved-issues/`; sub-divided by reason (high fix risk / requires human review) |
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

**Workflow:** `workflows/main-tasks-workflow/step-2-implement-task.md`
**Purpose:** Take the next task from the queue and implement it with minimal, correct code changes.

- Pick the first item from **Documented tasks** in `main-tasks-queue.md`.
- Load all authoritative docs.
- Read the task file and resolve any open questions via code inspection.
- Review and correct the implementation plan: check each checklist item for JS best practice violations (SEC/PERF/COMPAT rules) and WI API anti-patterns; rewrite any bad steps in-place before writing any code.
- Implement each step; check off items as they are completed.
- Update `FEATURE_MAP.md` / `ARCHITECTURE.md` if module ownership changed.
- Write an **After Implementation** section: files changed, risks, and manual checks.
- Set status to IMPLEMENTED.

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
- Set the task's `## Status` field: `NO_ISSUES` / `ISSUES_FOUND`.

**Output:** Updated task file with review findings and a status field.

---

## Step 4 — Execute Fix Plan

**Workflow:** `workflows/main-tasks-workflow/step-4-execute-fix-plan.md`
**Purpose:** Work through the findings from Step 3 and apply fixes. Each finding is handled separately.

- Pick the first item from **Tasks with issues found** in `main-tasks-queue.md`.
- Load all authoritative docs.
- Read the task file; collect all PIR findings; classify each as fixable or skippable (high fix risk or requires human judgment).
- Review each fixable finding's fix plan against JS best practice and WI API rules; rewrite any bad steps in-place before writing any code.
- For each fixable finding: implement the fix; create a commit after each one (type `tasks`, scope `code-review`).
- Append a **Post-Implementation Fixes** section to the task file listing every PIR — fixed ones marked `[x]` with a plain-language description, skipped ones marked `[ ]` with the skip reason.
- Print a plain-language summary of what was fixed and what was skipped.
- Set status to `FINISHED` (all fixed) or `PENDING_FIX` (at least one skipped).

**Output:** Code fixes committed per finding. Task file updated with which findings were resolved and why any were skipped.

---

## Step 5 — Add to Changelog & Archive

**Workflow:** `workflows/main-tasks-workflow/step-5-add-to-changelog.md`
**Purpose:** Formally close out all finished tasks and record what was done.

- Scan all files inside the `finished-tasks/` folder.
- For each file: extract what was done and add a human-readable entry to `tasks-changelog.md`.
- Move each file from `finished-tasks/` to `archived-tasks/`.

**Output:** `tasks-changelog.md` updated; finished task files moved to `archived-tasks/`.

> **Note:** This step is a placeholder. The full workflow prompt has not been written yet.

---

## Utility — sync_queue

**Workflow:** `workflows/main-tasks-workflow/utility-sync-queue.md`
**Purpose:** Keep `main-tasks-queue.md` and the file system in sync. Runs automatically after every step.

- Scan all task files across all task folders.
- Read each file's `## Status` field to determine where it currently stands.
- Update `main-tasks-queue.md`: move each entry to the section that matches its status.
- Move files on disk between folders (e.g., `implemented-tasks/` → `finished-tasks/`) to reflect their current position in the workflow.

> **Note:** This workflow has not been written yet. It is planned to run after every step as a cleanup pass.
