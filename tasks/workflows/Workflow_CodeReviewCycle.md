# Workflow: JS Code Review Cycle

**Last updated:** 2026-03-01 (rev: added implement-bulk-batch.ps1 for Phase 7 bulk automation)
**Purpose:** Reference for running a complete JS code review batch — from scanning files to archiving results.
**Audience:** Human reference + agent orientation.

For script commands, see [scripts-reference.md](scripts-reference.md).

---

## 1. Quick Reference Table

| # | Phase | How | Output location | Test ST? |
| --- | --- | --- | --- | --- |
| 1 | Build queue | Manual LLM prompt | `code-review-queue.md` | No |
| 2 | First review | `code-review-first-review` skill | `pending-meta-review/` | No |
| 3 | Meta review | `code-review-meta-review` skill | `pending-implementation/` | No |
| 4 | Triage | `triage-reviews` skill | `ready-for-implementation/bulk/` or `single/` | No |
| 5 | Commit | `git commit` | — | No |
| 6 | Review user-review files | Manual | `ready-for-implementation/single/` | No |
| 7 | Implement | `code-review-implement` skill | `pending-changelog/` | 🟡 = yes |
| 8 | *(if broke)* Failed implementation | `failed-implementation` skill | `pending-implementation/` | — |
| 9 | Changelog + Archive | `code-review-changelog` skill | `archived/<month-year>/` | No |

---

## 2. Pipeline Flow Diagram

```text
┌─────────────────────────────────────────────────────┐
│              JS CODE REVIEW CYCLE                   │
└─────────────────────────────────────────────────────┘

  PHASE 1 ── Build Queue
  ┌────────────────────────────────────────────────┐
  │  Manually prompt LLM to scan index.js +        │
  │  src/*.js files                                │
  │  Output → code-reviews/code-review-queue.md   │
  └──────────────────────┬─────────────────────────┘
                         │
  PHASES 2–4 ── Review + Triage  (scripted)
  ┌──────────────────────▼─────────────────────────┐
  │  [2] code-review-first-review  skill           │
  │              ↓                                 │
  │  [3] code-review-meta-review   skill           │
  │              ↓                                 │
  │  [4] triage-reviews            skill           │
  └──────────────────────┬─────────────────────────┘
                         │ files split into:
          ┌──────────────┼──────────────────┐
          ▼              ▼                  ▼
  pending-user-review/  finished/   ready-for-implementation/
  (manual decision)  (no findings)      ├── bulk/   (🟢-only)
                                         └── single/ (any 🟡)

                                            │
  PHASE 5 ── Git Commit ───────────────────┘
                         │
  PHASE 6 ── Review pending-user-review/  (manual)
  ┌──────────────────────▼─────────────────────────┐
  │  Read each file; decide: implement/skip/defer  │
  │  Move approved files → ready-for-impl/single/  │
  └──────────────────────┬─────────────────────────┘
                         │
  PHASE 7 ── Implement
  ┌──────────────────────▼─────────────────────────┐
  │  single/ files: run skill manually, one at a   │
  │  time; reload ST and check before the next     │
  │                                                │
  │  bulk/ files: run via script; all 🟢-only so   │
  │  safe to process together; commit at the end   │
  └──────┬───────────────────────────┬─────────────┘
         │ ST ok                     │ ST broke
         │                           ▼
         │              PHASE 8 ── Failed Implementation
         │              ┌────────────────────────────┐
         │              │  failed-implementation     │
         │              │  skill: revert, document,  │
         │              │  re-plan, re-queue         │
         │              │  → ready-for-impl/         │◄─┐
         │              └────────────────────────────┘  │
         │                  (loops back to Phase 7)     │
         ▼                                              │
  PHASE 9 ── Changelog + Archive  (when all done)
  ┌──────────────────────▼─────────────────────────┐
  │  run: code-review-changelog skill              │
  │  Output → archived/<month-year>/               │
  └────────────────────────────────────────────────┘
```

---

## 3. Folder Conveyor Belt

The folder a file lives in tells you exactly where you are in the cycle.
**To resume mid-cycle:** check which folder still has files — that is your next step.

