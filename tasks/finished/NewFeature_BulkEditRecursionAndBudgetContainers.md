# New Feature: Bulk Edit — Recursion and Budget Containers

## Summary

Add two new bulk edit containers to `stwid--bulkEditRow`:
- **Recursion** (after Order) — three checkboxes matching the table's recursion flags, with overwrite-apply.
- **Budget** (after Recursion) — single "Ignore budget" checkbox, with overwrite-apply.

## Scope

File: `src/orderHelperRender.actionBar.js`
File: `src/orderHelperRender.js`
Docs: `FEATURE_MAP.md`

## Design Decisions

- **Apply behavior**: Overwrite all flags on selected entries (checked = ON, unchecked = OFF). Never partial.
- **Column visibility**: Always visible (not tied to column toggles).
- **Toast feedback**: None — silent apply.
- **DOM structure**: Reuse `stwid--recursionOptions` / `stwid--recursionRow` classes matching the table cells.
- **Visual update**: Call `applyOrderHelperRecursionFilterToRow` after updating recursion flags to keep row styling consistent.

## Implementation Steps

1. [x] Create this task file.
2. [ ] Add `applyOrderHelperRecursionFilterToRow` to `buildBulkEditRow` JSDoc and destructured params.
3. [ ] Insert **Recursion container** after `row.append(orderContainer)` (line ~992).
4. [ ] Insert **Budget container** after the Recursion container.
5. [ ] Add `applyOrderHelperRecursionFilterToRow` to the `buildBulkEditRow` call in `orderHelperRender.js`.
6. [ ] Update `FEATURE_MAP.md`.
