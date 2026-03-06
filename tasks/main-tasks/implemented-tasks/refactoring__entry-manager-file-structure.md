# REFACTORING: Entry Manager file structure — rename and reorganize
*Created: March 5, 2026*

**Type:** Refactoring
**Status:** IMPLEMENTED

---

## Summary

The `src/entry-manager/` folder has grown unevenly. Several files in `bulk-editor-tab/` belong to the table (header, body, filter panel) but are named and placed as if they are part of the bulk editor controls. This task moves the table files into a dedicated `table/` folder, moves the shared utility file up to the entry-manager root, and renames every file so its name reflects its folder — dropping the redundant prefix that the folder already provides. No behavior changes.

## Current Behavior

Files are arranged like this:

```
src/entry-manager/
├── entry-manager.js
├── bulk-editor.action-bar.helpers.js       ← shared, but named after bulk-editor
├── logic/
│   ├── logic.state.js
│   └── logic.filters.js
├── bulk-editor-tab/
│   ├── bulk-editor.js                                          ← orchestrator
│   ├── bulk-editor.utils.js                                    ← used by ALL areas, not just this tab
│   ├── bulk-editor.action-bar.bulk-edit-row.js
│   ├── bulk-editor.action-bar.bulk-edit-row.helpers.js
│   ├── bulk-editor.action-bar.bulk-edit-row.sections.js
│   ├── bulk-editor.action-bar.bulk-edit-row.position.js
│   ├── bulk-editor.action-bar.bulk-edit-row.order.js
│   ├── bulk-editor.filter-panel.js                             ← table-related
│   ├── bulk-editor.table-header.js                             ← table-related
│   └── bulk-editor.table-body.js                               ← table-related
└── display-tab/
    └── bulk-editor.action-bar.visibility-row.js
```

## Expected Behavior

After the refactoring:

```
src/entry-manager/
├── entry-manager.js
├── action-bar.helpers.js       ← renamed (dropped bulk-editor prefix)
├── utils.js                    ← moved from bulk-editor-tab/ (used by all areas)
├── logic/
│   ├── logic.state.js
│   └── logic.filters.js
├── bulk-editor-tab/
│   ├── bulk-editor-tab.js      ← renamed to match folder
│   ├── bulk-edit-row.js        ← renamed (dropped action-bar prefix)
│   ├── bulk-edit-row.helpers.js
│   ├── bulk-edit-row.sections.js
│   ├── bulk-edit-row.position.js
│   └── bulk-edit-row.order.js
├── display-tab/
│   └── visibility-row.js       ← renamed (dropped bulk-editor.action-bar prefix)
└── table/                      ← new folder
    ├── table-header.js         ← moved + renamed
    ├── table-body.js           ← moved + renamed
    └── filter-panel.js         ← moved + renamed
```

## Agreed Scope

All changes are inside `src/entry-manager/`. The only external file affected is `src/drawer.js`, which imports `entry-manager.js` — and `entry-manager.js` is not being renamed, so `drawer.js` requires no changes.

Modules affected:
- All 12 files listed in the rename table below
- `src/entry-manager/entry-manager.js` — one import path update
- `ARCHITECTURE.md` — file map section updated
- `FEATURE_MAP.md` — all entry-manager paths updated (including fixing several stale `bulk-editor/` paths that should already be `bulk-editor-tab/`)

## Out of Scope

- No logic changes of any kind
- No CSS changes
- No changes outside `src/entry-manager/`
- `src/drawer.js` requires no changes (its import target `entry-manager.js` is unchanged)

## Implementation Plan

### Rename table

| Old path (relative to `src/entry-manager/`) | New path | Operation |
|---|---|---|
| `bulk-editor.action-bar.helpers.js` | `action-bar.helpers.js` | rename in root |
| `bulk-editor-tab/bulk-editor.utils.js` | `utils.js` | move to root |
| `bulk-editor-tab/bulk-editor.js` | `bulk-editor-tab/bulk-editor-tab.js` | rename |
| `bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.js` | `bulk-editor-tab/bulk-edit-row.js` | rename |
| `bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.helpers.js` | `bulk-editor-tab/bulk-edit-row.helpers.js` | rename |
| `bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.sections.js` | `bulk-editor-tab/bulk-edit-row.sections.js` | rename |
| `bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.position.js` | `bulk-editor-tab/bulk-edit-row.position.js` | rename |
| `bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.order.js` | `bulk-editor-tab/bulk-edit-row.order.js` | rename |
| `display-tab/bulk-editor.action-bar.visibility-row.js` | `display-tab/visibility-row.js` | rename |
| `bulk-editor-tab/bulk-editor.table-header.js` | `table/table-header.js` | move + rename |
| `bulk-editor-tab/bulk-editor.table-body.js` | `table/table-body.js` | move + rename |
| `bulk-editor-tab/bulk-editor.filter-panel.js` | `table/filter-panel.js` | move + rename |

### Steps

- [x] Use `git mv` to rename/move each file per the table above (12 operations). Create the `src/entry-manager/table/` directory as part of the first `git mv` into it.

- [x] In `src/entry-manager/utils.js` (was `bulk-editor-tab/bulk-editor.utils.js`): no import path changes needed inside this file itself — verify its imports (if any) are still correct after the move.

