# Workflow: Learning Vault

**Last updated:** 2026-03-01
**Purpose:** Capture programming concepts from Claude conversations, verify their accuracy, and convert them into browsable notebooks and Anki flashcards.
**Audience:** User + Claude Code AI agent

---

## Quick Reference Table

| # | Phase | How | Output location | Test? |
| --- | --- | --- | --- | --- |
| 1 | Capture concepts | `/document-concepts` skill | `learning-vault/drafts/` | No |
| 2 | Review for accuracy | Codex batch script (one file at a time) | `learning-vault/reviewed/` | Yes — user checks flagged items |
| 3 | Generate notebooks | `/generate-learning` skill | `learning-vault/notebooks/` | No |
| 4 | *(if AnkiConnect set up)* Push Anki cards | `/generate-learning` skill | Anki deck directly | Yes — open Anki and verify |

---

## Pipeline Flow Diagram

```text
  PHASE 1 ── Capture Concepts
  ┌──────────────────────────────────────────────────────────────┐
  │  User types /document-concepts during or after a session.   │
  │  Claude scans the conversation, identifies concepts worth    │
  │  saving, and writes a draft file to learning-vault/drafts/  │
  └──────────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
  PHASE 2 ── Review for Accuracy
  ┌──────────────────────────────────────────────────────────────┐
  │  User runs scripts/codex/review-concepts.ps1.               │
  │  The script loops over drafts/ and calls Codex on each file │
  │  individually using a shared review prompt. Each file is    │
  │  verified, corrected if needed, then moved to reviewed/.    │
  └──────────┬───────────────────────────────┬───────────────────┘
             │ all approved                  │ some flagged
             │                               ▼
             │                  User reviews flagged items manually.
             │                  Correct or discard, then re-run phase.
             │
             ▼
  PHASE 3 ── Generate Notebooks
  ┌──────────────────────────────────────────────────────────────┐
  │  User types /generate-learning.                             │
  │  Claude reads reviewed/, updates notebook .md files, checks │
  │  for duplicates, moves processed drafts to archived/        │
  └──────────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
  PHASE 4 ── Push Anki Cards  *(only if AnkiConnect is set up)*
  ┌──────────────────────────────────────────────────────────────┐
  │  Runs as part of /generate-learning.                        │
  │  Claude generates cards and pushes them via AnkiConnect.    │
  │  If AnkiConnect is unavailable, generates an import file    │
  │  instead and saves it to learning-vault/anki-imports/       │
  └──────────────────────────────────────────────────────────────┘
```

---

## Folder Conveyor Belt

```text
  learning-vault/

  drafts/           reviewed/         notebooks/         archived/
  ─────────         ─────────         ──────────         ─────────
  New files         Verified          Cumulative         Processed
  land here   ───►  files       ───►  .md files    ───►  drafts
  (Phase 1)         (Phase 2)         (Phase 3)          (Phase 3)
                        │
                        │  also feeds ──►  Anki deck
                        │                 (Phase 4, if set up)
                        │
                    ◄───┘  flagged items loop back
                           to user for manual review
```

---

## Phase Cards

```text
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 1  │  Capture Concepts                                   │
├──────────────────────────────────────────────────────────────────┤
│  Trigger  │  User types /document-concepts                      │
│  When     │  During or at the end of any coding conversation    │
│  Input    │  Current conversation history                       │
│  Output   │  New .md draft file in learning-vault/drafts/       │
│  Skill    │  /document-concepts  (not yet created)              │
│  Test?    │  No                                                 │
└──────────────────────────────────────────────────────────────────┘
```

Claude automatically scans the conversation and decides what is worth saving. You do not need to know what is important — that is Claude's job. Each draft file captures:

- **Concept name** — the term or idea being captured
- **Type** — one of: `terminology`, `mental model`, `code snippet`
- **Plain-language explanation** — what it means, written for someone learning to read code
- **Example** — a short code snippet or concrete illustration where relevant
- **Topic tag** — one of: `JS`, `HTML`, `DOM`, `Async`, `CSS`, `Git`, `Patterns`, `Browser`, `Architecture`, `General`
- **Source context** — a brief note about which conversation it came from

Draft filename format: `YYYY-MM-DD_topic-slug.md`
Example: `2026-03-01_kebab-case-naming.md`

> **Status:** The `/document-concepts` skill does not exist yet. This phase is a placeholder.

---

```text
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 2  │  Review for Accuracy                                │
├──────────────────────────────────────────────────────────────────┤
│  Trigger  │  User runs scripts/codex/review-concepts.ps1        │
│  When     │  After accumulating a few drafts (not after every   │
│           │  capture — batch them)                              │
│  Input    │  Each file in learning-vault/drafts/ — one at a     │
│           │  time, processed sequentially by the batch script   │
│  Output   │  Verified files moved to learning-vault/reviewed/   │
│  How      │  Batch script calls Codex on each file individually │
│           │  using a shared review prompt file                  │
│  Test?    │  Yes — user checks any flagged items                │
└──────────────────────────────────────────────────────────────────┘
```

The batch script (`scripts/codex/review-concepts.ps1`) loops over every `.md` file in `drafts/` and sends each one to Codex individually using a shared review prompt. Processing files one at a time keeps each review focused and avoids the context getting cluttered with unrelated concepts.

For each file, Codex either:

- **Approves** — moves the file to `reviewed/` as-is
- **Corrects** — fixes the explanation or example, notes what changed, then moves to `reviewed/`
- **Flags** — marks the concept as uncertain and asks the user to decide

