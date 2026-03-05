# REFACTORING: Split bulk-editor.action-bar.js into 3 files
*Created: March 4, 2026*

**Type:** Refactoring
**Status:** IMPLEMENTED

---

## Summary

`src/entry-manager/bulk-editor/bulk-editor.action-bar.js` is 1,447 lines long and contains
two large, unrelated public functions — `buildVisibilityRow` and `buildBulkEditRow` — plus
their private helpers all crammed into one file. This task splits the file into three
focused files so each one has a single clear job. No behavior changes.

## Current Behavior

All action-bar code lives in one file. Opening it means scrolling through 1,447 lines to find
any single function. The two exported functions have nothing in common except 2 shared helpers.

## Expected Behavior

After this change:

- `bulk-editor.action-bar.helpers.js` — contains only the helpers shared by both exported functions.
- `bulk-editor.action-bar.visibility-row.js` — contains the visibility-row-only helpers and exports `buildVisibilityRow`.
- `bulk-editor.action-bar.bulk-edit-row.js` — contains the bulk-edit-row-only helpers and exports `buildBulkEditRow`.
- The original `bulk-editor.action-bar.js` is **deleted**.
- `bulk-editor.js` imports from the two new row files directly.
- `ARCHITECTURE.md` and `FEATURE_MAP.md` are updated to reflect the 3 new files.

The extension behaves identically. Only file organization changes.

## Agreed Scope

Files to create:
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.helpers.js`
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.visibility-row.js`
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`

Files to modify:
- `src/entry-manager/bulk-editor/bulk-editor.js` — update import line
- `ARCHITECTURE.md` — replace old entry with 3 new entries
- `FEATURE_MAP.md` — update all references

Files to delete:
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`

## Out of Scope

- No logic changes of any kind.
- No renaming of existing functions.
- No changes to `bulk-editor.utils.js`.

## Implementation Plan

### Step 1 — Map helper ownership

Read `bulk-editor.action-bar.js` in full. For every private helper function (all functions
defined before `buildVisibilityRow` on line ~415), determine whether it is called from:
- `buildVisibilityRow` only
- `buildBulkEditRow` only
- both (→ goes in helpers file)

Known shared helpers (confirmed by prior refactoring notes):
- `createCollapsibleRowTitle` — called by both exported functions
- `wrapRowContent` — called by both exported functions

Everything else is expected to belong to only one exported function, but **verify before
placing**. Use the real source to confirm, do not guess.

---

### Step 2 — Create `bulk-editor.action-bar.helpers.js`

- [x] Create `src/entry-manager/bulk-editor/bulk-editor.action-bar.helpers.js`.
- [x] Copy only the helpers identified as shared (Step 1) into this file.
- [x] Add only the imports from `./bulk-editor.utils.js` and `../../shared/constants.js` that these helpers actually use.
- [x] Export each shared helper individually (named exports).

---

### Step 3 — Create `bulk-editor.action-bar.visibility-row.js`

- [x] Create `src/entry-manager/bulk-editor/bulk-editor.action-bar.visibility-row.js`.
- [x] Copy all visibility-only private helpers into this file (those that are only called from `buildVisibilityRow`).
- [x] Copy `buildVisibilityRow` into this file.
- [x] Add imports: shared helpers from `./bulk-editor.action-bar.helpers.js`, utilities from `./bulk-editor.utils.js`, constants from `../../shared/constants.js` — only what is actually used.
- [x] Export `buildVisibilityRow` as a named export.
- [x] Do not export any private helpers — they remain private to this module.

---

### Step 4 — Create `bulk-editor.action-bar.bulk-edit-row.js`

- [x] Create `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`.
- [x] Copy all bulk-edit-only private helpers into this file (those that are only called from `buildBulkEditRow`).
- [x] Copy `buildBulkEditRow` into this file.
- [x] Add imports: shared helpers from `./bulk-editor.action-bar.helpers.js`, utilities from `./bulk-editor.utils.js`, constants from `../../shared/constants.js` — only what is actually used.
- [x] Export `buildBulkEditRow` as a named export.
- [x] Do not export any private helpers — they remain private to this module.

---

### Step 5 — Update `bulk-editor.js`

