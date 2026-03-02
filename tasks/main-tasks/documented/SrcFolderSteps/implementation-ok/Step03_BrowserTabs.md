# STEP 3 — Browser Tabs

**Status:** IMPLEMENTED
**Parent task:** [Refactoring_SrcFolderStructure.md](../Refactoring_SrcFolderStructure.md)
**Folder:** `src/book-browser/browser-tabs/`

---

## Files to Move

| From | To |
|---|---|
| `src/listPanel.filterBar.js` | `src/book-browser/browser-tabs/browser-tabs.filter-bar.js` |

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

Single file moved as-is with no code changes. The planned three-way split is deferred to Phase 3 — no splitting here. Import errors surface immediately.

## Why It's Safe to Implement

No code changes inside the file. File is moved unchanged. Filter bar behavior is completely unaffected.

---

## IMPLEMENTATION

**Status:** IMPLEMENTED

#### Implementation Notes

- What changed
  - Files changed: `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`
  - Moved `src/listPanel.filterBar.js` into `src/book-browser/browser-tabs/` and renamed it to `browser-tabs.filter-bar.js`.
  - The moved file has no internal imports, so no inside-file import rewrites were needed.
  - Updated importer path in `src/book-browser/book-browser.js` to `./browser-tabs/browser-tabs.filter-bar.js`.

- Risks / Side effects
  - If any import was missed, the extension can fail to load this module (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Reload SillyTavern and open the World Info Drawer. Success looks like: drawer opens normally and all tabs (`Visibility`, `Sorting`, `Search`) still appear.
      - **🟥 MANUAL CHECK**: [ ] In the drawer, type in search and toggle visibility filters. Success looks like: filtering still updates the book list without console import errors.
