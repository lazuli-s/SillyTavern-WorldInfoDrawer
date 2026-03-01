# REFACTORING: Reorganize /src Folder Structure by Feature
*Created: March 1, 2026*

**Type:** Refactoring
**Status:** DOCUMENTED

---

## Summary

The `/src` folder currently has 26 JavaScript files all at the same flat level, using
dot-notation naming (like `listPanel.booksView.js`) to hint at groupings. This task
reorganizes those files into a deep, feature-based folder structure — making the
codebase easier to navigate for both the developer and an LLM, and establishing a clean
foundation for future features.

No user-facing behavior changes. This is a pure structural reorganization.

Two feature areas are also renamed as part of this task:
- **List Panel → Book Browser** (folder: `book-browser/`)
- **Order Helper → Entry Manager** (folder: `entry-manager/`)

---

## Current Behavior

All 26 source files sit flat inside `src/`, with no subfolders. Related files are
grouped only by shared filename prefixes (e.g. `listPanel.*`, `orderHelperRender.*`).

## Expected Behavior

Files are organized into feature folders. Each file is renamed to follow the
**one-level parent prefix + dot + kebab-case** convention. Example:

> `src/listPanel.booksView.js` → `src/book-browser/book-list/book-list.books-view.js`

The full target structure is documented in the **Agreed Structure** section below.

---

## Naming Convention (agreed)

| Rule | Example |
|---|---|
| Folder names: kebab-case | `book-browser/`, `entry-manager/` |
| File names: one-level parent prefix + dot + kebab-case remainder | `book-list.books-view.js` |
| The prefix matches the **immediate parent folder name** | file in `book-list/` → prefix `book-list.` |
| Exception: files in `shared/` need no prefix (all are flat, no ambiguity) | `constants.js`, `utils.js` |

---

## Agreed Structure

### Full target state (new path ← current filename)

```
src/
  drawer.js                                          ← drawer.js  (stays at root)

  shared/
    constants.js                                     ← constants.js
    utils.js                                         ← utils.js
    settings.js                                      ← Settings.js
    sort-helpers.js                                  ← sortHelpers.js
    wi-update-handler.js                             ← wiUpdateHandler.js

  book-browser/
    book-browser.js                                  ← listPanel.js
    book-browser.state.js                            ← listPanel.state.js
    book-browser.core-bridge.js                      ← listPanel.coreBridge.js

    browser-tabs/
      browser-tabs.visibility.js                     ← listPanel.filterBar.js (split — see note)
      browser-tabs.sorting.js                        ← listPanel.filterBar.js (split — see note)
      browser-tabs.search.js                         ← listPanel.filterBar.js (split — see note)

    book-list/
      book-list.books-view.js                        ← listPanel.booksView.js
      book-list.selection-dnd.js                     ← listPanel.selectionDnD.js
      book-list.book-menu.js                         ← listPanel.bookMenu.js
      book-list.book-source-links.js                 ← bookSourceLinks.js
      book-list.world-entry.js                       ← worldEntry.js

      book-folders/
        book-folders.folders-view.js                 ← listPanel.foldersView.js
        book-folders.lorebook-folders.js             ← lorebookFolders.js

  editor-panel/
    editor-panel.js                                  ← editorPanel.js

  entry-manager/
    entry-manager.js                                 ← orderHelper.js

    logic/
      logic.state.js                                 ← orderHelperState.js
      logic.filters.js                               ← orderHelperFilters.js

    bulk-editor/
      bulk-editor.js                                 ← orderHelperRender.js
      bulk-editor.action-bar.js                      ← orderHelperRender.actionBar.js
      bulk-editor.filter-panel.js                    ← orderHelperRender.filterPanel.js
      bulk-editor.table-body.js                      ← orderHelperRender.tableBody.js
      bulk-editor.table-header.js                    ← orderHelperRender.tableHeader.js
      bulk-editor.utils.js                           ← orderHelperRender.utils.js

    manager-tabs/                                    ← FUTURE (see Out of Scope)
    visibility/                                      ← FUTURE (see Out of Scope)
```

> **filterBar.js split note:** `listPanel.filterBar.js` handles three distinct tabs:
> Visibility, Sorting, and Search. Splitting it into three files is agreed and is part
> of this task, but it requires careful reading of the file first. If the split turns
> out to be too complex to do in one pass, it may be extracted into a follow-up task.

> **drawer.js note:** During planning, a possible unused close/minimize button was
> flagged for investigation. This is unrelated to the reorganization but should be
> noted for a future cleanup pass.

---

## Future Phases (Out of Scope for this task)

| Phase | What | Why deferred |
|---|---|---|
| Phase 2 | File renaming cleanup (any remaining prefix issues) | Needs a file-by-file audit after Phase 1 is done |
| Phase 3 | Split large files into smaller focused files | Each file needs individual analysis before splitting |
| Separate feature task | Entry Manager tabs: add `manager-tabs/` with `manager-tabs.bulk-editor.js` (thin shell for current bulk-editor) and `manager-tabs.visibility.js` (new visibility tab); add `visibility/` subfolder for visibility tab render/logic | These are new feature files, not reorganization |

