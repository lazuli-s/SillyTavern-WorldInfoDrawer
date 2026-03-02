# Workflow: Src Folder Structure Refactoring

**Last updated:** 2026-03-01
**Purpose:** End-to-end guide for reorganizing the flat `src/` folder into a feature-based subfolder structure, with concept renames (List Panel → Book Browser, Order Helper → Entry Manager). Covers creating per-step plan files, implementing them one at a time, updating documentation, and adding a migration warning.
**Audience:** Human reference + agent orientation.
**Parent task:** [Refactoring_SrcFolderStructure.md](../main-tasks/documented/Refactoring_SrcFolderStructure.md)

---

## 1. Quick Reference Table

| # | Phase | How | Output location | Test ST? |
| --- | --- | --- | --- | --- |
| 1 | Create step files | LLM prompt | `SrcFolderSteps/Step0N_*.md` | No |
| 2 | Implement step files | LLM prompt (one file at a time) | Updated `src/` files + step file status | Yes — after each step |
| 3 | Update documentation | LLM prompt | `ARCHITECTURE.md`, `FEATURE_MAP.md`, `tasks/workflows/`, `.claude/skills/` | No |
| 4 | Add migration warning | LLM prompt | `CLAUDE.md`, `AGENTS.md` | No |

---

## 2. Pipeline Flow Diagram

```text
┌─────────────────────────────────────────────────────┐
│         SRC FOLDER STRUCTURE REFACTORING            │
└─────────────────────────────────────────────────────┘

  PHASE 1 ── Create Step Files
  ┌────────────────────────────────────────────────────┐
  │  LLM reads Refactoring_SrcFolderStructure.md       │
  │  Creates one step file per folder:                 │
  │    Step01_SharedFolder.md                          │
  │    Step02_BookBrowserRoot.md                       │
  │    Step03_BrowserTabs.md                           │
  │    Step04_BookList.md                              │
  │    Step05_BookFolders.md                           │
  │    Step06_EditorPanel.md                           │
  │    Step07_EntryManagerRoot.md                      │
  │    Step08_BulkEditor.md                            │
  │    Step09_FinalSweep.md                            │
  │  Output → SrcFolderSteps/ (all Status: PENDING)   │
  └──────────────────────┬─────────────────────────────┘
                         │
  PHASE 2 ── Implement Step Files  (one at a time)
  ┌──────────────────────▼─────────────────────────────┐
  │  Pick first PENDING step file                      │
  │  Read source files to be moved                     │
  │  Move + rename each file                           │
  │  Fix imports inside each moved file                │
  │  Fix all external references to old paths          │
  │  *(for Step02 + Step07)* Fix rename-specific items │
  │    → README.md, CSS classes, tooltips, UI labels   │
  │  Write Implementation Notes into step file         │
  │  Mark step file Status: IMPLEMENTED                │
  │  Reload ST browser tab                             │
  └──────┬───────────────────────────┬─────────────────┘
         │ ST loads correctly        │ ST broke
         │                           ▼
         │                    Stop + investigate
         │                    (do not continue)
         │
         └─── repeat for next PENDING step ──► (loop)
                         │
                (all 9 steps IMPLEMENTED)
                         │
  PHASE 3 ── Update Documentation
  ┌──────────────────────▼─────────────────────────────┐
  │  Update ARCHITECTURE.md — all file path refs       │
  │  Update FEATURE_MAP.md  — all file path refs       │
  │  Scan tasks/workflows/  — update old path strings  │
  │  Scan .claude/skills/   — update old path strings  │
  └──────────────────────┬─────────────────────────────┘
                         │
  PHASE 4 ── Add Migration Warning
  ┌──────────────────────▼─────────────────────────────┐
  │  Add migration warning block to CLAUDE.md          │
  │  Add same warning block to AGENTS.md               │
  │  Done — refactoring complete                       │
  └────────────────────────────────────────────────────┘
```

---

## 3. Step File Inventory

The 9 step files Phase 1 must create, in implementation order:

