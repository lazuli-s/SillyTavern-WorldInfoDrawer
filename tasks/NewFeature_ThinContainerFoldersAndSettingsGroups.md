# Add "Folders" and "Settings" thin-container groups to the controls row

## Summary

Group the folder-management buttons into a labeled "Folders" container (with a tooltip hint icon),
and group the activation-settings and refresh buttons into a labeled "Settings" container.
This continues the visual-grouping pattern established by the existing "Lorebooks" container.

## Current Behavior

The primary controls row shows the following buttons in order, with no grouping:

1. **[Lorebooks group]** — Create Book · Import Book · Collapse/Expand All Books
2. New Folder — standalone
3. Import Folder — standalone
4. Refresh — standalone
5. Global Activation Settings — standalone
6. Order Helper — standalone
7. Collapse/Expand All Folders — standalone

## Expected Behavior

After this change, the primary controls row shows:

1. **[Lorebooks group]** — unchanged
2. **[Folders group]** — New Folder · Import Folder · Collapse/Expand All Folders
   - A hint icon (`fa-circle-question`) appears on the "Folders" label
   - Hovering the hint icon shows the tooltip: **"Create, import, or collapse folders"**
3. **[Settings group]** — Global Activation Settings · Refresh
   - No hint icon on this group
4. Order Helper — standalone (unchanged)

## Agreed Scope

Files affected:
- **`src/drawer.js`** — create two new `div.stwid-thin-container` wrappers inside `controlsPrimary`;
  move `addFolder`, `impFolder`, and `collapseAllFoldersToggle` into the Folders group;
  move `settings` and `refresh` into the Settings group;
  add a hint icon element inside the Folders group label.

No CSS changes needed — `.stwid-thin-container`, `.stwid-thin-container-label`, and
`i.fa-solid.fa-fw.fa-circle-question.stwid-thin-container-label-hint` are already defined in `style.css`
from the prior Lorebooks task.

FEATURE_MAP.md entry to update:
- `Top control row` bullet (Book-level behavior section) — add the two new container groups.

## Implementation Checklist

- [ ] In `src/drawer.js`, inside the `controlsPrimary` block, create `foldersGroup`
      (`div.stwid-thin-container`) with a `span.stwid-thin-container-label` child labeled "Folders"
- [ ] Add a hint icon (`i.fa-solid.fa-fw.fa-circle-question.stwid-thin-container-label-hint`) inside
      the Folders label span; set its `title` to `"Create, import, or collapse folders"`
- [ ] Append `addFolder`, `impFolder`, and `collapseAllFoldersToggle` into `foldersGroup`
      (instead of directly into `controlsPrimary`)
- [ ] In `src/drawer.js`, create `settingsGroup` (`div.stwid-thin-container`) with a
      `span.stwid-thin-container-label` child labeled "Settings"
- [ ] Append `settings` (Global Activation Settings) and `refresh` into `settingsGroup`
      (instead of directly into `controlsPrimary`)
- [ ] Append `foldersGroup` and `settingsGroup` to `controlsPrimary` in order, keeping `order` standalone
- [ ] Update `FEATURE_MAP.md` — note the Folders and Settings thin-container groups on the controls row
- [ ] Update this task file with an After Implementation section

## Open Questions / Assumptions

- The hint icon (`fa-circle-question`) is placed **inside** the label `span`, after the label text,
  matching the pattern established by the CSS rule for `.stwid-thin-container-label-hint`.
- The "Settings" group has **no** hint icon — user confirmed only Folders needs one.
- Order Helper stays standalone — it is a different kind of tool, not a setting.
- No changes to button behavior, event handlers, or titles.

## Out of Scope

- No new CSS additions (existing component classes are reused as-is)
- No changes to button behavior or event wiring
- No hint icon on the Settings group
- Order Helper button is not moved into any group
