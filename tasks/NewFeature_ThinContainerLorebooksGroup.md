# Add thin-container component and "Lorebooks" group on controls row

## Summary

Introduce a reusable "thin container" CSS component — a bordered box with a floating label — and use it to visually group the three lorebook-management buttons ("Create new book", "Import Book", "Expand all books toggle") on the primary controls row.

## Current Behavior

The primary controls row (`stwid--controlsRow`) displays all buttons side by side with no visual grouping. There is no bordered-box or floating-label component in the extension's CSS.

## Expected Behavior

After this change:
1. New CSS classes are available (all prefixed `stwid-`):
   - `.stwid-thin-container` — a flex row with a 1px border and small padding
   - `.stwid-thin-container-label` — a small floating label anchored at the top-left of the container
   - `i.fa-solid.fa-fw.fa-circle-question.stwid-thin-container-label-hint` — optional hint icon style
   - `.stwid-thin-container.is-disabled` — dims and disables pointer events on the container
2. On the primary controls row, a `.stwid-thin-container` with the label **"Lorebooks"** wraps three existing buttons:
   - "Create New Book" (`stwid--addBook`)
   - "Import Book" (import icon)
   - "Expand/Collapse All Books" toggle (`stwid--collapseAllToggle`)

All other buttons (New Folder, Import Folder, Refresh, Activation Settings, Order Helper, Collapse All Folders) remain outside the container and are unchanged.

## Agreed Scope

Files affected:
- **`style.css`** — add the four new CSS rules with `stwid-` prefix
- **`src/drawer.js`** — wrap the three buttons inside a `.stwid-thin-container` div with a `.stwid-thin-container-label` child inside `controlsPrimary`

FEATURE_MAP.md entry to update:
- `Top control row` line (book-level behavior section) — note the new Lorebooks group

## Implementation Checklist

- [x] Add to `style.css`: `.stwid-thin-container`, `.stwid-thin-container-label`, hint icon rule, `.stwid-thin-container.is-disabled`
- [x] In `src/drawer.js` `controlsPrimary` block: create a wrapper `div.stwid-thin-container`, append a `span.stwid-thin-container-label` with text "Lorebooks", then append the `add`, `imp`, and `collapseAllToggle` buttons into this wrapper instead of directly into `controlsPrimary`
- [x] All remaining buttons continue appending directly to `controlsPrimary`
- [x] Update `FEATURE_MAP.md` — note the Lorebooks thin-container group on the controls row
- [x] Update this task file with an After Implementation section

## Open Questions / Assumptions

- The `collapseAllToggle` button is a toggle (it switches between "collapse all" and "expand all" depending on state). Its placement in the "Lorebooks" container is as requested. Its label/title text and behavior are unchanged.
- The `stwid-` single-dash prefix is used exactly as specified (not the double-dash `stwid--` pattern used elsewhere). This intentionally distinguishes component/layout classes from element-identity classes.
- `is-disabled` is kept as a plain modifier (not prefixed) — it is a state class applied on top of `.stwid-thin-container`, consistent with the pattern of state classes like `.stwid--active`.

## Implementation Plan

- [x] In `style.css` near the top controls row styles, add `.stwid-thin-container` with a 1px border, compact padding, flex row layout, and relative positioning for the floating label
- [x] In `style.css`, add `.stwid-thin-container-label`, `i.fa-solid.fa-fw.fa-circle-question.stwid-thin-container-label-hint`, and `.stwid-thin-container.is-disabled` styles
- [x] In `src/drawer.js` inside the `controlsPrimary` block, create `lorebooksGroup` (`div.stwid-thin-container`) and `lorebooksGroupLabel` (`span.stwid-thin-container-label` with text `Lorebooks`)
- [x] In `src/drawer.js`, append `add`, `imp`, and `collapseAllToggle` to `lorebooksGroup`, and append `lorebooksGroup` once to `controlsPrimary`
- [x] In `src/drawer.js`, keep `addFolder`, `impFolder`, `refresh`, `settings`, `order`, and `collapseAllFoldersToggle` appended directly to `controlsPrimary` (no behavior changes)
- [x] Update `FEATURE_MAP.md` top control row bullet to mention the Lorebooks thin-container group
- [x] Mark checklist items complete and append an `## After Implementation` section with what changed, risks, and manual checks
- [x] Move this task from `tasks/TASKS_PENDING_IMPLEMENTATION.md` to `tasks/POST_IMPLEMENTATION_REVIEW.md`

## Out of Scope

- No new buttons added; only existing buttons are regrouped
- No changes to button behavior, tooltips, or event handlers
- No other thin-container groups created (just the one "Lorebooks" group)
- The hint icon (`fa-circle-question.stwid-thin-container-label-hint`) CSS rule is added but no hint icon is placed in the DOM as part of this task

## After Implementation

### What changed

- Files changed: `style.css`, `src/drawer.js`, `FEATURE_MAP.md`
  - `style.css` now includes the new `.stwid-thin-container` component styles, floating label styles, optional hint icon style, and disabled state style.
  - `src/drawer.js` now creates a `Lorebooks` thin-container on the primary controls row and places `Create New Book`, `Import Book`, and `Collapse/Expand All Books` inside it.
  - `FEATURE_MAP.md` now notes that the top control row includes the Lorebooks thin-container grouping.

### Risks / What might break

- This touches top-row layout, so it might affect wrapping or spacing when the drawer is narrow.
- This moves existing buttons into a wrapper element, so it might affect any style selectors that assumed those buttons were direct children of the controls row.

### Manual checks

- [ ] Open the World Info drawer and confirm the primary controls row shows a bordered group labeled `Lorebooks` containing exactly `Create New Book`, `Import Book`, and the books collapse/expand toggle. (Success: only those 3 controls are inside the group.)
- [ ] Confirm `New Folder`, `Import Folder`, `Refresh`, `Global Activation Settings`, `Order Helper`, and `Collapse/Expand All Folders` are still outside the Lorebooks group and still clickable. (Success: location and behavior are unchanged.)
- [ ] Click each of the three Lorebooks controls and verify behavior is unchanged: create opens prompt, import opens file picker, and collapse-all-books toggles the icon/state. (Success: all three actions work exactly as before.)
