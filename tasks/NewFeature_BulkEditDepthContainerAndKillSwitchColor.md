# New Feature: Bulk Edit — Depth Container + KillSwitch Theme Color

## Summary

Two targeted improvements to the Order Helper bulk edit row (`stwid--bulkEditRow`):

1. **KillSwitch toggle theme color** — The `fa-toggle-on.killSwitch` element in the bulk edit row
   currently inherits no `color` for its enabled state because the vendor rule
   `.world_entry .killSwitch.fa-toggle-on` only fires inside `.world_entry`.
   Fix: add a scoped CSS rule in `style.css` to apply `var(--SmartThemeQuoteColor)` when
   the toggle is inside `.stwid--bulkEditContainer`.

2. **Depth container** — Add a new `stwid--bulkEditContainer[data-field="depth"]` to
   `buildBulkEditRow` in `src/orderHelperRender.actionBar.js`, placed after the existing
   Position container. Includes:
   - A `stwid--bulkEditLabel` "Depth" with a `fa-circle-question stwid--bulkEditLabelHint` icon.
   - A `stwid--input text_pole` number input, persisted via `stwid--bulk-depth-value` in localStorage.
   - A `menu_button interactable fa-solid fa-fw fa-check` apply button that writes the value
     to `cache[bookName].entries[uid].depth` for all selected, non-filtered rows, syncs the
     row's `[name="depth"]` input, and saves each affected book.

## Files changed

- `src/orderHelperRender.actionBar.js`
- `style.css`

## Status

- [x] Task file created
- [ ] CSS rule for killSwitch
- [ ] Depth container implementation