| File | Folder covered | Concept rename? | Files moved |
| --- | --- | --- | --- |
| `Step01_SharedFolder.md` | `src/shared/` | No | 5 |
| `Step02_BookBrowserRoot.md` | `src/book-browser/` (root only) | **Yes — List Panel → Book Browser** | 3 |
| `Step03_BrowserTabs.md` | `src/book-browser/browser-tabs/` | No | 1 (no split — see note) |
| `Step04_BookList.md` | `src/book-browser/book-list/` | No | 5 |
| `Step05_BookFolders.md` | `src/book-browser/book-list/book-folders/` | No | 2 |
| `Step06_EditorPanel.md` | `src/editor-panel/` | No | 1 |
| `Step07_EntryManagerRoot.md` | `src/entry-manager/` root + `logic/` | **Yes — Order Helper → Entry Manager** | 3 |
| `Step08_BulkEditor.md` | `src/entry-manager/bulk-editor/` | No | 6 |
| `Step09_FinalSweep.md` | Cross-cutting | No | 0 moved — scan only |

> **filterBar.js note (Step03):** `listPanel.filterBar.js` was planned to split into
> three separate files. **The split is deferred to Phase 3 of the overall refactoring
> project.** In this task, move the file as-is and rename it to
> `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`. No code splitting.

---

## 4. Phase Cards

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 1  │  Create Step Files                          │
├──────────────────────────────────────────────────────────┤
│  Trigger  │  User says "create the step files"          │
│  How      │  LLM reads Refactoring_SrcFolderStructure   │
│           │  .md and generates one step file per row    │
│           │  in the Step File Inventory table above     │
│  Input    │  Refactoring_SrcFolderStructure.md          │
│  Output   │  9 step files in SrcFolderSteps/            │
│  Status   │  All files start as Status: PENDING         │
│  Test?    │  No                                         │
└──────────────────────────────────────────────────────────┘
```

**What the LLM does in Phase 1:**

1. Read `tasks/main-tasks/documented/Refactoring_SrcFolderStructure.md` in full.
2. Create the folder `tasks/main-tasks/documented/SrcFolderSteps/` if it does not exist.
3. For each of the 9 step files in the inventory table, create one `.md` file using the **step file template** below. Do not skip, combine, or reorder steps.
4. Populate each checklist from the agreed structure in the parent task doc — exact old filenames, exact new filenames, exact new paths.
5. For Step02 and Step07 (concept renames), add the rename-specific checklist items.

**Step file template** (fill in `[N]`, `[Name]`, `[folder]` and the file table):

```markdown
# STEP [N] — [Name]

**Status:** PENDING
**Parent task:** [Refactoring_SrcFolderStructure.md](../Refactoring_SrcFolderStructure.md)
**Folder:** `src/[folder-path]/`

---

## Files to Move

| From | To |
|---|---|
| `src/old-name.js` | `src/new-path/new-name.js` |

---

## Implementation Checklist

- [ ] Create the destination folder if it does not exist
- [ ] For each file in the table above, do the following atomically:
  - [ ] Copy the file to its new location with its new name
  - [ ] Delete the original file
  - [ ] Update all `import` statements INSIDE the moved file to use the new
        relative paths (account for deeper nesting — add `../` as needed)
  - [ ] Search the entire codebase for any file that imports the old path;
        update each reference to the new path
- [ ] Verify: no file in the project still imports from any old path moved in this step

[RENAME-SPECIFIC ITEMS — include only for Step02 and Step07:]

- [ ] Search `README.md` for the old concept name; replace with the new name
- [ ] Search `style.css` for CSS class names matching the old name pattern
      (e.g. `.listPanel-*`, `.orderHelper-*`); rename each class and update
      every file that uses those class names
- [ ] Search all JS files for tooltip strings, `title=`, `aria-label=`, or
      `aria-labelledby=` text containing the old name; update to the new name
- [ ] Search all JS/HTML template literals for any UI-visible label that says
      the old concept name (e.g. "List Panel", "Order Helper"); replace with
      the new name

---

## Fix Risk: [Low 🟢 / Medium 🟡 / High 🔴]

[Justify: what could go wrong, what behavior might change, any risky side-effects.]

## Why It's Safe to Implement

[Name the specific behaviors, paths, or findings this fix does not affect.]
```

**Implementation output template** (appended to the step file after implementing):

```markdown
---

