# Editor Header Labels Are Misaligned With Their Input Fields

## Summary

In the entry editor panel, the row of header labels at the top ("Title/Memo", "Strategy", "Position", "Depth", "Order", "Trigger %") does not line up with the actual input fields they are meant to describe. The labels in the Primary Keywords section below are correctly aligned. This is a visual bug that makes the editor confusing to read.

## Current Behavior

When the user opens an entry in the editor, a header label row appears at the top of the editor. This row contains labels like "Title/Memo", "Strategy", "Position", "Depth", "Order", and "Trigger %". These labels are supposed to sit directly above their corresponding input fields in the entry row below them.

Currently, "Title/Memo" appears centered over a wide area rather than sitting above the title text field on the left. The labels "Strategy" and "Position" appear grouped together and do not align directly above their respective controls. The "Depth", "Order", and "Trigger %" labels are also visually offset from the fields they describe.

By contrast, the section below (Primary Keywords, Logic, Optional Filter, Outlet Name, etc.) has labels that sit correctly and directly above their input fields.

## Expected Behavior

After this fix, each label in the header row should sit directly above its corresponding input field — the same way the labels in the Primary Keywords/Logic/Optional Filter section do. The header row should visually function as proper column headers.

## Technical Context

The header labels come from a SillyTavern template element: `#WIEntryHeaderTitlesPC`. This element is rendered from the `worldInfoKeywordHeaders` template and inserted into the editor panel by `src/editorPanel.js` (line ~255, the `if (header)` append call).

The template was designed for SillyTavern's default World Info editor, which has a different width and column layout than the drawer's editor panel. As a result, the grid or flex column proportions in `#WIEntryHeaderTitlesPC` do not match the actual layout of the entry form fields, causing the labels to be offset.

The fix will be a CSS override in `style.css` that adjusts the `#WIEntryHeaderTitlesPC` element's column widths/flex behavior to match the actual rendered positions of the entry form controls inside the drawer.

**Important:** The implementer will need to inspect the actual HTML structure of `#WIEntryHeaderTitlesPC` and the entry top controls row in the browser (using DevTools) to understand the exact column layout before writing the fix. The vendor submodule is not initialized locally.

## Agreed Scope

- `style.css` — CSS override for `#WIEntryHeaderTitlesPC` alignment inside `.stwid--editor`
- `src/editorPanel.js` — read-only reference; no JS changes expected

## Open Questions / Assumptions

- The exact column structure of `#WIEntryHeaderTitlesPC` (grid vs flex, number of columns, column widths) must be inspected in the browser during implementation.
- It is assumed the fix is CSS-only and does not require DOM restructuring. If the template structure makes a CSS-only fix impractical, a JS-level adjustment in `editorPanel.js` may be needed.

## Out of Scope

- Changes to the Primary Keywords / Logic / Optional Filter section (already aligned correctly).
- Any changes to SillyTavern's vanilla template files under `vendor/SillyTavern`.
- The CSS refactoring work tracked in `tasks/Refactoring_style.css.md` — this is a separate bug fix.
