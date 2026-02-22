# Rework: Sorting Controls Section Titles

## Summary

Replaced per-field text labels and question-mark hint icons in the Sorting thin container with compact icon + title section headers, using new shared CSS classes.

## Changes Made

### `src/drawer.js`

- **Global Sorting label**: Replaced plain `stwid-sort-label` span with a `stwid--thinContainerSectionTitle` div containing a `fa-globe` icon and a `stwid--thinContainerSmallTitle` span ("Global Sorting:").
- **Removed**: `toggleSortField` wrapper, `toggleSortLabel` ("Toggle per book sorting:"), and its `stwid--thinContainerLabelHint` question-mark icon.
- **Removed**: `clearSortField` wrapper, `clearSortLabel` ("Clear sorting preferences:"), and its `stwid--thinContainerLabelHint` question-mark icon.
- **Per-book Sorting title**: Added a `stwid--thinContainerSectionTitle` div with a `fa-book` icon and `stwid--thinContainerSmallTitle` span ("Per-book Sorting:") at the top of `stwid--individualSorting`.
- **Buttons** (`bookSortToggle`, `clearBookSorts`) now go directly into `stwid--individualSorting` (no `stwid-sort-field` wrappers).

### `style.css`

- **Removed**: `.stwid-sort-label` rule (replaced by the new classes below).
- **Added** `.stwid--thinContainerSmallTitle`: `font-size: 0.78em; opacity: 0.75; white-space: nowrap;` — scoped to `body.stwid-- #WorldInfo`. General-purpose small title text, usable anywhere inside the drawer.
- **Added** `.stwid--thinContainerSectionTitle`: `inline-flex; align-items: center; gap: 0.25em;` — container for an icon + small title.
- **Added** `.stwid--thinContainerSectionTitle > i`: `font-size: 0.78em; opacity: 0.75;` — matches icon size/opacity to the title text.
- **Added** `stwid--individualSorting` override: `flex-wrap: wrap; align-items: center;` — allows the section title to occupy its own full-width row.
- **Added** `stwid--individualSorting > .stwid--thinContainerSectionTitle`: `flex: 0 0 100%;` — forces the title to wrap onto its own line above the buttons.
