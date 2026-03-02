# STEP 8 — Bulk Editor

**Status:** PENDING
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

- [ ] Create the destination folder(s) if they do not exist
- [ ] For each file in the table above, do the following atomically:
  - [ ] Write the file to its new location with its new name
  - [ ] Delete the original file
  - [ ] Update all `import` statements INSIDE the moved file to use
        the new relative paths (see import depth table below)
  - [ ] Grep the entire codebase for any file that imports from the
        old path; update each reference to the new path
- [ ] Verify: grep for all old filenames from this step; confirm
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
