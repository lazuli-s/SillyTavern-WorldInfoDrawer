# New Feature: List Panel Tabs

## Request
- Add placeholder tabs directly under the list-panel search bar.
- Use the provided tab style rules, but rename the family from `icon-tab*` to `stwid--iconTab*`.

## Changes Made
- Updated `src/listPanel.filterBar.js`:
  - Added a new `stwid--iconTab` section directly below the search row.
  - Added three placeholder tabs (`Books`, `Folders`, `Entries`) with icon + label buttons.
  - Added local tab switching behavior by toggling `.active` on tab buttons and content panels.
  - Added placeholder content blocks for each tab panel.
- Updated `style.css`:
  - Added the requested tab CSS under the list filter section using renamed selectors:
    - `stwid--iconTab`
    - `stwid--iconTabBar`
    - `stwid--iconTabButton`
    - `stwid--iconTabContent`
- Updated architecture docs:
  - `ARCHITECTURE.md`: documented the placeholder icon-tab strip under `listPanel.filterBar.js` responsibilities.
  - `FEATURE_MAP.md`: mapped the new list-panel icon-tab placeholder behavior.

## Why
- This creates the visual and structural tab area now, so future work can connect each tab to real list-panel functionality without redesigning the filter area.

## Notes
- Placeholder tabs are intentionally UI-only and do not change list filtering or data behavior.
- No changes were made to `vendor/SillyTavern`.
