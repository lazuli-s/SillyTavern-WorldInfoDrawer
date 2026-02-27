# Rework: Visibility Filter Controls Order and Chips

## Request
- Remove the visibility-row helper icon element in the World Info drawer filter row.
- Update visibility chip spacing and background style.
- Move the Order Helper toggle button (`fa-arrow-down-wide-short`) before the visibility multiselect dropdown.

## Changes Made
- Updated `src/listPanel.filterBar.js`:
  - Removed creation/append of the visibility helper `<i>` icon in the visibility thin container.
  - Reordered controls so `orderHelperToggle` is appended before `menuWrap`.
- Updated `style.css`:
  - `.stwid--visibilityChip`:
    - `gap: 0.5em`
    - `background-color: var(--SmartThemeBlurTintColor)`
  - `.stwid--visibilityChips`:
    - Removed `gap`
    - Added `row-gap: 0.2em`
    - Added `column-gap: 0.2em`

## Why
- Matches requested visual/interaction layout:
  - No helper icon in the visibility row.
  - More consistent chip spacing and solid blur-tint chip background.
  - Arrow-down Order Helper toggle appears before the multiselect visibility dropdown.

## Notes
- No changes were made to `vendor/SillyTavern`.
- No architecture ownership boundaries were changed.

## Follow-up Adjustment 6

- Updated list panel row placement so Visibility and Settings share a dedicated controls row:
  - Added `stwid--visibilityAndSettingsRow` in `src/drawer.js`.
  - Moved the existing `Settings` thin container (global activation settings + refresh) from `stwid--controlsRow` into `stwid--visibilityAndSettingsRow`.
  - Updated `src/listPanel.filterBar.js` so the visibility control block (`stwid--bookVisibility`) mounts into `stwid--visibilityAndSettingsRow` instead of `stwid--filterRow--visibility`.
  - Kept a safe fallback to the old filter row if the new host row is unavailable.
- Updated `style.css` to style `stwid--visibilityAndSettingsRow` with the same control-row layout rules used by `stwid--controlsRow`, plus a flex rule for `stwid--bookVisibility`.

## Follow-up Adjustment 7

- Added a compact multiselect style block in `style.css` using the extension naming:
  - `.stwid--small-multiselect`
  - `.stwid--small-multiselect a`
  - `.stwid--small-multiselect a:hover`
  - `.stwid--small-multiselect a[data-selected="true"]`
  - `.stwid--small-multiselect i`
  - `.stwid--small-multiselect .multiselect-check`
  - `.stwid--small-multiselect a[data-selected="true"] .multiselect-check`
- This follows the requested rename from `compact-context-multiselect-ultra` to `stwid--small-multiselect` while preserving the same visual/interaction behavior.

## Follow-up Adjustment 8

- Updated `src/listPanel.filterBar.js` so the Book Visibility dropdown menu now includes the `stwid--small-multiselect` class on creation.
- This replaces dependency on deep structure-specific selector targeting for that menu and ensures the compact multiselect styling is applied via class contract.

## Follow-up Adjustment 9

- Updated `src/listPanel.filterBar.js` to remove `stwid--multiselectDropdownMenu` from the Book Visibility menu classes.
- Updated `style.css` so Book Visibility keeps the same dropdown positioning and open/close behavior through `stwid--bookVisibilityMenu` selectors.
- Updated menu-closing query in `src/listPanel.filterBar.js` to include active `stwid--bookVisibilityMenu` elements, preserving close behavior consistency.

## Follow-up Adjustment 10

- Updated `src/drawer.js` to move the `Settings` thin container from `stwid--visibilityAndSettingsRow` into `stwid--controlsRow`, placed immediately after the `Folders` thin container.
- Removed the now-empty `stwid--visibilityAndSettingsRow` insertion from the controls mount sequence.
- Updated `style.css` spacing to match requested control density:
  - `.stwid--iconTabBar { margin-bottom: 0.6em; }`
  - `.stwid--sortingRow { margin-top: 1em; }`

## Follow-up Adjustment 11

- Updated `src/listPanel.filterBar.js` to split the visibility tab row into two labeled `.stwid--thinContainer` groups:
  - `Helper` group for the Order Helper button.
  - `Visibility` group for the visibility dropdown button and active chips.
- Added hint icons/titles to both new group labels, matching the existing thin-container label hint pattern used in controls/sorting rows.
- Updated `style.css` so `.stwid--visibilityRow .stwid--thinContainer` now uses the same container layout settings as `.stwid--sortingRow .stwid--thinContainer`:
  - `gap: 1.1em`
  - `min-width: 45%`
  - `flex-wrap: wrap`
  - `row-gap: 0.55em`
  - `padding-top: 0.7em`
  - `display: flex`
  - `justify-content: space-around`
- Added matching mobile override so visibility-row thin containers use `min-width: 100%` at `max-width: 1000px`.
