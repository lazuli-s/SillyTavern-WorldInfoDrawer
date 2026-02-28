---
name: task-changelog
description: Generates a structured changelog entry from one finished task file and appends it to the correct per-type changelog file in tasks/changelogs/. Then moves the task file to tasks/main-tasks/archived-tasks/. Use when the user invokes /task-changelog, says "generate a changelog entry", "add to changelog", "changelog the next finished task", "changelog this task", or provides a finished task file path. Processes exactly ONE task file per invocation. In finished-tasks folder mode (no task specified), scans tasks/main-tasks/finished-tasks and picks the first file alphabetically.
---

# task-changelog

Generates exactly one changelog entry per invocation, then stops.

**Two modes:**
- **Finished-tasks folder mode** (no task specified): scan `tasks/main-tasks/finished-tasks`, sort `*.md` files alphabetically, set the first as `TARGET_TASK_FILE`. If none exist: report "No finished tasks to changelog" and stop.
- **Direct mode** (user names a task): use that file as `TARGET_TASK_FILE`. Skip folder scan.

---

## 1. Select target

**Finished-tasks folder mode:** Glob `tasks/main-tasks/finished-tasks/*.md`, sort alphabetically, set the first file as `TARGET_TASK_FILE`.

**Direct mode:** Set `TARGET_TASK_FILE` to the path the user provided.

---

## 2. Parse the task file

Read `TARGET_TASK_FILE` fully. Extract the fields below.

### 2a. Task type and changelog file

Detect the task type from the filename (basename only). Match the prefix — both old-style (`PascalCase_`) and new-style (`kebab-case__`) are supported:

| Filename starts with | Task type label | Changelog file |
|---|---|---|
| `Issue_` or `issue__` | Issue | `changelog__issue.md` |
| `NewFeature_` or `new-feature__` | New Feature | `changelog__new-feature.md` |
| `Rework_` or `rework__` | Rework | `changelog__rework.md` |
| `Refactoring_` or `refactoring__` | Refactoring | `changelog__refactoring.md` |
| `Docs_` or `docs__` | Docs | `changelog__docs.md` |
| `Skill_` or `skill__` | Skill | `changelog__skill.md` |
| `CodeReview_` or `code-review___` | Code Review | `changelog__code-review.md` |

If no prefix matches, use "Task" as the label and `changelog__task.md` as the file.

### 2b. Title

Extract from the first `# ` heading. Strip the leading task-type label and colon, if present.
- `# New Feature: List Panel Tabs` → title is `List Panel Tabs`
- `# TASK: Remove redundant parent prefix` → title is `Remove redundant parent prefix`
- `# Refactoring_stylecssNesting` → title is `style.css Nesting`

### 2c. Date

Use the **first available** date, in this priority order:
1. `*Implemented: ...*` under `## After Implementation`
2. `*Created: ...*` near the top of the file
3. The file system modification date

Normalize to `Month D, YYYY` (e.g. `February 23, 2026`).

### 2d. Summary (1–2 sentences)

Write a plain-language 1–2 sentence summary of what the task did. Draw from:
- `## Summary` section (if present)
- `## Why` section (if present)
- The title and `## Changes Made` / `### What changed` sections

Keep it non-technical and jargon-free. Do not quote code.

### 2e. Scope

List the files that were touched. Check in this order:
1. `## Agreed Scope` — extract explicit file paths
2. `## After Implementation` → `### What changed` — file names listed as headings or inline
3. `## Changes Made` — file names mentioned (old format)
4. PIR `### Files Inspected` list

Present as a flat list of file names, e.g. `style.css`, `src/orderHelper.js`.

### 2f. What changed

Extract the major change bullets. Draw from:
- `## After Implementation` → `### What changed` bullets
- `## Changes Made` bullets (old format)

Keep to 3–5 bullets max. Rewrite in plain language if the source is too technical.

**What counts as a major change (include):**
- Something was added, removed, or renamed in a way that a user or reviewer would notice
- A behavior changed — something now works differently than before
- A new visual element, section, or control appeared or was removed
- A name or structure was changed across multiple files (e.g. a CSS class rename)

**What to skip (not a major change):**
- Verification or grep steps run during implementation ("confirmed X still works")
- Architecture doc updates (`ARCHITECTURE.md`, `FEATURE_MAP.md`) unless they are the primary purpose of the task
- Checklist items that describe process steps, not outcomes
- Low-level implementation details (specific line numbers, internal variable names) that don't surface to any user

### 2g. Review status

Determine from the `**Status:**` field in the task file:

| Status value | Review label |
|---|---|
| `NO_ISSUES` | `No issues found` |
| `ISSUES_FOUND`, `FINISHED`, `PENDING_HUMAN_REVIEW` | `Issues found` |
| Field absent — check for PIR `### No Issues Found` | `No issues found` |
| Field absent — check for PIR `### Findings` | `Issues found` |
| No Status field and no PIR section | `Not reviewed` |

### 2h. Fixes

Look for `## Post-Implementation Fixes`. Extract `[x]` items only (fixed ones):
- Use the `**PIR-NN**: <Title>` as the issue name
- Use the `**What changed**: ...` line as the fix description
- Format: `<Title>: <what changed>`
- Skip `[ ]` items (not fixed / skipped)
- If no `## Post-Implementation Fixes` section, or all items were `[ ]`: omit the **Fixes** field entirely

---

## 3. Determine the changelog file

Set `CHANGELOG_FILE` to `tasks/changelogs/<changelog filename from table in §2a>`.

---

## 4. Format the changelog entry

Compose the entry block:

```markdown
## <Month D, YYYY>

### <Title>

<1–2 sentence summary>

- File name: [`<TARGET_TASK_FILE basename>`]
- Scope: [`file1.js`, `style.css`, …]
- **What changed:**
  - <bullet 1>
  - <bullet 2>
- **Review:** <No issues found / Issues found / Not reviewed>
- **Fixes:**
  - <PIR title>: <what changed>
```

Omit the `**Fixes:**` block entirely if no fixes were applied (see §2h).

---

## 5. Write to the changelog file

### If the changelog file does not exist

Create it with this content:

```markdown
# Changelog: <Task Type Label>

<entry block>
```

### If the changelog file already exists

Read it. Then apply one of these two insertion rules:

**Same date already present:** Find the existing `## <same date>` heading. Insert the new `### <Title>` block immediately after that heading line, above any existing `###` blocks for that date.

**New date not yet present:** Insert the full `## <date>\n\n### <Title>\n...` block immediately below the `# Changelog: ...` header line, above all existing entries.

Never add a duplicate `## <date>` heading. Never add a duplicate `### <Title>` block.

---

## 6. Move the task file

Move `TARGET_TASK_FILE` to `tasks/main-tasks/archived-tasks/`.
If the `archived-tasks/` folder does not exist, create it with `mkdir` first.

---

## 7. Print summary

Print one short paragraph in plain language:

> Changelog entry added for **\<Title\>** (\<task type\>) under **\<date\>** in `tasks/changelogs/<changelog file>`. Task file moved to `tasks/main-tasks/archived-tasks/`.

Then stop.