## IMPLEMENTATION

**Status:** IMPLEMENTED

#### Implementation Notes

- What changed
  - Files changed: `src/new-path/new-name.js`
  - <1-line description of change>
  - <1-line description of change>

- Risks / Side effects
  - <Short description of side effect> (probability: ⭕ / ❗ / ❗❗❗)
      - **🟥 MANUAL CHECK**: [ ] <Concrete user action. Include what success looks like.>
```

> Omit the `Risks / Side effects` block entirely if there are no plausible side effects.

---

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 2  │  Implement Step Files                       │
├──────────────────────────────────────────────────────────┤
│  Trigger  │  User says "implement the next step" or     │
│           │  "implement Step0N"                         │
│  How      │  LLM reads step file, reads source files,  │
│           │  moves + renames + fixes imports, then      │
│           │  writes Implementation Notes into step file │
│  Input    │  One step file (Status: PENDING)            │
│  Output   │  Updated src/ files + step file marked     │
│           │  Status: IMPLEMENTED                        │
│  Test?    │  Yes — reload ST browser tab after each     │
└──────────────────────────────────────────────────────────┘
```

**What the LLM does in Phase 2 (per step):**

1. Read the next PENDING step file from `SrcFolderSteps/`.
2. Mark the step file `Status: IN PROGRESS`.
3. Read every source file listed in the "Files to Move" table.
4. For each file, atomically:
   a. Write the file to the new path with the new name.
   b. Delete the original file (via Bash `rm`).
   c. Update all `import` statements inside the file to use new relative paths.
   d. Grep the codebase for all files importing from the old path. Update each.
5. For Step02 (Book Browser rename) and Step07 (Entry Manager rename): work through all rename-specific checklist items after the file moves are complete.
6. Verify: grep for any remaining old-path import strings. Fix any found.
7. Append the `## IMPLEMENTATION` block to the step file using the output template above.
8. Update the step file `Status: IMPLEMENTED`.
9. Stop and wait for the user to reload ST and confirm it loads before starting the next step.

> **Critical rule:** Never implement more than one step file per session without user
> confirmation that ST still loads correctly. A broken import will prevent the entire
> extension from loading. One step at a time.

> **Import depth reference** (from parent task doc):
>
> | File depth | `../` to `src/shared/` | `../` to `src/book-browser/` |
> |---|---|---|
> | `src/shared/*.js` | `./` | `../book-browser/` |
> | `src/book-browser/*.js` | `../shared/` | `./` |
> | `src/book-browser/browser-tabs/*.js` | `../../shared/` | `../` |
> | `src/book-browser/book-list/*.js` | `../../shared/` | `../` |
> | `src/book-browser/book-list/book-folders/*.js` | `../../../shared/` | `../../` |
> | `src/editor-panel/*.js` | `../shared/` | `../book-browser/` |
> | `src/entry-manager/*.js` | `../shared/` | `../book-browser/` |
> | `src/entry-manager/logic/*.js` | `../../shared/` | `../../book-browser/` |
> | `src/entry-manager/bulk-editor/*.js` | `../../shared/` | `../../book-browser/` |

