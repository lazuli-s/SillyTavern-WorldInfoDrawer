# Scripts Reference — Code Review Cycle

**Last updated:** 2026-02-28
**Used by:** [Workflow_CodeReviewCycle.md](Workflow_CodeReviewCycle.md)

This file documents the scripts and commands used to run Phases 2–4 of the
code review cycle in batch mode. Each phase runs in a **fresh agent session**.

---

## Step 2 — First Review

**Skill:** `code-review-first-review`
**Runs:** Once per file in the queue (the skill picks the next file automatically).
**Repeat until:** `tasks/code-reviews/code-review-queue.md` has no remaining entries.

### Cline task prompt

```text
Run the /code-review-first-review skill.
```

### Codex command

```text
[fill in your Codex command here]
```

---

## Step 3 — Meta Review

**Skill:** `code-review-meta-review`
**Runs:** Once per file in `pending-meta-review/` (picks the first file each run).
**Repeat until:** `tasks/code-reviews/pending-meta-review/` is empty.

### Cline task prompt

```text
Run the /code-review-meta-review skill.
```

### Codex command

```text
[fill in your Codex command here]
```

---

## Step 4 — Triage

**Skill:** `triage-reviews`
**Runs:** Once per file in `pending-implementation/` (picks the first file each run).
**Repeat until:** `tasks/code-reviews/pending-implementation/` is empty.

### Cline task prompt

```text
Run the /triage-reviews skill.
```

### Codex command

```text
codex exec --sandbox workspace-write --full-auto "Run the /triage-reviews skill now. Pick the FIRST file in tasks/code-reviews/pending-implementation/ and triage it. Process that one file only."
```

### Batch script (loops until folder is empty)

```text
scripts/codex/triage-batch.sh      ← bash (Linux / macOS / WSL / Git Bash)
scripts/codex/triage-batch.ps1     ← PowerShell (Windows)
```

---

## Notes

- All three steps process **one file per invocation**. If you have 14 files,
  you need to run each script 14 times (or loop it).
- Always use a **fresh context/session** for each invocation — do not chain
  them in the same session.
- Steps 2, 3, and 4 can each be run as a loop script that keeps calling the
  skill until the input folder is empty.

---

## Future: Automating Phase 1 (Queue Building)

Phase 1 is currently manual. It could be automated with a Cline task like:

```text
Scan index.js and all .js files inside src/ (not in vendor/).
For each file found, add a line to tasks/code-reviews/code-review-queue.md
under the "## Files Pending Review" section.
Do not add files that are already listed there.
```

This would replace the manual LLM prompt entirely.
