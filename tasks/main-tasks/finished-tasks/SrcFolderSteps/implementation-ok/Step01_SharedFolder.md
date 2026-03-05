# STEP 1 — Shared Folder

**Status:** IMPLEMENTED
**Parent task:** [Refactoring_SrcFolderStructure.md](../Refactoring_SrcFolderStructure.md)
**Folder:** `src/shared/`

---

## Files to Move

| From | To |
|---|---|
| `src/constants.js` | `src/shared/constants.js` |
| `src/utils.js` | `src/shared/utils.js` |
| `src/Settings.js` | `src/shared/settings.js` |
| `src/sortHelpers.js` | `src/shared/sort-helpers.js` |
| `src/wiUpdateHandler.js` | `src/shared/wi-update-handler.js` |

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

Pure utility files with no UI or event handlers. The only risk is a missed import reference, which surfaces immediately as a named browser console error.

## Why It's Safe to Implement

No logic, no UI, no events change. Only file locations and import strings change.

---

## IMPLEMENTATION

**Status:** IMPLEMENTED

#### Implementation Notes

- What changed
  - Files changed: `src/shared/constants.js`, `src/shared/utils.js`, `src/shared/settings.js`, `src/shared/sort-helpers.js`, `src/shared/wi-update-handler.js`
  - Moved the 5 Shared modules to `src/shared/` with the new filenames, then deleted the original root-level files.
  - Updated import paths inside moved files for new relative depth (including ST core imports in `wi-update-handler.js` and the SlashCommandParser fallback import in `utils.js`).
  - Updated all old-path imports in code/tests to point at `src/shared/*` (including `index.js`, `src/drawer.js`, list/order-helper modules, and utils tests).
  - Verified no JS import still targets old step paths: `src/constants.js`, `src/utils.js`, `src/Settings.js`, `src/sortHelpers.js`, `src/wiUpdateHandler.js`.

- Risks / Side effects
  - A missed runtime import outside test coverage could still block extension load on browser reload. (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] Reload SillyTavern and open World Info Drawer; confirm drawer opens and book list renders without import errors in browser console.
