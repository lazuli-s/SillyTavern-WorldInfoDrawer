# STEP 8 — Bulk Editor

**Status:** IMPLEMENTED
**Parent task:** [Refactoring_SrcFolderStructure.md](../Refactoring_SrcFolderStructure.md)
**Folder:** `src/entry-manager/bulk-editor/`

---

## Files to Move

| From | To |
|---|---|
| `src/orderHelperRender.js` | `src/entry-manager/bulk-editor/bulk-editor.js` |
| `src/orderHelperRender.actionBar.js` | `src/entry-manager/bulk-editor/bulk-editor.action-bar.js` |
| `src/orderHelperRender.filterPanel.js` | `src/entry-manager/bulk-editor/bulk-editor.filter-panel.js` |
| `src/orderHelperRender.tableBody.js` | `src/entry-manager/bulk-editor/bulk-editor.table-body.js` |
| `src/orderHelperRender.tableHeader.js` | `src/entry-manager/bulk-editor/bulk-editor.table-header.js` |
| `src/orderHelperRender.utils.js` | `src/entry-manager/bulk-editor/bulk-editor.utils.js` |

---

## Implementation Checklist

- [x] Create the destination folder(s) if they do not exist
- [x] For each file in the table above, do the following atomically:
  - [x] Write the file to its new location with its new name
  - [x] Delete the original file
  - [x] Update all `import` statements INSIDE the moved file to use
        the new relative paths (see import depth table below)
  - [x] Grep the entire codebase for any file that imports from the
        old path; update each reference to the new path
- [x] Verify: grep for all old filenames from this step; confirm
      no file still imports from any of those old paths

---

## Import depth reference

| File location | Path to `src/shared/` | Path to `src/book-browser/` |
|---|---|---|
| `src/shared/*.js` | `./` | `../book-browser/` |
| `src/book-browser/*.js` | `../shared/` | `./` |
| `src/book-browser/browser-tabs/*.js` | `../../shared/` | `../` |
| `src/book-browser/book-list/*.js` | `../../shared/` | `../` |
| `src/book-browser/book-list/book-folders/*.js` | `../../../shared/` | `../../` |
| `src/editor-panel/*.js` | `../shared/` | `../book-browser/` |
| `src/entry-manager/*.js` | `../shared/` | `../book-browser/` |
| `src/entry-manager/logic/*.js` | `../../shared/` | `../../book-browser/` |
| `src/entry-manager/bulk-editor/*.js` | `../../shared/` | `../../book-browser/` |

---

## Fix Risk: Low 🟢

Six pure file moves with no logic changes. The only risk is a missed import reference, which surfaces immediately as a named browser console error.

## Why It's Safe to Implement

No logic changes. Bulk editor behavior is completely unchanged.

---

## IMPLEMENTATION

**Status:** IMPLEMENTED

#### Implementation Notes

- What changed
  - Files changed: `src/entry-manager/bulk-editor/bulk-editor.js`
  - Files changed: `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`
  - Files changed: `src/entry-manager/bulk-editor/bulk-editor.filter-panel.js`
  - Files changed: `src/entry-manager/bulk-editor/bulk-editor.table-body.js`
  - Files changed: `src/entry-manager/bulk-editor/bulk-editor.table-header.js`
  - Files changed: `src/entry-manager/bulk-editor/bulk-editor.utils.js`
  - Files changed: `src/entry-manager/entry-manager.js`
  - Moved/renamed all 6 `orderHelperRender*` files into `src/entry-manager/bulk-editor/` using the new bulk-editor filenames.
  - Updated internal imports in moved files (`bulk-editor.js`, `bulk-editor.action-bar.js`, `bulk-editor.table-body.js`, `bulk-editor.table-header.js`) to point to new sibling files and to `../../shared/constants.js`.
  - Updated external reference in `src/entry-manager/entry-manager.js` from `../orderHelperRender.js` to `./bulk-editor/bulk-editor.js`.
  - Verified via grep that no runtime JS import still references `orderHelperRender.js`, `orderHelperRender.actionBar.js`, `orderHelperRender.filterPanel.js`, `orderHelperRender.tableBody.js`, `orderHelperRender.tableHeader.js`, or `orderHelperRender.utils.js`.

- Risks / Side effects
  - Missed runtime import path could still break module loading if an unscanned import exists outside current JS paths (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Reload SillyTavern and open Entry Manager; success = drawer loads and the bulk editor table renders without console import errors.
