# PLAN: Mobile entry editor row layout
*Created: March 10, 2026*

**Type:** Plan
**Status:** IMPLEMENTED

---

## Summary

The mobile entry editor currently uses a layout that was adapted from the desktop editor and still groups several labels and controls in ways that are hard to read on a phone. This task documents a new mobile-only row layout so the editor can be rebuilt with clearer grouping, even spacing, and labels that stay attached to the correct field.

## Current Behavior

- On a phone-sized screen, several editor controls still inherit desktop grouping rules.
- Some labels are effectively shared across a row instead of sitting directly with their own field.
- The header area and content area contain mixed pieces of information and controls that are difficult to scan quickly on mobile.
- The old bottom checkbox block (`Selective`, `Use Probability`, `Add Memo`) still exists in the underlying template, but the extension currently hides it.

## Expected Behavior

- On mobile only, the entry editor should use a new row layout based on the user-approved grouping below.
- Every field, checkbox, or dropdown should keep its own label above it.
- Fields that share a row should align cleanly with even spacing.
- If a row becomes too narrow, it should wrap rather than forcing sideways scrolling.
- The bottom checkbox block should remain hidden.

## Agreed Scope

Likely owner files based on the current code:

| Area | Files |
|---|---|
| Mobile editor layout and row grouping | `style.css` |
| Editor mount hooks if a layout class or wrapper is needed | `src/editor-panel/editor-panel.js` |

Relevant owning modules from project docs:

- Entry editor render pipeline → `src/editor-panel/editor-panel.js`
- Editor panel styling and responsive overrides → `style.css`

## Out of Scope

- Desktop editor layout changes.
- Changing entry data, save behavior, or World Info APIs.
- Restoring the hidden `WIEntryBottomControls` block.
- Changing the meaning of any field or button.

## Approved Mobile Row Layout

The following rows were explicitly approved by the user. Each field keeps its own label above it. Rows 1–3 are in the **header area** (`.inline-drawer-header`); rows 4–16 are in the **content area** (`.inline-drawer-content > .world_entry_edit`).

1. Row 1: active toggle + entry title + entry state (🔵🟢🔗 selector) — state stays with title because they share the same DOM parent (`.WIEntryTitleAndStatus`) and cannot be CSS-separated
2. Row 2: position + depth + order + trigger percentage — equal-width columns
3. Row 3: move/copy + duplicate + delete action buttons — remain in the header; cannot share a row with outlet name due to DOM separation (see note below)
4. Row 4: outlet name — first content row; full-width, standalone
5. Row 5: primary keywords
6. Row 6: logic
7. Row 7: optional filter
8. Row 8: content meta strip above the content textarea
9. Row 9: content textarea
10. Row 10: scan depth + recursion level + automation ID
11. Row 11: case-sensitive + whole words + group scoring
12. Row 12: inclusion group + group weight
13. Row 13: sticky + cooldown + delay
14. Row 14: filter to characters or tags
15. Row 15: filter to generation triggers
16. Row 16: additional matching sources section with two even checkbox columns

Additional agreed rules:

- Mobile only for now.
- Rows should wrap when needed.
- Row 2 fields should use equal-width columns.
- Action buttons stay icon-only.
- Labels sit on top of their own fields.
- The old shared desktop-style header titles row should be removed as a separate mobile row.
- `WIEntryBottomControls` stays hidden.

**DOM notes (from pre-implementation review, March 10 2026):**

- The entry state selector (`select[name='entryStateSelector']`) is inside `.WIEntryTitleAndStatus` alongside the title field. CSS cannot separate it into a different row without JS. Decision: keep state in Row 1 with toggle + title.
- The action buttons (`.move_entry_button`, `.duplicate_entry_button`, `.delete_entry_button`) are in `.inline-drawer-header`, while outlet name is in `[name='perEntryOverridesBlock']` inside `.inline-drawer-content`. These are in different DOM sections and cannot share a CSS row. Decision: keep separate (CSS only, no JS DOM moves).
- Automation ID (`input[name='automationId']`) is inside `[name='perEntryOverridesBlock']` with scan depth and recursion level. Decision: append it to Row 10 as a third field.

## Implementation Plan

