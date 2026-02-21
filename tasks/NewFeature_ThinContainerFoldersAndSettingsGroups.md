# Add "Folders" and "Settings" thin-container groups to the controls row

## Summary

Group the folder-management buttons into a labeled "Folders" container (with a tooltip hint icon),
and group the activation-settings and refresh buttons into a labeled "Settings" container.
This continues the visual-grouping pattern established by the existing "Lorebooks" container.

## Current Behavior

The primary controls row shows the following buttons in order, with no grouping:

1. **[Lorebooks group]** - Create Book, Import Book, Collapse/Expand All Books
2. New Folder - standalone
3. Import Folder - standalone
4. Refresh - standalone
5. Global Activation Settings - standalone
6. Order Helper - standalone
7. Collapse/Expand All Folders - standalone

## Expected Behavior

After this change, the primary controls row shows:

1. **[Lorebooks group]** - unchanged
2. **[Folders group]** - New Folder, Import Folder, Collapse/Expand All Folders
   - A hint icon (`fa-circle-question`) appears on the "Folders" label
   - Hovering the hint icon shows the tooltip: **"Create, import, or collapse folders"**
3. **[Settings group]** - Global Activation Settings, Refresh
   - No hint icon on this group
4. Order Helper - standalone (unchanged)

## Agreed Scope

Files affected:
- **`src/drawer.js`** - create two new `div.stwid-thin-container` wrappers inside `controlsPrimary`;
  move `addFolder`, `impFolder`, and `collapseAllFoldersToggle` into the Folders group;
  move `settings` and `refresh` into the Settings group;
  add a hint icon element inside the Folders group label.

No CSS changes needed - `.stwid-thin-container`, `.stwid-thin-container-label`, and
`i.fa-solid.fa-fw.fa-circle-question.stwid-thin-container-label-hint` are already defined in `style.css`
from the prior Lorebooks task.

FEATURE_MAP.md entry to update:
- `Top control row` bullet (Book-level behavior section) - add the two new container groups.

## Implementation Checklist

- [x] In `src/drawer.js`, inside the `controlsPrimary` block, create `foldersGroup`
      (`div.stwid-thin-container`) with a `span.stwid-thin-container-label` child labeled "Folders"
- [x] Add a hint icon (`i.fa-solid.fa-fw.fa-circle-question.stwid-thin-container-label-hint`) inside
      the Folders label span; set its `title` to `"Create, import, or collapse folders"`
- [x] Append `addFolder`, `impFolder`, and `collapseAllFoldersToggle` into `foldersGroup`
      (instead of directly into `controlsPrimary`)
- [x] In `src/drawer.js`, create `settingsGroup` (`div.stwid-thin-container`) with a
      `span.stwid-thin-container-label` child labeled "Settings"
- [x] Append `settings` (Global Activation Settings) and `refresh` into `settingsGroup`
      (instead of directly into `controlsPrimary`)
- [x] Append `foldersGroup` and `settingsGroup` to `controlsPrimary` in order, keeping `order` standalone
- [x] Update `FEATURE_MAP.md` - note the Folders and Settings thin-container groups on the controls row
- [x] Update this task file with an After Implementation section

## Implementation Plan

- [x] In `src/drawer.js`, inside the `controlsPrimary` block, create `foldersGroup` and `settingsGroup` immediately after the existing `lorebooksGroup` so group order stays Lorebooks -> Folders -> Settings -> Order Helper
- [x] In `src/drawer.js`, create `foldersGroupLabel` (`span.stwid-thin-container-label`) and append a `foldersGroupHint` icon (`i.fa-solid.fa-fw.fa-circle-question.stwid-thin-container-label-hint`) with tooltip `Create, import, or collapse folders`
- [x] In `src/drawer.js`, move `addFolder`, `impFolder`, and `collapseAllFoldersToggle` append targets from `controlsPrimary` to `foldersGroup`, preserving existing click handlers and titles
- [x] In `src/drawer.js`, move `settings` and `refresh` append targets from `controlsPrimary` to `settingsGroup`, preserving existing click handlers and titles
- [x] In `FEATURE_MAP.md`, update the `Top control row` bullet to include Folders and Settings thin-container groups
- [x] In `tasks/NewFeature_ThinContainerFoldersAndSettingsGroups.md`, mark checklist items complete and append `After Implementation` notes plus manual checks

## Open Questions / Assumptions

- The hint icon (`fa-circle-question`) is placed **inside** the label `span`, after the label text,
  matching the pattern established by the CSS rule for `.stwid-thin-container-label-hint`.
- The "Settings" group has **no** hint icon - user confirmed only Folders needs one.
- Order Helper stays standalone - it is a different kind of tool, not a setting.
- No changes to button behavior, event handlers, or titles.

## Out of Scope

- No new CSS additions (existing component classes are reused as-is)
- No changes to button behavior or event wiring
- No hint icon on the Settings group
- Order Helper button is not moved into any group

## After Implementation

### What changed

- Files changed: `src/drawer.js`, `FEATURE_MAP.md`
  - `src/drawer.js` now creates two new thin-container groups (`Folders`, `Settings`) in the top controls row.
  - `src/drawer.js` now places `New Folder`, `Import Folder`, and `Collapse/Expand All Folders` inside `Folders`, and places `Global Activation Settings` and `Refresh` inside `Settings`.
  - `src/drawer.js` now adds a `fa-circle-question` hint icon on the `Folders` label with tooltip text `Create, import, or collapse folders`.
  - `FEATURE_MAP.md` now documents that the top controls row includes Lorebooks, Folders, and Settings thin-container groups.

### Risks / What might break

- This touches top-row DOM structure, so it might affect spacing/wrapping when the drawer is narrow.
- This moves existing controls into wrapper containers, so selectors expecting direct children of `controlsPrimary` could behave differently.

### Manual checks

- [ ] Open the World Info drawer and confirm the top row shows three labeled groups in order: `Lorebooks`, `Folders`, `Settings`, with `Order Helper` still standalone. (Success: order and grouping match the task.)
- [ ] Hover the `Folders` label hint icon and confirm the tooltip reads `Create, import, or collapse folders`. (Success: tooltip text matches exactly.)
- [ ] Click `New Folder`, `Import Folder`, and folder collapse/expand inside `Folders`. (Success: all three actions still work exactly as before.)
- [ ] Click `Global Activation Settings` and `Refresh` inside `Settings`. (Success: settings panel toggle and list refresh behavior remain unchanged.)
