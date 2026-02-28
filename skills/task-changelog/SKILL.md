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

### 2b. CHANGELOG category

Determine which CHANGELOG.md section this task's outcome belongs to. Use the task type as the starting point, then override if the content clearly says otherwise.

**Defaults by task type:**

| Task type | Default category |
|---|---|
| Issue | `Fixed` |
| NewFeature | `Added` |
| Rework | `Changed` |
| Refactoring | `Internal` |
| Docs | `Internal` |
| Skill | `Internal` |
| CodeReview | `Internal` |
| Task (no prefix) | Determine from content |

**Override rules — apply when the content clearly contradicts the default:**
- A Rework that only corrects broken behavior a user experienced → `Fixed`
- A Rework that removes a feature or control → `Removed`
- Any task whose primary outcome is a speed or responsiveness improvement → `Performance`
- Any task where all changes are code-only with nothing a user can see or experience → `Internal`

**Valid values:** `Added` / `Changed` / `Fixed` / `Removed` / `Performance` / `Internal`

### 2c. Title

Extract from the first `# ` heading. Strip the leading task-type label and colon, if present.
- `# New Feature: List Panel Tabs` → title is `List Panel Tabs`
- `# TASK: Remove redundant parent prefix` → title is `Remove redundant parent prefix`
- `# Refactoring_stylecssNesting` → title is `style.css Nesting`

### 2d. Date

Use the **first available** date, in this priority order:
1. `*Implemented: ...*` under `## After Implementation`
2. `*Created: ...*` near the top of the file
3. The file system modification date

Normalize to `Month D, YYYY` (e.g. `February 23, 2026`).

### 2e. Summary (1–2 sentences)

Write a summary of what the task did. Draw from:
- `## Summary` section (if present)
- `## Why` section (if present)
- The title and `## Changes Made` / `### What changed` sections

**If category is `Internal`:** Write in plain, non-technical language. Jargon-free. Do not quote code.

**If category is user-facing (`Added`, `Changed`, `Fixed`, `Removed`, `Performance`):** Write following `CHANGELOG_rules.md` tone — plain and direct, active voice ("X now does Y"), ends with a period. This summary may be used as a CHANGELOG.md entry directly.

### 2f. Scope

List the files that were touched. Check in this order:
1. `## Agreed Scope` — extract explicit file paths
2. `## After Implementation` → `### What changed` — file names listed as headings or inline
3. `## Changes Made` — file names mentioned (old format)
4. PIR `### Files Inspected` list

Present as a flat list of file names, e.g. `style.css`, `src/orderHelper.js`.

### 2g. What changed

Extract the major change bullets. Draw from:
- `## After Implementation` → `### What changed` bullets
- `## Changes Made` bullets (old format)

Keep to 3–5 bullets max.

**If category is `Internal`:**

Rewrite in plain language if the source is too technical.

What counts as a major change (include):
- Something was added, removed, or renamed in a way that a reviewer would notice
- A behavior changed — something now works differently than before
- A name or structure was changed across multiple files (e.g. a CSS class rename)

What to skip:
- Verification or grep steps run during implementation ("confirmed X still works")
- Architecture doc updates (`ARCHITECTURE.md`, `FEATURE_MAP.md`) unless they are the primary purpose of the task
- Checklist items that describe process steps, not outcomes
- Low-level implementation details (specific line numbers, internal variable names)

**If category is user-facing (`Added`, `Changed`, `Fixed`, `Removed`, `Performance`):**

Bullets must be specific and concrete — ready to use as CHANGELOG.md draft bullets. Do not rewrite to be vague.

Include:
- Specific feature names, UI element names, and control labels as they appear in the UI
- Concrete behavior descriptions ("clicking X now does Y" not "behavior was updated")
- Anything a user would directly notice or need to adjust to

Skip the same process-only and architecture-only items as above.

### 2h. Review status

Determine from the `**Status:**` field in the task file:

| Status value | Review label |
|---|---|
| `NO_ISSUES` | `No issues found` |
| `ISSUES_FOUND`, `FINISHED`, `PENDING_HUMAN_REVIEW` | `Issues found` |
| Field absent — check for PIR `### No Issues Found` | `No issues found` |
| Field absent — check for PIR `### Findings` | `Issues found` |
| No Status field and no PIR section | `Not reviewed` |

### 2i. Fixes

Look for `## Post-Implementation Fixes`. Extract `[x]` items only (fixed ones).

For each fixed item, determine its own CHANGELOG category using the same logic as §2b — applied to the fix itself:
- A fix correcting wrong behavior a user could see or experience → `Fixed`
- A fix adding a guard for an edge case users would never encounter → `Internal`

Format each fix as:
```
<PIR title>: <what changed> — category: <Fixed / Internal / …>
```

Skip `[ ]` items (not fixed / skipped). If no `## Post-Implementation Fixes` section, or all items were `[ ]`: omit the **Fixes** field entirely.

---

## 3. Determine the changelog file

Set `CHANGELOG_FILE` to `tasks/changelogs/<changelog filename from table in §2a>`.

---

## 4. Format the changelog entry

Compose the entry block. Note: the file name link path is relative to the changelog file being written (`tasks/changelogs/`), not to this skill file.

```markdown
## <Month D, YYYY>

### <Title>

<1–2 sentence summary>

- File name: [<TARGET_TASK_FILE basename>](../main-tasks/archived-tasks/<TARGET_TASK_FILE basename>)
- Scope: [`file1.js`, `style.css`, …]
- **CHANGELOG category:** <Added / Changed / Fixed / Removed / Performance / Internal>
- **What changed:**
  - <bullet 1>
  - <bullet 2>
- **Review:** <No issues found / Issues found / Not reviewed>
- **Fixes:**
  - <PIR title>: <what changed> — category: <Fixed / Internal / …>
```

Omit the `**Fixes:**` block entirely if no fixes were applied (see §2i).

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