---

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 3  │  Update Documentation                       │
├──────────────────────────────────────────────────────────┤
│  Trigger  │  All 9 step files show Status: IMPLEMENTED  │
│  How      │  LLM scans and updates each doc file in     │
│           │  turn — one file at a time                  │
│  Input    │  ARCHITECTURE.md, FEATURE_MAP.md,           │
│           │  tasks/workflows/*.md, .claude/skills/**    │
│  Output   │  Updated docs with new paths and names      │
│  Test?    │  No                                         │
└──────────────────────────────────────────────────────────┘
```

**What the LLM does in Phase 3:**

1. **ARCHITECTURE.md** — Replace all file path references with new paths. Rename terminology: "List Panel" → "Book Browser", "Order Helper" → "Entry Manager".
2. **FEATURE_MAP.md** — Replace every old `src/listPanel*.js`, `src/orderHelper*.js`, `src/editorPanel.js`, `src/worldEntry.js`, `src/lorebookFolders.js`, `src/bookSourceLinks.js`, `src/sortHelpers.js`, `src/wiUpdateHandler.js`, `src/Settings.js`, `src/constants.js`, `src/utils.js` path with the new path from the agreed structure.
3. **tasks/workflows/*.md** — Grep each file for old path strings and old feature names. Update any found references.
4. **.claude/skills/** — Grep every `SKILL.md` for hardcoded `src/` file paths or old feature names. Update only path strings and names; do not change skill logic. Key skills likely to have references: `doc-guide`, `st-world-info-api`, `file-naming`, `implement-task`, `code-review-first-review`, `post-implementation-review`.

> **Tip:** Work through the files in the order listed above. Committing after each file makes it easy to revert if something is wrong.

---

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE 4  │  Add Migration Warning                      │
├──────────────────────────────────────────────────────────┤
│  Trigger  │  Phase 3 complete                           │
│  How      │  LLM edits CLAUDE.md and AGENTS.md          │
│  Input    │  CLAUDE.md, AGENTS.md                       │
│  Output   │  Both files with warning block at top       │
│  Test?    │  No                                         │
└──────────────────────────────────────────────────────────┘
```

**What the LLM does in Phase 4:**

Add the following warning block to **both** `CLAUDE.md` and `AGENTS.md`, immediately after the project description paragraph at the top of each file. Add only — do not remove or reword existing instructions.

```markdown
> **⚠ Recent structural change (March 2026):** The `/src` folder was reorganized into
> feature subfolders. Old flat paths like `src/listPanel.js` or `src/orderHelper*.js`
> no longer exist. If you encounter those paths in changelogs, code review files, or
> archived task files, they are pre-reorganization artifacts — do not treat them as
> current file locations.
>
> Key renames:
> - List Panel → Book Browser (`src/book-browser/`)
> - Order Helper → Entry Manager (`src/entry-manager/`)
> - `listPanel.*` files → `src/book-browser/**`
> - `orderHelper*` files → `src/entry-manager/**`
> - `editorPanel.js` → `src/editor-panel/editor-panel.js`
> - `worldEntry.js` → `src/book-browser/book-list/book-list.world-entry.js`
> - `lorebookFolders.js` → `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js`
>
> See `ARCHITECTURE.md` for the current authoritative file map.
```

---

## 5. Edge Cases

### Resuming mid-cycle

If a session ends before the workflow is finished, use the step file statuses to find where to resume:

| Step file status | Resume action |
| --- | --- |
| All files PENDING | Phase 1 was not started — begin Phase 1 |
| Some PENDING, some IMPLEMENTED | Continue Phase 2 — pick first PENDING step file |
| One file IN PROGRESS | That session ended mid-step. Read the step file and source files carefully. Determine what was already done (check if new file exists, check if old file is gone, check imports). Redo any incomplete sub-tasks, then mark IMPLEMENTED. |
| All 9 IMPLEMENTED, docs not updated | Begin Phase 3 |
| All 9 IMPLEMENTED, docs updated | Begin Phase 4 |
| All done | Workflow complete |

### Broken import after a step

If ST fails to load after a step is marked IMPLEMENTED:

1. Do not start the next step.
2. Open the browser developer console (F12 → Console tab).
3. Read the error. It will name the file with the broken import and the path it cannot find.
4. Fix the specific broken import path in that file.
5. Reload ST and confirm it loads before continuing.

### Partial move (crash or interruption mid-step)

If the LLM was in the middle of moving files and something went wrong:

1. Check which files exist at the new path and which still exist at the old path.
2. For any file that exists at both paths: the new copy is authoritative — delete the old one.
3. For any file that only exists at the old path: the move was not done — complete it.
4. For any file that only exists at the new path: move was done — verify imports are updated.
5. Run a grep for any remaining old-path import strings before marking the step IMPLEMENTED.

### Phase 3: skill files with no path references

If a skill file in `.claude/skills/` has no old path strings, no update is needed — skip it and move on.

### Phase 4 edit conflicts

If `CLAUDE.md` or `AGENTS.md` already has a migration warning block (from a previous partial run), do not add a second one. Read the existing block and verify it matches the template exactly; update it if it is incomplete.
