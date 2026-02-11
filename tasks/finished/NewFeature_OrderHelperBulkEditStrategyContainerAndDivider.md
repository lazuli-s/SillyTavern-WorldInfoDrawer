# New Feature: Order Helper Bulk Edit — Strategy Container, Divider, Help Icons

## Summary

Three improvements to the Order Helper bulk edit row:

1. **`?` help icons** on every `stwid--bulkEditLabel` (Select, Strategy, Order) explaining what each container does.
2. **Horizontal divider** between `stwid--visibilityRow` and `stwid--bulkEditRow`.
3. **New "Strategy" container** inserted before "Order" with a strategy dropdown + bulk-apply button.

## Files Changed

- `src/orderHelperRender.actionBar.js` — adds `?` icons to all container labels, new Strategy container with select + apply button
- `src/orderHelperRender.js` — passes new params to `buildBulkEditRow`, inserts `stwid--rowDivider` element
- `style.css` — adds `.stwid--rowDivider` CSS rule

## Status

- [x] Implemented