Flagged concepts are shown to the user with a specific question (e.g., "I'm not confident about this explanation — should I discard it or do you want to rephrase it?"). The user decides; Claude does not discard anything silently.

This step also checks for **duplicates** — if a concept already exists in `reviewed/` or `notebooks/`, the skill notes it and skips rather than adding a redundant entry.

> **Status:** The batch script and review prompt do not exist yet. This phase is a placeholder.

---

```text
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 3  │  Generate Notebooks                                 │
├──────────────────────────────────────────────────────────────────┤
│  Trigger  │  User types /generate-learning                      │
│  When     │  After reviewing a batch of concepts                │
│  Input    │  All files in learning-vault/reviewed/              │
│  Output   │  Updated .md files in learning-vault/notebooks/     │
│           │  Processed drafts moved to learning-vault/archived/ │
│  Skill    │  /generate-learning  (not yet created)             │
│  Test?    │  No                                                 │
└──────────────────────────────────────────────────────────────────┘
```

Claude reads all reviewed files and appends new entries to the correct notebook file by topic tag:

| Topic tag | Notebook file | What belongs here |
| --- | --- | --- |
| `JS` | `notebooks/JS.md` | Variables, functions, loops, objects, arrays, modules |
| `HTML` | `notebooks/HTML.md` | Elements, attributes, document structure, forms |
| `DOM` | `notebooks/DOM.md` | Querying elements, parent/child, adding/removing nodes, events |
| `Async` | `notebooks/Async.md` | Promises, async/await, callbacks, event loop |
| `CSS` | `notebooks/CSS.md` | Selectors, properties, layout (flex/grid), variables |
| `Git` | `notebooks/Git.md` | Commits, branches, diffs, merge vs rebase |
| `Patterns` | `notebooks/Patterns.md` | Module pattern, observer/events, factory, strategy |
| `Browser` | `notebooks/Browser.md` | DevTools, console, fetch, localStorage, network tab |
| `Architecture` | `notebooks/Architecture.md` | Separation of concerns, DRY, single responsibility, cohesion |
| `General` | `notebooks/General.md` | Concepts that don't fit elsewhere |

Notebooks are **browsable reference files** — they use headings, short definitions, and examples. They are designed to be scanned in 30–60 seconds when you forget something. They are not tutorials.

Before adding any entry, the skill checks whether a matching concept already exists in the notebook. If it does, the skill updates the existing entry instead of creating a duplicate.

> **Status:** The `/generate-learning` skill does not exist yet. This phase is a placeholder.

---

```text
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 4  │  Push Anki Cards  *(conditional — only if AnkiConnect set up)*  │
├──────────────────────────────────────────────────────────────────┤
│  Trigger  │  Runs automatically as part of /generate-learning   │
│  When     │  Same session as Phase 3                            │
│  Input    │  Reviewed files (same as Phase 3)                   │
│  Output   │  Cards pushed to Anki via AnkiConnect               │
│           │  Fallback: import file saved to anki-imports/       │
│  Test?    │  Yes — open Anki and verify cards appeared          │
└──────────────────────────────────────────────────────────────────┘
```

Cards are pushed to Anki with sub-decks by topic:

| Topic tag | Anki deck |
| --- | --- |
| `JS` | `Programming::JS` |
| `HTML` | `Programming::HTML` |
| `DOM` | `Programming::DOM` |
| `Async` | `Programming::Async` |
| `CSS` | `Programming::CSS` |
| `Git` | `Programming::Git` |
| `Patterns` | `Programming::Patterns` |
| `Browser` | `Programming::Browser` |
| `Architecture` | `Programming::Architecture` |
| `General` | `Programming::General` |

Card format follows the minimum information principle (one atomic concept per card). Code snippets appear in the answer with a plain-language explanation of what the code does — not what to type.

**Before creating a card**, the skill checks the existing deck via AnkiConnect to avoid duplicates.

**If AnkiConnect is unavailable** (Anki is not running, or plugin not installed), the skill saves a `.tsv` import file to `learning-vault/anki-imports/` instead, and notifies you.

> **Status:** The `/generate-learning` skill does not exist yet. AnkiConnect has not been installed yet. This phase is a placeholder.
>
> **AnkiConnect setup:** Install the AnkiConnect add-on from inside Anki: Tools → Add-ons → Get Add-ons → code `2055492159`. Anki must be running for the push to work.

---

## Edge Cases

### Resuming mid-cycle

If you stop partway through the workflow, use this table to know which phase to run next:

| Where are the files? | What to run next |
| --- | --- |
| Files sitting in `drafts/` | `/review-concepts` |
| Files sitting in `reviewed/` | `/generate-learning` |
| Nothing in `drafts/` or `reviewed/` | You are at the start — run `/document-concepts` |

### Failure recovery

| What went wrong | What to do |
| --- | --- |
| AnkiConnect push failed | Check Anki is open. Re-run `/generate-learning`. If it still fails, the fallback `.tsv` file will be in `anki-imports/` — import manually via File → Import in Anki. |
| Reviewed file looks wrong after generation | Open the notebook .md file directly and edit it. It is just a text file. |
| A concept was captured that is wrong or irrelevant | Delete the draft file from `drafts/` or `reviewed/` before running the next phase. |
| Duplicate card appeared in Anki | Delete it directly in Anki. Then check the `reviewed/` file — the skill may have missed an existing card. |

### Batching recommendation

Do not run `/review-concepts` and `/generate-learning` after every single capture. Let a few drafts accumulate — reviewing 5–10 concepts at a time is more efficient and less disruptive to your coding flow.
