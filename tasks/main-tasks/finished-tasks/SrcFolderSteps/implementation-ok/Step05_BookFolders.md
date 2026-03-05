# STEP 5 — Book Folders

**Status:** IMPLEMENTED
**Parent task:** [Refactoring_SrcFolderStructure.md](../Refactoring_SrcFolderStructure.md)
**Folder:** `src/book-browser/book-list/book-folders/`

---

## Files to Move

| From | To |
|---|---|
| `src/listPanel.foldersView.js` | `src/book-browser/book-list/book-folders/book-folders.folders-view.js` |
| `src/lorebookFolders.js` | `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js` |

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

Two files are moved to a deeper nesting level. The main risk is an off-by-one `../` in import paths; a browser console error will identify any such mistake immediately.


## Why It's Safe to Implement

No logic changes. Folder feature behavior is completely unchanged.

---

## IMPLEMENTATION

**Status:** IMPLEMENTED

#### Implementation Notes

- What changed
  - `listPanel.foldersView.js` moved and renamed to `book-folders.folders-view.js` in `src/book-browser/book-list/book-folders/`
  - `lorebookFolders.js` moved and renamed to `book-folders.lorebook-folders.js` in `src/book-browser/book-list/book-folders/`
  - Internal import paths updated in `book-folders.folders-view.js`
  - External import references to old paths updated accordingly
  - Original files deleted

- Risks / Side effects
  - Risk of broken relative import paths mitigated by thorough path updates and search/replace (probability: ⭕)
  - No changes to runtime logic or UI behavior
