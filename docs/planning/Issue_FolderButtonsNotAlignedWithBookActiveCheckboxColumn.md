# BUG FIX: Folder action column is not aligned with the book active checkbox column

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
  8. Alignment should be evaluated by the **right edge** of the active-checkbox column, so folder and book control columns end at the same horizontal coordinate.
  9. This requirement applies in all list states: normal browsing, filtered/search views, and collapsed/expanded folder states; the alignment expectation is constant, not conditional.
  10. This is an extension-owned UI/layout issue (DOM structure and CSS alignment), not a SillyTavern core ownership change; relevant ownership areas are row rendering in `src/listPanel.js` and `src/lorebookFolders.js`, plus layout styling in `style.css`.

## PLAN

### Goal
  Make folder header controls use the same right-side control geometry as book rows, so the folder active toggle aligns to the same right-edge checkbox column as book active toggles in every list state.

### Extension Modules
  1. `src/lorebookFolders.js`
     - Owns folder header DOM creation.
     - Add a dedicated spacer element in the folder control sequence so folders reserve the source-icon lane before the active toggle.
  2. `src/listPanel.js`
     - Owns book row DOM/action structure and overall list render flow.
     - Reuse existing action structure/classes as alignment reference and verify folder/book rows keep a compatible control order.
  3. `style.css`
     - Owns visual layout for folder headers and book action columns.
     - Define shared column sizing/alignment rules so book and folder controls resolve to the same right-edge checkbox column.

### ST Context
  1. No new SillyTavern data/state API is required for this fix; it is a presentation-layer alignment issue inside extension-owned DOM/CSS.
  2. Existing list re-render triggers (from extension world-info update handling) already rebuild folder/book rows, so alignment must be enforced in base row styles/markup rather than event-specific logic.
  3. Existing host-provided icon/class patterns (`fa-*`, `.checkbox`, extension row/action classes) are reused; no vendor core modifications are involved.

### Decision Points
  1. Spacer strategy: use a folder-only placeholder lane that mirrors the book source-links lane width, instead of shifting real controls with ad-hoc margins.
  2. Alignment anchor: treat the active-toggle column as the primary anchor and align by right edge, independent of whether source icons are present on a book.
  3. Scope of layout rule: apply at base row selectors so alignment remains stable during filtering, searching, and folder collapse/expand states.

### Evidence-based fix
  1. Add a small placeholder node in folder header actions in `createFolderDom(...)` so folder rows always include a source-lane equivalent before their active toggle.
  2. In `style.css`, introduce shared control-lane sizing (via existing row/action selectors and minimal new scoped selectors) to keep book and folder toggle columns at the same right-edge coordinate.
  3. Keep existing behavior and interaction unchanged (folder toggle logic, menu actions, active state changes, visibility filters); only DOM lane reservation + layout rules are adjusted.

### Risks/cons
  1. Fixed/shared lane sizing can compress folder title space on narrow widths if not tuned to current responsive constraints.
  2. If spacer width does not exactly match book source-links lane behavior, alignment may improve in one state but drift in others.
  3. Because folder and book controls are rendered by different modules, future UI changes in one module can reintroduce drift unless both selectors stay coupled.

## TASK CHECKLIST
  Smallest Change Set Checklist:
  [ ] In `src/lorebookFolders.js`, add a folder-header spacer element positioned before `stwid--folderActiveToggle` to reserve the source-icon lane.
  [ ] In `style.css`, add/update scoped rules so the folder spacer uses the same effective lane width as the book source-links lane.
  [ ] In `style.css`, align folder/book active toggle columns to the same right-edge anchor without changing existing control behavior.
  [ ] Verify that no filter/collapse/search state selector overrides the shared alignment rules for folder/book rows.
