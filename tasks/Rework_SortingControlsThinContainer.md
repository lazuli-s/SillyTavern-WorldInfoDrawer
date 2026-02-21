# Group sorting controls into a labeled "Sorting" thin-container

## Summary

The three sorting controls in the secondary controls row (`stwid--orderControls`) currently sit bare
with no visual grouping or descriptive labels. This task wraps them in a labeled `.stwid-thin-container`
called "Sorting" and adds small field-label text and tooltip icons to each control, making it
immediately clear what each one does without hovering.

## Current Behavior

The `stwid--orderControls` row shows three bare controls in a row with no container or labels:

1. **Sort dropdown** — globally changes the entry sort logic/direction for all books
2. **Per-book sort toggle** (icon button) — enables/disables per-book sort overrides
3. **Clear sort preferences** (broom icon button) — removes all saved per-book sort preferences

There is no visual grouping, no descriptive label text, and no container boundary.

## Expected Behavior

After this change, the `stwid--orderControls` row contains a single `.stwid-thin-container`
labeled **"Sorting"**, which contains three inner flex sub-groups (each label stays beside
its control; text wraps if the row is narrow):

| Sub-group | Contents |
|-----------|----------|
| 1 | Small label `"Global Sorting:"` + sort dropdown (narrower width than default) |
| 2 | Small label `"Toggle per book sorting:"` + tooltip icon (fa-circle-question) + per-book sort toggle button |
| 3 | Small label `"Clear sorting preferences:"` + tooltip icon (fa-circle-question) + clear button |

**Tooltip hover texts (sensible defaults):**
- Sub-group 2 tooltip: `"When enabled, individual books can use their own sort order instead of the global one"`
- Sub-group 3 tooltip: `"Remove all saved per-book sort preferences and revert all books to the global sort"`

No button behavior changes — only layout and labeling are affected.

## Agreed Scope

Files affected:

- **`src/drawer.js`** — wrap `sortSel`, `bookSortToggle`, and `clearBookSorts` into inner flex
  sub-group wrappers; place all three sub-groups inside a new `sortingGroup` (`.stwid-thin-container`)
  with a label "Sorting"; the thin-container replaces the bare layout of `controlsSecondary`.
- **`style.css`** — add two new CSS classes for the inner sub-groups:
  - `.stwid-sort-field` — a small flex row wrapper for each label+control pair
  - `.stwid-sort-label` — small muted label text used inside each sort field

FEATURE_MAP.md entry to update:
- `Sorting & ordering` section — note that the `stwid--orderControls` row now uses a
  "Sorting" thin-container with labeled sub-groups.

## Implementation Checklist

- [x] In `style.css`, add `.stwid-sort-field`:
  - `display: flex; align-items: center; gap: 0.4em;`
- [x] In `style.css`, add `.stwid-sort-label`:
  - `font-size: 0.78em; opacity: 0.75; white-space: nowrap;`
- [x] In `style.css`, add a width override for the sort dropdown when inside a
  `.stwid-thin-container`: set a narrower fixed/max width so it doesn't dominate the row
- [x] In `src/drawer.js` `controlsSecondary` block:
  - Create `sortingGroup` (`div.stwid-thin-container`) + `span.stwid-thin-container-label` with text `"Sorting"`
  - Create sub-group 1: `div.stwid-sort-field` containing `span.stwid-sort-label` (`"Global Sorting:"`) + `sortSel` (existing dropdown)
  - Create sub-group 2: `div.stwid-sort-field` containing `span.stwid-sort-label` (`"Toggle per book sorting:"`) + tooltip `i.fa-circle-question.stwid-thin-container-label-hint` (title = default text) + `bookSortToggle`
  - Create sub-group 3: `div.stwid-sort-field` containing `span.stwid-sort-label` (`"Clear sorting preferences:"`) + tooltip `i.fa-circle-question.stwid-thin-container-label-hint` (title = default text) + `clearBookSorts`
  - Append all three sub-groups into `sortingGroup`, append `sortingGroup` into `controlsSecondary`
  - Do NOT append `sortSel`, `bookSortToggle`, or `clearBookSorts` directly to `controlsSecondary` any more