- [x] In `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js` (was `bulk-editor.js`): update all internal imports:
  - `'../display-tab/bulk-editor.action-bar.visibility-row.js'` → `'../display-tab/visibility-row.js'`
  - `'./bulk-editor.action-bar.bulk-edit-row.js'` → `'./bulk-edit-row.js'`
  - `'./bulk-editor.filter-panel.js'` → `'../table/filter-panel.js'`
  - `'./bulk-editor.table-header.js'` → `'../table/table-header.js'`
  - `'./bulk-editor.table-body.js'` → `'../table/table-body.js'`

- [x] In `src/entry-manager/bulk-editor-tab/bulk-edit-row.js` (was `bulk-editor.action-bar.bulk-edit-row.js`): update imports:
  - `'../bulk-editor.action-bar.helpers.js'` → `'../action-bar.helpers.js'`
  - `'./bulk-editor.action-bar.bulk-edit-row.helpers.js'` → `'./bulk-edit-row.helpers.js'`
  - `'./bulk-editor.action-bar.bulk-edit-row.sections.js'` → `'./bulk-edit-row.sections.js'`
  - `'./bulk-editor.action-bar.bulk-edit-row.position.js'` → `'./bulk-edit-row.position.js'`
  - `'./bulk-editor.action-bar.bulk-edit-row.order.js'` → `'./bulk-edit-row.order.js'`

- [x] In `src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js`: update imports:
  - `'./bulk-editor.utils.js'` → `'../utils.js'`

- [x] In `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`: update imports:
  - `'./bulk-editor.utils.js'` → `'../utils.js'`
  - `'./bulk-editor.action-bar.bulk-edit-row.helpers.js'` → `'./bulk-edit-row.helpers.js'`

- [x] In `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`: update imports:
  - `'./bulk-editor.utils.js'` → `'../utils.js'`
  - `'./bulk-editor.action-bar.bulk-edit-row.helpers.js'` → `'./bulk-edit-row.helpers.js'`

- [x] In `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`: update imports:
  - `'./bulk-editor.utils.js'` → `'../utils.js'`
  - `'./bulk-editor.action-bar.bulk-edit-row.helpers.js'` → `'./bulk-edit-row.helpers.js'`

- [x] In `src/entry-manager/display-tab/visibility-row.js` (was `bulk-editor.action-bar.visibility-row.js`): update imports:
  - `'../bulk-editor.action-bar.helpers.js'` → `'../action-bar.helpers.js'`
  - `'../bulk-editor-tab/bulk-editor.utils.js'` → `'../utils.js'`

- [x] In `src/entry-manager/table/table-header.js` (moved from `bulk-editor-tab/`): update imports:
  - `'./bulk-editor.utils.js'` → `'../utils.js'`
  - Verify `'../../shared/constants.js'` still resolves correctly from the new `table/` folder depth (it should — same level as `bulk-editor-tab/`).

- [x] In `src/entry-manager/table/table-body.js` (moved from `bulk-editor-tab/`): update imports:
  - `'./bulk-editor.utils.js'` → `'../utils.js'`
  - Verify `'../../shared/constants.js'` still resolves correctly.

- [x] In `src/entry-manager/table/filter-panel.js` (moved from `bulk-editor-tab/`): read all imports and update any `./bulk-editor.*` references to their new paths.

- [x] In `src/entry-manager/entry-manager.js`: update import:
  - `'./bulk-editor-tab/bulk-editor.js'` → `'./bulk-editor-tab/bulk-editor-tab.js'`

- [x] Update `ARCHITECTURE.md` — replace the entire `entry-manager/` subtree in the project structure diagram and the Module Responsibilities table to reflect the new paths and folder layout.

- [x] Update `FEATURE_MAP.md` — replace all `src/entry-manager/` paths throughout the file. Also fix the several stale references that still use the old `bulk-editor/` folder name (missing the `-tab` suffix), which appear on lines referencing `bulk-editor/bulk-editor.js`, `bulk-editor/bulk-editor.table-body.js`, and `bulk-editor/bulk-editor.utils.js`.

---

## After Implementation
*Implemented: March 6, 2026*

### What changed

- `src/entry-manager/` file layout was reorganized so shared helpers now live at the entry-manager root, table files live under `table/`, and renamed files now match the folders they sit in.
- `src/entry-manager/entry-manager.js` and the renamed Entry Manager files had their import paths updated so they still connect to the same logic after the move.
- `ARCHITECTURE.md` and `FEATURE_MAP.md` were updated so the project maps point at the new file names and no longer mention the stale `bulk-editor/` paths.

### Risks / What might break

- This touches import paths, so the Entry Manager could fail to open if one old file name was missed.
- This changes only file locations, but if another part of the extension still points at the old names it could break the table, filter panel, or bulk edit row.
- The repository already had older deleted/untracked entry-manager paths in Git status, so future cleanup work should make sure those older leftovers are intentional.

### Manual checks

- Reload the browser tab, open the drawer, and open Entry Manager. Success looks like the panel opening normally with no missing-screen or blank-area errors.
- Switch between `Display` and `Bulk Editor`. Success looks like both tabs rendering their controls exactly as before.
- In Entry Manager, confirm the filter panel, column filters, and row table all appear and respond. Success looks like filtering and row display still working after the rename.
