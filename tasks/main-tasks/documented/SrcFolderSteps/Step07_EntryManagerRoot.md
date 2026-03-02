# STEP 7 — Entry Manager — Root + Logic

**Status:** PENDING
**Parent task:** [Refactoring_SrcFolderStructure.md](../Refactoring_SrcFolderStructure.md)
**Folder:** `src/entry-manager/ (root files) and src/entry-manager/logic/`

---

## Files to Move

| From | To |
|---|---|
| `src/orderHelper.js` | `src/entry-manager/entry-manager.js` |
| `src/orderHelperState.js` | `src/entry-manager/logic/logic.state.js` |
| `src/orderHelperFilters.js` | `src/entry-manager/logic/logic.filters.js` |

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

- [ ] Search `README.md` for "Order Helper"; replace with "Entry Manager"
- [ ] Search `style.css` for CSS classes matching the old name pattern;
      rename each class and update every file that uses those classes
- [ ] Search all JS files for `title=`, `aria-label=`, tooltip strings
      containing "Order Helper"; replace with "Entry Manager"
- [ ] Search all JS/HTML template literals for UI-visible labels saying
      "Order Helper"; replace with "Entry Manager"

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

## Fix Risk: Medium 🟡

The concept rename (Order Helper → Entry Manager) adds surface area — README, CSS classes, tooltip strings, and UI labels all need updating. A missed reference leaves old terminology visible to the user or causes a broken CSS class.

## Why It's Safe to Implement

No logic changes. The rename is cosmetic. Missed CSS class renames affect appearance only, not functionality. Import errors surface immediately.
