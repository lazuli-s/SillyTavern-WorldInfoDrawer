# BUG: Folder action column is not aligned with the book active checkbox column

## DESCRIPTION

### User Report
  > "The folder controls in the list panel are visually misaligned with the book-row icon/active column; please align them."

### Mental Map
  1. The user opens the WorldInfo Drawer list panel and sees mixed row types: folder headers and book headers.
  2. Book rows show a right-side actions area that includes source icons and a global active checkbox; this forms a visual reference column for activation controls.
  3. Folder rows also show right-side controls (folder active toggle, add button, menu trigger, collapse toggle), but these controls do not currently line up with the same column position used by book-row active controls.
  4. Because folder and book rows are rendered by different modules (`src/lorebookFolders.js` for folders and `src/listPanel.js` for books), their internal control spacing can drift even when they look conceptually similar.
  5. The current UI result is a misaligned right-side control rail, which makes scanning the list harder and makes folder controls appear offset from the book control grid.
  6. The expected alignment reference is explicit: the target column is the book-row **active checkbox column**, not the source-icon column.
  7. To keep column geometry stable, folder rows should reserve an empty source-icon slot equivalent to the book source-links space, even when there is no folder source icon content.
  8. Alignment should be evaluated by the **left edge** of the active-checkbox column, so folder and book control columns start at the same horizontal coordinate.
  9. This requirement applies in all list states: normal browsing, filtered/search views, and collapsed/expanded folder states; the alignment expectation is constant, not conditional.
  10. This is an extension-owned UI/layout issue (DOM structure and CSS alignment), not a SillyTavern core ownership change; relevant ownership areas are row rendering in `src/listPanel.js` and `src/lorebookFolders.js`, plus layout styling in `style.css`.
