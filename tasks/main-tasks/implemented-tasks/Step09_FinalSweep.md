# STEP 9 — Final Sweep

**Status:** IMPLEMENTED
**Parent task:** [Refactoring_SrcFolderStructure.md](../Refactoring_SrcFolderStructure.md)
**Scope:** Cross-cutting — drawer.js, index.js, and any remaining old-path references

---

## Implementation Checklist

- [x] Read `src/drawer.js`; confirm all imports point to new paths.
      Fix any that still reference old flat `src/*.js` paths.
- [x] Read `index.js` at the project root; confirm all imports point to
      new paths. Fix any that still reference old flat `src/*.js` paths.
- [x] Grep the entire codebase for each filename listed below. Any match
      found in an import statement is a missed update — fix it.

Old filenames to grep:
`listPanel.js`, `listPanel.state.js`, `listPanel.coreBridge.js`,
`listPanel.filterBar.js`, `listPanel.booksView.js`, `listPanel.selectionDnD.js`,
`listPanel.bookMenu.js`, `listPanel.foldersView.js`,
`bookSourceLinks.js`, `worldEntry.js`, `lorebookFolders.js`,
`editorPanel.js`,
`orderHelper.js`, `orderHelperState.js`, `orderHelperFilters.js`,
`orderHelperRender.js`, `orderHelperRender.actionBar.js`,
`orderHelperRender.filterPanel.js`, `orderHelperRender.tableBody.js`,
`orderHelperRender.tableHeader.js`, `orderHelperRender.utils.js`,
`constants.js`, `utils.js`, `Settings.js`, `sortHelpers.js`, `wiUpdateHandler.js`

---

## Fix Risk: Low 🟢

Scan-only with targeted fixes. No files are moved. Any fix is a single
import string update. If nothing is found, this step completes with no changes.

## Why It's Safe to Implement

All moves were done in Steps 01-08. This step only corrects import strings
accidentally left behind. No logic, structure, or behavior changes.

Requirements:
- Write the file using the Write tool — not Bash echo, printf, or heredoc.

---

## After Implementation
*Implemented: March 2, 2026*

### What changed

- `tasks/main-tasks/documented/SrcFolderSteps/Step09_FinalSweep.md`
- Marked all checklist items complete after verification.
- Updated task status from `PENDING` to `IMPLEMENTED`.
- Recorded that the final sweep found no remaining old flat `src/*.js` import paths in runtime code.

### Risks / What might break

- This only updates task tracking text, so runtime behavior is not expected to change.
- If a legacy path exists only in a file type outside the search scope used here, it could still be missed.

### Manual checks

- Reload the extension in SillyTavern and confirm it opens normally with no module import errors in the browser console.
- Open the drawer and verify the book list, editor, and order helper still load and respond.
- If you want a stricter audit, run a full-text search for `src/listPanel.js` and `src/orderHelperRender.js`; success means no live import statements use those old flat paths.
