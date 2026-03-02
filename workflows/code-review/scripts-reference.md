# Scripts Reference — Code Review Cycle

**Last updated:** 2026-03-01
**Used by:** [workflow.md](workflow.md)

This file documents the scripts and commands used to run Phases 2–4 and Phase 7
of the code review cycle in batch mode. Each phase runs in a **fresh agent session**.

---

## Step 2 — First Review

**Skill/tool:** `code-review-first-review`
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

**Skill/tool:** `code-review-meta-review`
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

**Skill/tool:** `triage-reviews`
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
4-codex-triage.sh      ← bash (Linux / macOS / WSL / Git Bash)
4-codex-triage.ps1     ← PowerShell (Windows)
```

---

## Step 7 — Bulk Implement

**Skill/tool:** `code-review-implement`
**Runs:** Once per file in `ready-for-implementation/bulk/` — loops until the folder is empty.
**Commits:** Once at the end, after all files are processed.
**Note:** Only use this script for `bulk/`. Files in `single/` must be run manually, one at a time.

### Batch script (loops until folder is empty, then commits)

```text
7-codex-implement-bulk.ps1     <- PowerShell (Windows)
```

**Optional parameter** — override the source folder:

```text
.\workflows\code-review\7-codex-implement-bulk.ps1 -BulkDir "tasks/code-reviews/ready-for-implementation/bulk"
```

**What the script does:**

1. Counts `.md` files in `bulk/`, shows a header with the file count and folder path.
2. For each file (alphabetical order): calls `codex exec --yolo` with the `code-review-implement` skill in direct mode, targeting that specific file.
3. The skill implements findings and moves the file to `tasks/code-reviews/pending-changelog/`.
4. Shows per-file Started / Completed / Elapsed timing.
5. After the folder empties: runs `git add -A` and commits with the message:
   `code-review(bulk-implement): implement bulk review findings from codex batch run`
6. If codex or git fails at any step, the script throws an error and stops immediately.

---

## Notes

- Steps 2, 3, and 4 process **one file per invocation**. If you have 14 files,
  you need to run each script 14 times (or loop it).
- Step 7 (bulk) processes **all files in one run** and commits at the end — do not run it for `single/` files.
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
