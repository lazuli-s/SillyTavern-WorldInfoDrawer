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
