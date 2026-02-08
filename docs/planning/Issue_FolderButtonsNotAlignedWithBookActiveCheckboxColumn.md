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
  Make folder headers follow the same right-side lane geometry used by book headers so the folder global-active checkbox ends on the same horizontal column as the book global-active checkbox, while keeping all existing folder/book behaviors unchanged.

### Extension Modules
  1. `src/lorebookFolders.js`
     - Owner of folder header markup via `createFolderDom(...)`.
     - Add one non-interactive spacer lane node in the header control sequence immediately before `.stwid--folderActiveToggle` to mirror the book source-links lane.
  2. `src/listPanel.js`
     - Owner of book header reference structure via `renderBook(...)` (`.stwid--actions > .stwid--sourceLinks + input[type='checkbox'] + action icons`).
     - Used as the alignment contract; no functional behavior change planned.
  3. `style.css`
     - Owner of folder/book row layout selectors (`.stwid--folderHeader`, `.stwid--folderActiveToggle`, `.stwid--book .stwid--head .stwid--actions`, `.stwid--sourceLinks`).
     - Add scoped lane sizing/alignment rules so folder spacer + folder active checkbox resolve to the same right-edge column as book active checkboxes.

### ST Context
  1. This is extension-owned presentation work only; no new SillyTavern API integration is needed.
  2. Relevant ST context surfaces remain unchanged: `eventSource`/`eventTypes` and WI reload paths that already trigger list rerenders (from `WORLDINFO_UPDATED` / `WORLDINFO_SETTINGS_UPDATED` handling in extension runtime).
  3. Relevant context functions exposed by ST (`loadWorldInfo`, `saveWorldInfo`) are not touched because this issue does not alter WI data, only DOM/CSS alignment.
  4. Host-provided runtime classes/assets already in use (`fa-*`, ST checkbox styling) are reused; `/vendor/SillyTavern` remains reference-only.

### Decision Points
  1. Spacer placement: insert the folder spacer before `.stwid--folderActiveToggle` (not before add/menu/toggle) so the active checkbox column is the alignment anchor.
  2. Lane sizing source: reuse existing book action/source-link geometry where possible; only introduce minimal new scoped CSS if direct reuse cannot produce stable alignment.
  3. Alignment metric: align by the active checkbox right edge (explicit requirement), not by folder/book action container left edge.
  4. Scope: enforce at base row selectors so alignment holds in normal, filtered (`stwid--filter-*`), and collapsed folder states.

### Evidence-based fix
  1. In `createFolderDom(...)`, add a dedicated folder source-lane placeholder element before `activeToggle` and mark it non-interactive (`aria-hidden`, no click handlers).
  2. In `style.css`, map that placeholder to the same effective lane width used by book source-links/action spacing so folder active checkboxes land on the same right-edge column as book active checkboxes.
  3. Keep existing folder logic intact (`updateActiveToggle`, folder toggle/menu/add handlers, drag/drop hooks); only header markup order and lane styling are adjusted.
  4. Preserve existing book behavior in `renderBook(...)` (including `.stwid--sourceLinks.stwid--isEmpty` behavior) unless a tiny selector adjustment is strictly required for stable shared lane sizing.

### Risks/cons
  1. If spacer width is overestimated, folder title/counter space can shrink on narrow list widths.
  2. If spacer width underestimates actual book source-link lane geometry, alignment can still drift when source icons are visible on books.
  3. Because folder and book header controls are defined in separate modules, future control-order changes in one module can silently break column parity.

## TASK CHECKLIST
  Smallest Change Set Checklist:
  [x] In `src/lorebookFolders.js` `createFolderDom(...)`, insert a non-interactive folder source-lane placeholder immediately before `activeToggle`.
  [x] In `style.css`, add scoped selector(s) for the new folder source-lane class and size it to the same effective geometry as book source-links spacing.
  [x] In `style.css`, align folder controls using a dedicated right-side controls rail so the folder active checkbox column matches the book active-checkbox column anchor.
  [ ] Verify the active-checkbox column alignment in: root books, folder books, visible source-icon books, source-icon-empty books, filtered lists, and collapsed/expanded folders.
  [ ] Confirm no functional regressions: folder active toggle states (`on`/`off`/`partial`/`empty`) and folder menu/add/collapse interactions remain unchanged.

## AFTER IMPLEMENTATION

### What changed
  - `src/lorebookFolders.js`
    - Added `.stwid--folderControls` container in `createFolderDom(...)` to group right-side folder controls.
    - Added non-interactive `.stwid--folderSourceLane` placeholder (`aria-hidden`) before `.stwid--folderActiveToggle`.
    - Moved folder right-side controls into the new controls rail (toggle, source lane, active toggle, add, menu) without changing their handlers.
  - `style.css`
    - Added scoped styles for `.stwid--folderControls` and `.stwid--folderSourceLane`.
    - Updated folder layout rules to anchor the controls rail at the right with book-matching control spacing.
    - Removed obsolete folder-header auto-margin alignment rules tied to the previous flat header control layout.

### Risks/What might break
  - This touches folder header layout flow, so very narrow list widths may truncate folder names/counters sooner.
  - This changes folder control positioning, so chevron/toggle visual placement may feel different than before.
  - This touches folder-header CSS selectors, so future folder/menu style updates could accidentally bypass the new controls rail.

### Manual checks
  - Open a mix of root books and foldered books; compare folder active checkbox vs book active checkbox column.  
    Success looks like: right-edge checkbox column lines up visually.
  - Use folders with and without visible source-link icons on nearby books; toggle search/visibility filters.  
    Success looks like: folder checkbox alignment remains stable while list content changes.
  - Click folder chevron, folder active checkbox, add button, and folder menu trigger in several folders.  
    Success looks like: collapse/expand, active state updates, add flow, and menu open behavior all still work.
  - Set folder active state where folder has mixed active/inactive visible books.  
    Success looks like: partial state still appears and transitions correctly (`partial` -> `on`/`off`).