```text
tasks/code-reviews/

  code-review-queue.md            ← Phase 1 complete
           │
           ▼
  pending-meta-review/            ← Phase 2 complete
           │
           ▼
  pending-implementation/         ← Phase 3 complete (also: Phase 8 re-queues here)
           │
           ▼
  ┌────────┴──────────────────────────────┐
  │                                       │
  pending-user-review/        ready-for-implementation/   ← Phase 4 complete
  (Phase 6: manual review)         ├── bulk/   (🟢-only → scripted)
           │                       └── single/ (any 🟡 → manual)
           │                                   │
           └──── approved → single/ ───────────┘
                                        │
                              Phase 5: git commit
                                        │
                              Phase 6: review user-review files
                                        │
                                        ▼
                              pending-changelog/           ← Phase 7 complete
                                        │
                              Phase 9: changelog skill
                                        │
                                        ▼
                              archived/<month-year>/       ← done

  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  failure path  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

  implementation-failed/      ← Phase 8 (temporary holding)
           │
           │  after re-plan
           ▼
  ready-for-implementation/single/   ← loops back to Phase 7 (implement manually)
```

---

## 4. Phase Cards

---

### Phase 1 — Build Queue

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 1  │  Build Queue                                │
├──────────────────────────────────────────────────────────┤
│  How      │  Manual — open a fresh agent session        │
│  Prompt   │  "Scan index.js and all .js files in src/  │
│           │   and add them to code-review-queue.md     │
│           │   with one entry per file."                │
│  Output   │  code-review-queue.md populated            │
│  Script   │  none (manual for now)                     │
└──────────────────────────────────────────────────────────┘
```

> **Future automation note:** This step could be scripted with a Cline task
> that runs a Glob over `index.js` and `src/*.js` and writes entries to the queue file.

---

### Phase 2 — First Review

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 2  │  First Review                               │
├──────────────────────────────────────────────────────────┤
│  Skill    │  code-review-first-review                   │
│  Input    │  code-review-queue.md                       │
│  Output   │  tasks/code-reviews/pending-meta-review/   │
│  Script   │  see scripts-reference.md → Step 2         │
│  Session  │  fresh agent session per run                │
└──────────────────────────────────────────────────────────┘
```

Runs once per file in the queue. Each file gets a structured findings report
covering: data integrity, race conditions, UI correctness, performance,
redundancy, and JS best practices.

---

### Phase 3 — Meta Review

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 3  │  Meta Review                                │
├──────────────────────────────────────────────────────────┤
│  Skill    │  code-review-meta-review                    │
│  Input    │  pending-meta-review/                       │
│  Output   │  tasks/code-reviews/pending-implementation/ │
│  Script   │  see scripts-reference.md → Step 3         │
│  Session  │  fresh agent session per run                │
└──────────────────────────────────────────────────────────┘
```

Audits each finding from Phase 2 for technical accuracy and implementation
quality. Adds a STEP 2 section to each review file before passing it forward.

---

### Phase 4 — Triage

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 4  │  Triage                                     │
├──────────────────────────────────────────────────────────┤
│  Skill    │  triage-reviews                             │
│  Input    │  pending-implementation/                    │
│  Output   │  ready-for-implementation/bulk/  (🟢-only) │
│           │  ready-for-implementation/single/ (any 🟡) │
│           │  pending-user-review/  (needs your call)   │
│  Script   │  see scripts-reference.md → Step 4         │
│  Session  │  fresh agent session per run                │
└──────────────────────────────────────────────────────────┘
```

Scans each review file twice in one pass:

1. Checks for findings marked "Implementation plan discarded":
   - Some discarded → splits them into a user-review file, stubs in the original
   - All discarded → moves entire file to `pending-user-review/`

2. For retained findings, checks for the 🟡 emoji (higher-risk changes):
   - All 🟢 → moves file to `ready-for-implementation/bulk/` (safe to script)
   - Any 🟡 → moves file to `ready-for-implementation/single/` (run one at a time)

---

### Phase 5 — Git Commit

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 5  │  Git Commit                                 │
├──────────────────────────────────────────────────────────┤
│  What     │  Commit all review files produced so far   │
│  Where    │  git add tasks/code-reviews/               │
│  Message  │  chore(code-reviews): promote reviews      │
│           │  after triage                              │
└──────────────────────────────────────────────────────────┘
```

---

### Phase 6 — Review pending-user-review Files

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 6  │  Review pending-user-review Files           │
├──────────────────────────────────────────────────────────┤
│  How      │  Manual — read each file in the folder      │
│  Input    │  pending-user-review/                       │
│  Action   │  Decide: implement, skip, or defer          │
│  Output   │  Approved files moved to                    │
│           │  ready-for-implementation/                  │
│           │  Skipped files stay, with a decision note   │
└──────────────────────────────────────────────────────────┘
```

For each file:

1. Open it and read the flagged findings.
2. Decide: implement manually, skip, or defer to a later cycle.
3. Move approved files to `ready-for-implementation/`.
4. Leave skipped files in place and add a short note explaining the decision.

---

### Phase 7 — Implement

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 7  │  Implement                                  │
├──────────────────────────────────────────────────────────┤
│  Skill    │  code-review-implement                      │
│  Output   │  pending-changelog/                         │
│  Session  │  one fresh agent session per file           │
│  Commit   │  after each file                            │
└──────────────────────────────────────────────────────────┘
```

**Two sub-paths depending on the source subfolder:**

| Source subfolder | What to do |
| --- | --- |
| `single/` | Run the skill manually, one file at a time. After each file: commit, reload ST, verify no errors. Only continue to the next file once ST is confirmed working. |
| `bulk/` | All files are 🟢-only. Run `scripts/codex/implement-bulk-batch.ps1` — processes every file in the folder, commits once at the end. See scripts-reference.md → Step 7. Test ST once after all are done. |

**If ST breaks after a commit** → invoke the `failed-implementation` skill (Phase 8).
Do not manually revert or move files — the skill handles all of that.
Re-queued files always go to `single/` (treated as higher-risk after a failure).

---

### Phase 8 — Failed Implementation Recovery *(conditional)*

> **Trigger:** ST breaks after a Phase 7 commit.
> Skip this phase entirely if all implementations succeed.

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 8  │  Failed Implementation Recovery             │
│           │  conditional — only if ST broke             │
├──────────────────────────────────────────────────────────┤
│  Skill    │  failed-implementation  (not yet created)   │
│  Trigger  │  ST breaks after a Phase 7 commit           │
│  Steps    │  1. git revert the bad commit               │
│           │  2. Move file → implementation-failed/      │
│           │  3. Interview: what exactly broke?          │
│           │  4. Document the failure in the file        │
│           │  5. Create new implementation plan          │
│           │  6. Move file → ready-for-implementation/  │
│           │     single/ (always — re-queued files are │
│           │     treated as higher-risk)                │
│  After    │  File re-enters Phase 7 directly with      │
│           │  its new plan                               │
└──────────────────────────────────────────────────────────┘
```

> **Status:** The `failed-implementation` skill does not exist yet.
> This phase is a placeholder until the skill is created.

---

### Phase 9 — Changelog + Archive

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 9  │  Changelog + Archive                        │
├──────────────────────────────────────────────────────────┤
│  Skill    │  code-review-changelog  (not yet created)  │
│  Input    │  pending-changelog/                         │
│  Output   │  tasks/changelogs/ (entry appended)        │
│           │  archived/<month-year>/ (file moved)       │
└──────────────────────────────────────────────────────────┘
```

> **Status:** The `code-review-changelog` skill does not exist yet.
> This phase is a placeholder until the skill is created.

---

## 5. Edge Cases

### Resuming a mid-cycle batch

Check the folder contents:

```text
pending-meta-review/                    → run code-review-meta-review next (Phase 3)
pending-implementation/                 → run triage-reviews next (Phase 4)
pending-user-review/                    → review files manually (Phase 6)
ready-for-implementation/single/        → run skill manually, one file at a time (Phase 7)
ready-for-implementation/bulk/          → run via script across all files (Phase 7)
implementation-failed/                  → invoke failed-implementation skill (Phase 8)
pending-changelog/                      → run code-review-changelog next (Phase 9)
```

If multiple folders have files (e.g., you stopped mid-Phase 7), finish the
current phase completely before moving to the next one.