- [x] Open `src/entry-manager/bulk-editor/bulk-editor.js`.
- [x] Find the import line: `import { buildVisibilityRow, buildBulkEditRow } from './bulk-editor.action-bar.js';`
- [x] Replace it with two separate import lines:
  ```js
  import { buildVisibilityRow } from './bulk-editor.action-bar.visibility-row.js';
  import { buildBulkEditRow } from './bulk-editor.action-bar.bulk-edit-row.js';
  ```
- [x] Confirm no other imports from `bulk-editor.action-bar.js` exist in this file or anywhere else in the codebase.

---

### Step 6 — Delete the original file

- [x] Confirm that `src/entry-manager/bulk-editor/bulk-editor.action-bar.js` is no longer imported anywhere (use a grep across the whole src/ directory).
- [x] Delete `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`.

---

### Step 7 — Update `ARCHITECTURE.md`

- [x] Find the table row for `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`.
- [x] Replace it with 3 rows:
  | `src/entry-manager/bulk-editor/bulk-editor.action-bar.helpers.js` | Shared DOM builder helpers used by both action-bar row modules |
  | `src/entry-manager/bulk-editor/bulk-editor.action-bar.visibility-row.js` | Visibility row: select-all, key toggle, column visibility, sort, filter chips, and entry count controls |
  | `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js` | Bulk edit row: per-field bulk edit containers (state, strategy, position, depth, outlet, order, recursion, budget, probability, sticky, cooldown, delay) and Apply All Changes |
- [x] Update the project structure tree at the top of the file to replace the single `bulk-editor.action-bar.js` entry with the 3 new files.

---

### Step 8 — Update `FEATURE_MAP.md`

- [x] Search `FEATURE_MAP.md` for every occurrence of `bulk-editor.action-bar.js`.
- [x] For each occurrence, replace with the new file name that owns that behavior:
  - Visibility row features → `bulk-editor.action-bar.visibility-row.js`
  - Bulk edit row features → `bulk-editor.action-bar.bulk-edit-row.js`
  - Any reference to dirty indicator or Apply All Changes → `bulk-editor.action-bar.bulk-edit-row.js`

---

### Step 9 — Verify

- [x] Grep `src/` for any remaining import of `bulk-editor.action-bar.js` — should return no results.
- [x] Confirm the 3 new files each contain only their expected content (no duplicate functions between them).
- [x] Confirm the `CONSTANTS` at the top of the original file (`BULK_APPLY_BATCH_SIZE`, `APPLY_DIRTY_CLASS`) are present in the file(s) that use them.

---

## After Implementation
*Implemented: March 4, 2026*

### What changed

- `src/entry-manager/bulk-editor/bulk-editor.action-bar.helpers.js`
  - Added a new shared helper module for row title creation and row content wrapping/collapse behavior.
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.visibility-row.js`
  - Moved all visibility-row-only helpers and `buildVisibilityRow` into this module.
  - Imported shared helpers from the new helpers file.
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`
  - Moved all bulk-edit-row-only helpers and `buildBulkEditRow` into this module.
  - Kept bulk-edit-only constants (`BULK_APPLY_BATCH_SIZE`, `APPLY_DIRTY_CLASS`) in this module.
- `src/entry-manager/bulk-editor/bulk-editor.js`
  - Replaced the old single action-bar import with one import per new row module.
- `ARCHITECTURE.md`
  - Replaced the old single action-bar file entry with three module entries in both the structure tree and responsibilities table.
- `FEATURE_MAP.md`
  - Repointed all action-bar feature ownership references to the new visibility-row and bulk-edit-row files.
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`
  - Deleted after confirming no imports remained.

### Risks / What might break

- This touches module imports, so Entry Manager could fail to load if any import path is wrong.
- This touches shared helper wiring, so collapse/expand behavior in Visibility or Bulk Editor rows could stop responding.
- This touches ownership boundaries in docs, so future work could target the wrong file if a mapping line was missed.

### Manual checks

- Open Entry Manager and confirm both rows render:
  - Success looks like both `Visibility` and `Bulk Editor` sections appearing normally with no console module errors.
- Click each row title chevron to collapse/expand:
  - Success looks like both rows opening and closing exactly as before.
- Use one control from each row (for example: hide keys in Visibility, and any Apply button in Bulk Editor):
  - Success looks like controls still working and updating the table as before.
- Search for `bulk-editor.action-bar.js` in `src/`, `ARCHITECTURE.md`, and `FEATURE_MAP.md`:
  - Success looks like no source/doc ownership references still pointing to the deleted file.
