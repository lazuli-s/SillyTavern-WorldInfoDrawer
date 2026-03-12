# REFACTORING: Extract mobile layout logic to editor-panel-mobile.js
*Created: March 12, 2026*

**Type:** Refactoring
**Status:** IMPLEMENTED

---

## Summary

`editor-panel.js` currently contains two distinct responsibilities: the general entry editor
pipeline, and a large block of mobile-specific DOM layout logic. This refactoring moves all
mobile-related code into a new sibling file `editor-panel-mobile.js` so each file has a single
clear job. No visible behavior changes.

## Current Behavior

All mobile layout functions live in `src/editor-panel/editor-panel.js`, mixed in with the
core editor logic. The file is 709 lines long, and roughly lines 8–476 are exclusively
mobile-layout helpers.

## Expected Behavior

After this change:
- `src/editor-panel/editor-panel-mobile.js` owns all mobile layout logic and exports
  `applyMobileHeaderLayout`.
- `src/editor-panel/editor-panel.js` imports `applyMobileHeaderLayout` from the new file
  and is otherwise unchanged in behavior.

## Agreed Scope

- **New file:** `src/editor-panel/editor-panel-mobile.js`
- **Modified file:** `src/editor-panel/editor-panel.js`
- **Docs to update:** `ARCHITECTURE.md`, `FEATURE_MAP.md`

## Out of Scope

- No CSS changes.
- No behavior changes of any kind.
- No changes to any other module.

## Implementation Plan

- [x] Create `src/editor-panel/editor-panel-mobile.js` and move the following items into it
  from `editor-panel.js`, preserving them exactly:
  - The constant `MOBILE_EDITOR_MEDIA_QUERY` (line 8)
  - `shouldUseMobileEditorLayout` (lines 170–172)
  - `createMobileHeaderLabel` (lines 174–179)
  - `normalizeMobileHeaderControl` (lines 181–197)
  - `moveMobileContextualHeaderControls` (lines 199–221)
  - `moveMobileHeaderActions` (lines 223–234)
  - `moveMobileContentFlags` (lines 236–248)
  - `annotateMobileContentSections` (lines 250–267)
  - `ensureMobileContentSettingsSection` (lines 269–280)
  - `moveMobileRecursionControls` (lines 282–304)
  - `moveMobileRecursionGuardControls` (lines 306–319)
  - `moveMobileBudgetControl` (lines 321–331)
  - `cleanupMobileContentFlags` (lines 333–344)
  - `moveMobileRecursionMetaControls` (lines 346–367)
  - `moveMobileGroupControls` (lines 369–389)
  - `moveMobileTimingControls` (lines 391–405)
  - `annotateMobileKeywordsAndFiltersSection` (lines 407–410)
  - `annotateMobileFilterSections` (lines 412–419)
  - `applyMobileHeaderLayout` (lines 421–476)

- [x] Add `export` to `applyMobileHeaderLayout` in `editor-panel-mobile.js` so it can be
  imported by `editor-panel.js`.

- [x] In `editor-panel.js`, delete the entire moved block (the constant and all 19 functions
  listed above).

- [x] At the top of `editor-panel.js`, add an import for `applyMobileHeaderLayout`:
  ```js
  import { applyMobileHeaderLayout } from './editor-panel-mobile.js';
  ```

- [x] Verify that `applyMobileHeaderLayout` is still called exactly once inside
  `openEntryEditor` in `editor-panel.js` (line 669 in the original file) — no call-site
  changes needed, just confirm it is wired up correctly after the import is added.

- [x] Update `ARCHITECTURE.md`:
  - In the project structure tree under `editor-panel/`, add a line for `editor-panel-mobile.js`
    with the description: `Mobile entry editor header layout transforms`.
  - In the Module Responsibilities table, add a row for `src/editor-panel/editor-panel-mobile.js`
    with the design intent: `Mobile layout transforms for the entry editor header and content
    sections; detects mobile viewport and restructures ST-rendered editor DOM for narrow screens`.

- [x] Update `FEATURE_MAP.md`:
  - In the **Editor Panel** section, add a new line:
    `- Mobile editor header and content layout transforms → src/editor-panel/editor-panel-mobile.js`

---

## After Implementation
*Implemented: March 12, 2026*

### What changed

- **`src/editor-panel/editor-panel-mobile.js`** (new file)
  - Contains all mobile layout logic that was previously in `editor-panel.js`: the media query constant, 18 helper functions, and the main `applyMobileHeaderLayout` function.
  - `applyMobileHeaderLayout` is exported so it can be imported by `editor-panel.js`.

- **`src/editor-panel/editor-panel.js`** (modified)
  - Shrunk from ~710 lines to ~403 lines.
  - The mobile block (constant + 19 functions, lines 8 and 170–476) was removed.
  - An import for `applyMobileHeaderLayout` was added at the top of the file.
  - The call to `applyMobileHeaderLayout(editDom)` inside `openEntryEditor` is unchanged.

- **`ARCHITECTURE.md`** (updated)
  - Added `editor-panel-mobile.js` to the project structure tree.
  - Added a Module Responsibilities row for the new file.

- **`FEATURE_MAP.md`** (updated)
  - Added a new line in the Editor Panel section pointing mobile layout transforms to the new file.

### Risks / What might break

- Any future code that imports directly from `editor-panel.js` and somehow expected the mobile functions to be there will not find them — but those functions were never exported, so no external module could have imported them.
- If the browser fails to resolve the `./editor-panel-mobile.js` import path (e.g., a typo or missing file), the entire editor panel will fail to load. The path was verified to match the created file.

### Manual checks

- Open the drawer and click an entry to open the editor on a desktop screen (wider than 1000px). The editor should look exactly the same as before.
- Open the drawer and click an entry on a narrow screen or with the browser window resized below 1000px wide. The mobile header layout (toggle + title row, strategy row, context controls row, actions row) should appear exactly as it did before.
- Open multiple entries in sequence and confirm the editor switches correctly each time with no console errors.
