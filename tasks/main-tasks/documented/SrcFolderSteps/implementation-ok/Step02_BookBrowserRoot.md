# STEP 2 — Book Browser — Root Files

**Status:** IMPLEMENTED
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

- [x] Search `README.md` for "List Panel"; replace with "Book Browser"
- [x] Search `style.css` for CSS classes matching the old name pattern;
      rename each class and update every file that uses those classes
- [x] Search all JS files for `title=`, `aria-label=`, tooltip strings
      containing "List Panel"; replace with "Book Browser"
- [x] Search all JS/HTML template literals for UI-visible labels saying
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

---

## IMPLEMENTATION

**Status:** IMPLEMENTED

#### Implementation Notes

- What changed
  - Files changed: `src/book-browser/book-browser.js`
  - Moved from `src/listPanel.js` and updated all relative imports for its new folder depth.
  - Renamed exported init function to `initBookBrowser` and updated its call site.
  - Files changed: `src/book-browser/book-browser.state.js`
  - Moved from `src/listPanel.state.js`.
  - Files changed: `src/book-browser/book-browser.core-bridge.js`
  - Moved from `src/listPanel.coreBridge.js`.
  - Files changed: `src/drawer.js`, `src/shared/wi-update-handler.js`, `src/listPanel.foldersView.js`, `src/listPanel.selectionDnD.js`, `index.js`
  - Updated imports to point at the new `src/book-browser/*` paths.
  - Files changed: `style.css`, `src/drawer.js`, `src/orderHelperRender.tableBody.js`
  - Replaced user-facing "List Panel" wording with "Book Browser".
  - Searched `README.md` and found no "List Panel" text to rename.
  - Searched `style.css` for `listPanel`/`list-panel` class patterns and found no matching CSS class names to rename.

- Risks / Side effects
  - Import path updates in root modules can break extension loading if any path was missed. (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] Reload SillyTavern and confirm the extension loads with no import errors in the browser console.
  - Terminology updates changed tooltip/comment strings in touched files. (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Hover the global sorting dropdown in the drawer and confirm the tooltip says "book browser".