---

## Affected Modules

Every file in `src/` is affected. The changes break down into these categories:

1. **Moved + renamed** — 25 of the 26 files move to a new path and get a new name.
   (`drawer.js` is the only file that stays at `src/` root.)
2. **Import paths updated** — every `import` statement in every file must be updated
   to reflect the new relative paths.
3. **`index.js`** (at project root) — imports entry points from `src/`; all of those
   paths must be updated too.
4. **`ARCHITECTURE.md` and `FEATURE_MAP.md`** — all file path references must be
   updated to the new paths.
5. **`tasks/workflows/`** — workflow docs may reference old file paths; must be scanned
   and updated.
6. **`.claude/skills/`** — some skills reference specific source file paths or module
   names; must be scanned and updated.
7. **`CLAUDE.md` and `AGENTS.md`** — a migration warning note must be added so that
   future LLM sessions are not confused by old paths in changelogs, code reviews, or
   other archived task files. (Highest risk — do last.)

---

## Implementation Plan

> **Before starting:** Read every file being moved to understand its current imports.
> Do NOT move files one by one without updating imports — broken imports will prevent
> the extension from loading entirely. Move all files first, then update all imports
> in one sweep, or do both atomically per file.

### Step 1 — Create the new folder structure

Create these folders (they will be empty until files are moved in):

```
src/shared/
src/book-browser/
src/book-browser/browser-tabs/
src/book-browser/book-list/
src/book-browser/book-list/book-folders/
src/editor-panel/
src/entry-manager/
src/entry-manager/logic/
src/entry-manager/bulk-editor/
```

### Step 2 — Move and rename: shared files

| From | To |
|---|---|
| `src/constants.js` | `src/shared/constants.js` |
| `src/utils.js` | `src/shared/utils.js` |
| `src/Settings.js` | `src/shared/settings.js` |
| `src/sortHelpers.js` | `src/shared/sort-helpers.js` |
| `src/wiUpdateHandler.js` | `src/shared/wi-update-handler.js` |

### Step 3 — Move and rename: book-browser root files

| From | To |
|---|---|
| `src/listPanel.js` | `src/book-browser/book-browser.js` |
| `src/listPanel.state.js` | `src/book-browser/book-browser.state.js` |
| `src/listPanel.coreBridge.js` | `src/book-browser/book-browser.core-bridge.js` |

### Step 4 — Split and move: browser-tabs (from listPanel.filterBar.js)

Read `src/listPanel.filterBar.js` carefully. It contains three conceptual sections:

- **Visibility tab** — book visibility filter, chips, All Books / All Active presets
- **Sorting tab** — global sort select, per-book sort toggle and clear
- **Search tab** — search input, entry-text search toggle

Create three new files, each containing the logic for one tab:

| New file | Contains |
|---|---|
| `src/book-browser/browser-tabs/browser-tabs.visibility.js` | Visibility tab logic and rendering |
| `src/book-browser/browser-tabs/browser-tabs.sorting.js` | Sorting tab logic and rendering |
| `src/book-browser/browser-tabs/browser-tabs.search.js` | Search tab logic and rendering |

> If the code is too tightly coupled to split cleanly, create a single
> `browser-tabs.filter-bar.js` file instead and defer the split to Phase 3.

### Step 5 — Move and rename: book-list files

| From | To |
|---|---|
| `src/listPanel.booksView.js` | `src/book-browser/book-list/book-list.books-view.js` |
| `src/listPanel.selectionDnD.js` | `src/book-browser/book-list/book-list.selection-dnd.js` |
| `src/listPanel.bookMenu.js` | `src/book-browser/book-list/book-list.book-menu.js` |
| `src/bookSourceLinks.js` | `src/book-browser/book-list/book-list.book-source-links.js` |
| `src/worldEntry.js` | `src/book-browser/book-list/book-list.world-entry.js` |

### Step 6 — Move and rename: book-folders files

| From | To |
|---|---|
| `src/listPanel.foldersView.js` | `src/book-browser/book-list/book-folders/book-folders.folders-view.js` |
| `src/lorebookFolders.js` | `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js` |

### Step 7 — Move and rename: editor-panel

| From | To |
|---|---|
| `src/editorPanel.js` | `src/editor-panel/editor-panel.js` |

### Step 8 — Move and rename: entry-manager root + logic

| From | To |
|---|---|
| `src/orderHelper.js` | `src/entry-manager/entry-manager.js` |
| `src/orderHelperState.js` | `src/entry-manager/logic/logic.state.js` |
| `src/orderHelperFilters.js` | `src/entry-manager/logic/logic.filters.js` |

