# STEP 4 — Book List

**Status:** IMPLEMENTED
**Parent task:** [Refactoring_SrcFolderStructure.md](../Refactoring_SrcFolderStructure.md)
**Folder:** `src/book-browser/book-list/`

---

## Files to Move

| From | To |
|---|---|
| `src/listPanel.booksView.js` | `src/book-browser/book-list/book-list.books-view.js` |
| `src/listPanel.selectionDnD.js` | `src/book-browser/book-list/book-list.selection-dnd.js` |
| `src/listPanel.bookMenu.js` | `src/book-browser/book-list/book-list.book-menu.js` |
| `src/bookSourceLinks.js` | `src/book-browser/book-list/book-list.book-source-links.js` |
| `src/worldEntry.js` | `src/book-browser/book-list/book-list.world-entry.js` |

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

Five pure file moves with no logic changes. The most likely error is a missed import reference, which shows up immediately as a named browser console error.

## Why It's Safe to Implement

No behavior changes. No UI changes. Only file locations and import strings change.

---

## After Implementation
*Implemented: March 2, 2026*

### What changed

- `src/book-browser/book-list/book-list.books-view.js`
- Moved from `src/listPanel.booksView.js`.
- Updated its internal import to point to the new `src/shared/` path.

- `src/book-browser/book-list/book-list.selection-dnd.js`
- Moved from `src/listPanel.selectionDnD.js`.
- Updated its internal import to point to `book-browser.state.js` from the new folder depth.

- `src/book-browser/book-list/book-list.book-menu.js`
- Moved from `src/listPanel.bookMenu.js`.
- No logic changes; location and filename only.

- `src/book-browser/book-list/book-list.book-source-links.js`
- Moved from `src/bookSourceLinks.js`.
- Updated direct SillyTavern import paths to account for the deeper folder.
- Corrected import depth to `../../../../../../` so runtime resolves to `/scripts/utils.js` and `/scripts/world-info.js` (not `/scripts/extensions/...`).

- `src/book-browser/book-list/book-list.world-entry.js`
- Moved from `src/worldEntry.js`.
- No logic changes; location and filename only.

- `src/book-browser/book-browser.js`
- Updated imports to use the new `book-list/*` files.

- `src/drawer.js`
- Updated the world-entry import to the new book-list location.

- `src/shared/wi-update-handler.js`
- Updated the world-entry import to the new book-list location.

- `index.js`
- Updated the book-source-links import to the new book-list location.

### Risks / What might break

- This touches module import paths, so any missed path could stop the extension from loading in the browser.
- This touches book-list and entry rendering imports, so if one path is wrong, books or entries might not render.
- This touches the source-link module path, so source icons on book rows could fail to update if the import breaks.

### Manual checks

- Reload SillyTavern and open World Info Drawer. Success: the drawer opens with no console import/module errors.
- Confirm the book list appears and entry rows still render. Success: books and entries show normally and can be clicked.
- Confirm source-link icons still update when switching character/chat/persona context. Success: the icons on book rows update as expected.
