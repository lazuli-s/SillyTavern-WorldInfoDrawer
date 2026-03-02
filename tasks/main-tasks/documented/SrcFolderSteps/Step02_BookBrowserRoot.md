# STEP 2 — Book Browser — Root Files

**Status:** PENDING
**Parent task:** [Refactoring_SrcFolderStructure.md](../Refactoring_SrcFolderStructure.md)
**Folder:** `src/book-browser/ (root files only)`

---

## Files to Move

| From | To |
|---|---|
| `src/listPanel.js` | `src/book-browser/book-browser.js` |
| `src/listPanel.state.js` | `src/book-browser/book-browser.state.js` |
| `src/listPanel.coreBridge.js` | `src/book-browser/book-browser.core-bridge.js` |

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

- [ ] Search `README.md` for "List Panel"; replace with "Book Browser"
- [ ] Search `style.css` for CSS classes matching the old name pattern;
      rename each class and update every file that uses those classes
- [ ] Search all JS files for `title=`, `aria-label=`, tooltip strings
      containing "List Panel"; replace with "Book Browser"
- [ ] Search all JS/HTML template literals for UI-visible labels saying
      "List Panel"; replace with "Book Browser"

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

The concept rename (List Panel → Book Browser) adds surface area beyond pure file moves — README, CSS classes, tooltip strings, and UI labels all need updating. A missed reference leaves old terminology visible to the user or causes a broken CSS class.

## Why It's Safe to Implement

No logic changes. The rename is cosmetic. Missed CSS class renames affect appearance only, not functionality. Import errors surface immediately in the browser console.