### Step 9 — Move and rename: bulk-editor (from orderHelperRender.*)

| From | To |
|---|---|
| `src/orderHelperRender.js` | `src/entry-manager/bulk-editor/bulk-editor.js` |
| `src/orderHelperRender.actionBar.js` | `src/entry-manager/bulk-editor/bulk-editor.action-bar.js` |
| `src/orderHelperRender.filterPanel.js` | `src/entry-manager/bulk-editor/bulk-editor.filter-panel.js` |
| `src/orderHelperRender.tableBody.js` | `src/entry-manager/bulk-editor/bulk-editor.table-body.js` |
| `src/orderHelperRender.tableHeader.js` | `src/entry-manager/bulk-editor/bulk-editor.table-header.js` |
| `src/orderHelperRender.utils.js` | `src/entry-manager/bulk-editor/bulk-editor.utils.js` |

### Step 10 — Update all import paths

For every file that was moved, update every `import` statement inside it. The depth
of the new path determines how many `../` levels are needed:

| File depth | Path to `src/shared/` | Path to `src/book-browser/` | Path back to `src/` |
|---|---|---|---|
| `src/shared/*.js` | `./` (same folder) | `../book-browser/` | `../` |
| `src/book-browser/*.js` | `../shared/` | `./` (same folder) | `../` |
| `src/book-browser/browser-tabs/*.js` | `../../shared/` | `../` | `../../` |
| `src/book-browser/book-list/*.js` | `../../shared/` | `../` | `../../` |
| `src/book-browser/book-list/book-folders/*.js` | `../../../shared/` | `../../` | `../../../` |
| `src/editor-panel/*.js` | `../shared/` | `../book-browser/` | `../` |
| `src/entry-manager/*.js` | `../shared/` | `../book-browser/` | `../` |
| `src/entry-manager/logic/*.js` | `../../shared/` | `../../book-browser/` | `../../` |
| `src/entry-manager/bulk-editor/*.js` | `../../shared/` | `../../book-browser/` | `../../` |

Also update `src/drawer.js` — it stays at `src/` root but imports from files that
have moved (e.g. `./listPanel.js` → `./book-browser/book-browser.js`).

### Step 11 — Update index.js

`index.js` at the project root imports from `src/`. Update every import to the new
path (e.g. `./src/listPanel.js` → `./src/book-browser/book-browser.js`).

### Step 12 — Update ARCHITECTURE.md

- Replace all file path references in the module table and project structure tree
  with the new paths.
- Update the "Order Helper" glossary entry to "Entry Manager".
- Update the "List Panel" terminology to "Book Browser".

### Step 13 — Update FEATURE_MAP.md

- Replace every `src/listPanel*.js`, `src/orderHelper*.js`, `src/editorPanel.js`,
  `src/worldEntry.js`, `src/lorebookFolders.js`, `src/bookSourceLinks.js`,
  `src/sortHelpers.js`, `src/wiUpdateHandler.js`, `src/Settings.js`,
  `src/constants.js`, and `src/utils.js` reference with the corresponding new path.

---

### Step 14 — Scan and update: tasks/workflows/

> **Risk level: Low** — documentation only, no code behavior is affected.

Open every `.md` file in `tasks/workflows/`. Search for any reference to old file
paths or old feature names:

- Old names to search for: `listPanel`, `orderHelper`, `editorPanel`, `worldEntry`,
  `lorebookFolders`, `bookSourceLinks`, `sortHelpers`, `wiUpdateHandler`, `Settings.js`,
  `filterBar`, `Order Helper`, `List Panel`
- Replace each with the corresponding new path or name from the Agreed Structure table.

If a workflow file describes a process that is now structurally different (e.g. it
mentions "open `src/listPanel.filterBar.js`"), update the description to match the
new location.

---

### Step 15 — Scan and update: .claude/skills/

> **Risk level: Medium** — skills drive LLM behavior; incorrect paths will cause future
> agents to look in the wrong place. Update carefully, one skill at a time.

Scan every `SKILL.md` file under `.claude/skills/`. Search for:

- Any hardcoded `src/` file paths (e.g. `src/listPanel.js`, `src/orderHelper*.js`)
- Any references to old feature names ("List Panel", "Order Helper", "filterBar")
- Any module ownership claims that reference old paths

Key skills likely to have file path references: `doc-guide`, `st-world-info-api`,
`file-naming`, `implement-task`, `code-review-first-review`, `post-implementation-review`.

For each match, replace the old path or name with the new one. Do not change any skill
logic — only update path strings and feature names.

---

### Step 16 — Add migration warning to CLAUDE.md and AGENTS.md

> **Risk level: Highest** — these files govern all LLM behavior on this project.
> Edit with maximum care. Add only; do not remove or reword existing instructions.

Add the following warning block to **both** `CLAUDE.md` and `AGENTS.md`, immediately
after the project description paragraph at the top of each file:

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