- [x] Update `FEATURE_MAP.md` — note the Sorting thin-container group in the secondary controls row
- [x] Update this task file with an After Implementation section

## Implementation Plan

- [x] Read `style.css` controls-row section and add `.stwid-sort-field`, `.stwid-sort-label`, and the scoped sort-select width override under the existing `stwid--orderControls` rules.
- [x] In `src/drawer.js` inside `addDrawer()` and the `controlsSecondary` block, create `sortingGroup` (`div.stwid-thin-container`) and `sortingGroupLabel` (`span.stwid-thin-container-label`) with text `Sorting`.
- [x] In `src/drawer.js`, replace direct `controlsSecondary.append(...)` calls for `sortSel`, `bookSortToggle`, and `clearBookSorts` with three `div.stwid-sort-field` wrappers containing the required labels/tooltips and existing controls.
- [x] In `src/drawer.js`, append all three sort fields into `sortingGroup`, then append `sortingGroup` to `controlsSecondary` (no direct append of the three controls to `controlsSecondary`).
- [x] Update `FEATURE_MAP.md` in `Sorting & ordering` to document that `stwid--orderControls` now renders a labeled `Sorting` thin-container with grouped sort controls.
- [x] Mark checklist/plan items complete and add an `## After Implementation` section with changed files, risks, and manual checks.

## Open Questions / Assumptions

- `stwid-sort-field` and `stwid-sort-label` are new CSS classes using the `stwid-` single-dash
  prefix convention (same as `.stwid-thin-container-label`), which distinguishes layout/component
  classes from element-identity classes (double-dash `stwid--`).
- The tooltip icons reuse the existing `i.fa-solid.fa-fw.fa-circle-question.stwid-thin-container-label-hint`
  class — no new CSS needed for the icon styling itself.
- The sort dropdown (`sortSel`) width override is the only sizing change; all other button sizes
  remain at their current defaults.
- No changes to event handlers, button titles (aria), or behavior of any control.
- The "Sorting" container label uses `span.stwid-thin-container-label` — same as the
  "Lorebooks" and the upcoming "Folders"/"Settings" groups on the primary row.

## Out of Scope

- No changes to button behavior, event wiring, or aria labels
- No changes to the primary controls row (`controlsPrimary`)
- No new external dependencies

## After Implementation

### What changed

- Files changed: `src/drawer.js`, `style.css`, `FEATURE_MAP.md`
  - `src/drawer.js`: Wrapped the existing sort dropdown, per-book toggle, and clear button inside a new `Sorting` thin-container with three labeled `stwid-sort-field` groups and two tooltip hint icons.
  - `style.css`: Added `stwid-sort-field` and `stwid-sort-label` styles, added a narrower width override for the sort dropdown inside the sorting thin-container, and allowed the container to wrap on narrow widths.
  - `FEATURE_MAP.md`: Documented the new `Sorting` thin-container layout in the `Sorting & ordering` section.

### Risks / What might break

- This touches only the secondary sort-controls layout, so it might affect spacing or wrapping in very narrow list-panel widths.
- Tooltip icons now sit between labels and buttons, so hover hit areas could feel tight if custom themes heavily change icon spacing.

### Manual checks

- [ ] Open World Info drawer and confirm the secondary row now shows one labeled `Sorting` box with three labeled fields. (Success: `Global Sorting`, `Toggle per book sorting`, and `Clear sorting preferences` are visible.)
- [ ] Hover each new question-mark icon and verify the tooltip text matches the task wording. (Success: both help texts appear and are readable.)
- [ ] Change global sort, toggle per-book sorting, and click clear preferences. (Success: all three controls still behave exactly as before.)
