# STEP 9 — Final Sweep

**Status:** PENDING
**Parent task:** [Refactoring_SrcFolderStructure.md](../Refactoring_SrcFolderStructure.md)
**Scope:** Cross-cutting — drawer.js, index.js, and any remaining old-path references

---

## Implementation Checklist

- [ ] Read `src/drawer.js`; confirm all imports point to new paths.
      Fix any that still reference old flat `src/*.js` paths.
- [ ] Read `index.js` at the project root; confirm all imports point to
      new paths. Fix any that still reference old flat `src/*.js` paths.
- [ ] Grep the entire codebase for each filename listed below. Any match
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
