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

- [ ] Add to `style.css`: `.stwid-thin-container`, `.stwid-thin-container-label`, hint icon rule, `.stwid-thin-container.is-disabled`
- [ ] In `src/drawer.js` `controlsPrimary` block: create a wrapper `div.stwid-thin-container`, append a `span.stwid-thin-container-label` with text "Lorebooks", then append the `add`, `imp`, and `collapseAllToggle` buttons into this wrapper instead of directly into `controlsPrimary`
- [ ] All remaining buttons continue appending directly to `controlsPrimary`
- [ ] Update `FEATURE_MAP.md` — note the Lorebooks thin-container group on the controls row
- [ ] Update this task file with an After Implementation section

## Open Questions / Assumptions

- The `collapseAllToggle` button is a toggle (it switches between "collapse all" and "expand all" depending on state). Its placement in the "Lorebooks" container is as requested. Its label/title text and behavior are unchanged.
- The `stwid-` single-dash prefix is used exactly as specified (not the double-dash `stwid--` pattern used elsewhere). This intentionally distinguishes component/layout classes from element-identity classes.
- `is-disabled` is kept as a plain modifier (not prefixed) — it is a state class applied on top of `.stwid-thin-container`, consistent with the pattern of state classes like `.stwid--active`.

## Out of Scope

- No new buttons added; only existing buttons are regrouped
- No changes to button behavior, tooltips, or event handlers
- No other thin-container groups created (just the one "Lorebooks" group)
- The hint icon (`fa-circle-question.stwid-thin-container-label-hint`) CSS rule is added but no hint icon is placed in the DOM as part of this task