- [x] Inspect the current mobile editor selectors in `style.css` around `.stwid--editor`, `.world_entry`, `.world_entry_form`, `.inline-drawer-header`, `.WIEntryTitleAndStatus`, `.WIEnteryHeaderControls`, `[name='PositionBlock']`, `[name='contentAndCharFilterBlock']`, and `.inline-drawer-content` to map each approved mobile row onto the existing DOM structure.
- [x] Add a dedicated mobile-only layout block in `style.css` at `@media screen and (max-width: 1000px)` for the entry header area so Row 1 (active toggle + title + state) groups together, Row 2 (position + depth + order + probability) becomes an equal-width row below it, and Row 3 (action buttons) flows after.
- [x] (Already done) The `#WIEntryHeaderTitlesPC` desktop label strip is hidden on mobile by the existing rule `.stwid--editor #WIEntryHeaderTitlesPC { display: none; }` — no change needed.
- [x] Rework the mobile content section in `style.css` so `[name='perEntryOverridesBlock']` starts with outlet name (Row 4) as its own full-width row.
- [x] Rework the mobile keyword and filter sections in `style.css` so `Primary Keywords` (Row 5), `Logic` (Row 6), and `Optional Filter` (Row 7) each become their own full-width rows with their own labels above the real input.
- [x] Rework the mobile content section in `style.css` so the content meta strip (Row 8) stays directly above the textarea (Row 9), keeps its own internal wrapping behavior, and still leaves the textarea as the main content field below it.
- [x] Rework the mobile mid-editor settings rows in `style.css` so `Scan Depth + Recursion Level + Automation ID` (Row 10), `Case-Sensitive + Whole Words + Group Scoring` (Row 11), `Inclusion Group + Group Weight` (Row 12), and `Sticky + Cooldown + Delay` (Row 13) each render as even rows with top-aligned labels and balanced spacing.
- [x] Rework the mobile filter sections in `style.css` so `Filter to Characters or Tags` (Row 14) and `Filter to Generation Triggers` (Row 15) each become their own full-width rows while keeping labels and helper controls attached to the correct field.
- [x] Rework the mobile `Additional Matching Sources` section (Row 16) in `style.css` so its header stays above the options and the checkboxes render in two even columns on mobile.
- [x] Keep `[name='WIEntryBottomControls']` hidden in `style.css` and verify that no part of this re-layout accidentally makes that block visible again.
- [ ] Manually verify on a phone-sized screen:
  - Every visible field has its own label directly above it.
  - The approved row groupings match the documented layout.
  - Rows wrap cleanly instead of forcing sideways scrolling.
  - Row 2 fields appear balanced in width.
  - Row 16 (additional matching sources) checkboxes appear in two even columns.
  - `Selective`, `Use Probability`, and `Add Memo` remain hidden.

---

## After Implementation
*Implemented: March 10, 2026*

### What changed

`style.css`

- Added new mobile-only entry editor layout rules so the header now breaks into the approved three-row structure.
- Reordered the mobile override fields so outlet name stands alone first, then the grouped settings rows follow in the documented order.
- Converted the lower editor rows and the Additional Matching Sources section to mobile grid/wrap layouts so they stay readable without horizontal scrolling.
- Kept the hidden bottom checkbox block hidden.

### Risks / What might break

- This touches the mobile editor layout, so spacing could look off if SillyTavern changes the editor template structure later.
- The new header labels for the active toggle, title, and state are visual CSS labels, so they are not part of SillyTavern's built-in translated text system.
- The row placement depends on current DOM order in the SillyTavern template, so upstream template changes could shift one of the mobile rows.

### Manual checks

- Open an entry editor on a phone-sized screen and confirm the header shows: active toggle + title + state, then position/depth/order/trigger %, then the three action buttons.
- Confirm outlet name appears by itself first in the content area, then scan depth / recursion level / automation ID, then case-sensitive / whole words / group scoring.
- Scroll through the editor and confirm inclusion group + group weight, sticky + cooldown + delay, the two filter rows, and Additional Matching Sources all wrap cleanly without sideways scrolling.
- Confirm the content meta strip still sits directly above the content text box and its checkboxes stay readable.
- Confirm `Selective`, `Use Probability`, and `Add Memo` do not reappear anywhere in the mobile editor.
