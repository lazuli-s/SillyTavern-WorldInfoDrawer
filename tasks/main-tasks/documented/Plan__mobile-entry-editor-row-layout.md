# PLAN: Mobile entry editor row layout
*Created: March 10, 2026*
*Updated: March 12, 2026*

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

The following rows were explicitly approved by the user. Each field keeps its own label above it. Rows 1–4 are in the **header area** (`.inline-drawer-header`); rows 5–17 are in the **content area** (`.inline-drawer-content > .world_entry_edit`).

1. Row 1: active toggle + entry title + entry state (🔵🟢🔗 selector) — state stays with title because they share the same DOM parent (`.WIEntryTitleAndStatus`) and cannot be CSS-separated
2. Row 2: strategy + order + trigger percentage — equal-width columns
3. Row 3: position + contextual header slot — `Position` stays on the same row as `Depth` for `@D` entries or `Outlet Name` for `Outlet` entries
4. Row 4: move/copy + duplicate + delete action buttons — remain in the header
5. Row 5: primary keywords
6. Row 6: logic
7. Row 7: optional filter
8. Row 8: content meta strip above the content textarea
9. Row 9: content textarea
10. Row 10: recursion container
11. Row 11: scan depth + automation ID
12. Row 12: case-sensitive + whole words
13. Row 13: group container
14. Row 14: sticky + cooldown + delay
15. Row 15: filter to characters or tags
16. Row 16: filter to generation triggers
17. Row 17: additional matching sources section with two even checkbox columns

Additional agreed rules:

- Mobile only for now.
- Rows should wrap when needed.
- Row 2 fields should use equal-width columns.
- Row 3 keeps `Position` attached to the active contextual field (`Depth` or `Outlet Name`) instead of splitting them across separate rows.
- Action buttons stay icon-only.
- Labels sit on top of their own fields.
- Recursion container layout:
  - Row 10.1: delay until recursion
  - Row 10.2: recursion level
- Group container layout:
  - Row 13.1: inclusion group
  - Row 13.2: group weight + group scoring
- The old shared desktop-style header titles row should be removed as a separate mobile row.
- `WIEntryBottomControls` stays hidden.

**DOM notes (from pre-implementation review, March 10 2026):**

- The entry state selector (`select[name='entryStateSelector']`) is inside `.WIEntryTitleAndStatus` alongside the title field. CSS cannot separate it into a different row without JS. Decision: keep state in Row 1 with toggle + title.
- The action buttons (`.move_entry_button`, `.duplicate_entry_button`, `.delete_entry_button`) are in `.inline-drawer-header`. Decision: keep them in the header as their own row.
- `Depth` (`input[name='depth']`) and `Outlet Name` (`input[name='outletName']`) never appear at the same time because they depend on different `position` values. Decision: keep `Position` in the same shared mobile header row and let CSS show the active companion field (`Depth` or `Outlet Name`).
- `Delay until recursion` lives in the content flags area above the textarea, while `Recursion Level` (`input[name='delayUntilRecursionLevel']`) is inside `[name='perEntryOverridesBlock']`. Decision: use JS to regroup them into one mobile-only recursion container.
- `Automation ID` (`input[name='automationId']`) is inside `[name='perEntryOverridesBlock']` with scan depth and recursion level. After moving recursion level into its own mobile container, `Automation ID` stays paired with `Scan Depth`.

## Current Mobile Container Map

The mobile editor now uses the following named containers and helper wrappers.
This list reflects the current implementation in `src/editor-panel/editor-panel.js`
and `style.css`.

### Primary mobile layout containers

| Container | Purpose |
|---|---|
| `stwid--editorTitleRow` | Mobile header Row 1: active toggle + title/memo |
| `stwid--editorMainSettingsRow` | Mobile header Row 2: strategy + order + trigger percentage |
| `stwid--editorHeaderContextRow` | Mobile header Row 3: shared contextual row for `Position` plus `Depth` or `Outlet Name` |
| `stwid--editorActionsRow` | Mobile header Row 4: move/copy + duplicate + delete buttons |
| `stwid--editorKeywordsAndFiltersSection` | Main stacked section that contains `Primary Keywords`, `Logic`, and `Optional Filter` |
| `stwid--editorContentHeaderRow` | Content header row: `Content` label + expand buttons + token/UID text |
| `stwid--editorContentBodySection` | Content textarea section |
| `stwid--editorContentFlagsSection` | Temporary mobile wrapper used while content checkboxes are regrouped into later sections |
| `stwid--editorContentSettingsSection` | Parent mobile section directly under `Content`; contains budget and recursion controls |
| `stwid--editorBudgetRow` | First row inside the content settings section: `Ignore budget` |
| `stwid--editorRecursionSection` | Recursion subsection inside the content settings section |
| `stwid--editorRecursionMetaRow` | Recursion settings row: `Scan Depth` + `Case-Sensitive` + `Whole Words` |
| `stwid--editorGroupSection` | Group section container |
| `stwid--editorTimingRow` | Timing row: `Sticky` + `Cooldown` + `Delay` |
| `stwid--editorCharacterTagFilterSection` | `Filter to Characters or Tags` section |
| `stwid--editorTriggerFilterSection` | `Filter to Generation Triggers` section |

### Mobile helper subcontainers and markers

| Container | Purpose |
|---|---|
| `stwid--editorHeaderToggleSlot` | Small slot that holds the active toggle inside `stwid--editorTitleRow` |
| `stwid--editorHeaderTitleControl` | Title/memo field wrapper inside `stwid--editorTitleRow` |
| `stwid--editorHeaderStrategy` | Strategy field wrapper inserted into `stwid--editorMainSettingsRow` |
| `stwid--editorHeaderContextPosition` | Marker on the `Position` control inside the shared contextual header row |
| `stwid--editorHeaderContextDepth` | Marker on the `Depth` control inside the shared contextual row |
| `stwid--editorHeaderContextOutlet` | Marker on the `Outlet Name` control inside the shared contextual row |
| `stwid--editorGroupSectionPrimary` | First row inside the group section: `Inclusion Group` |
| `stwid--editorGroupSectionSecondary` | Second row inside the group section: `Group Weight` + `Group Scoring` |
| `stwid--editorRecursionGuardsRow` | First visible row inside the recursion subsection: `Non-recursable` + `Prevent further recursion` |
| `stwid--editorRecursionDelayRow` | Second visible row inside the recursion subsection: `Delay until recursion` + `Recursion Level` |
| `stwid--editorRecursionToggleRow` | Wrapper slot for the `Delay until recursion` checkbox inside `stwid--editorRecursionDelayRow` |
| `stwid--editorRecursionLevelControl` | `Recursion Level` control inside `stwid--editorRecursionDelayRow` |
| `stwid--editorContentFlagsRow` | Existing mobile wrapper class still used internally alongside `stwid--editorContentFlagsSection` for selector compatibility |
| `stwid--editorHeaderControl` | Normalized mobile header control marker used during JS regrouping |
| `stwid--editorHeaderLabel` | Mobile-generated top label used on regrouped header fields |

## Implementation Plan

- [x] Inspect the current mobile editor selectors in `style.css` around `.stwid--editor`, `.world_entry`, `.world_entry_form`, `.inline-drawer-header`, `.WIEntryTitleAndStatus`, `.WIEnteryHeaderControls`, `[name='PositionBlock']`, `[name='contentAndCharFilterBlock']`, and `.inline-drawer-content` to map each approved mobile row onto the existing DOM structure.
- [x] Add a dedicated mobile-only layout block in `style.css` at `@media screen and (max-width: 1000px)` for the entry header area so Row 1 (active toggle + title + state) groups together, Row 2 (strategy + order + probability) becomes an equal-width row below it, Row 3 keeps `Position` together with the active contextual field (`Depth` or `Outlet Name`), and the action buttons (Row 4) flow after.
- [x] (Already done) The `#WIEntryHeaderTitlesPC` desktop label strip is hidden on mobile by the existing rule `.stwid--editor #WIEntryHeaderTitlesPC { display: none; }` — no change needed.
- [x] Rework the mobile header/content split in `style.css` and `src/editor-panel/editor-panel.js` so `Position`, `Depth`, and `Outlet Name` share one mobile-only contextual header row instead of occupying separate content/header rows.
- [x] Rework the mobile keyword and filter sections in `style.css` so `Primary Keywords` (Row 5), `Logic` (Row 6), and `Optional Filter` (Row 7) each become their own full-width rows with their own labels above the real input.
- [x] Rework the mobile content section in `style.css` so the content meta strip (Row 8) stays directly above the textarea (Row 9), keeps its own internal wrapping behavior, and still leaves the textarea as the main content field below it.
- [x] Rework the mobile mid-editor settings rows in `style.css` and `src/editor-panel/editor-panel.js` so a mobile-only recursion container groups `Delay until recursion` with `Recursion Level` (Row 10), a dedicated recursion settings row groups `Scan Depth + Case-Sensitive + Whole Words`, `Automation ID` remains on its own row below, a mobile-only `Group` container renders `Inclusion Group` on the first row and `Group Weight + Group Scoring` on the second row (Row 13), and `Sticky + Cooldown + Delay` (Row 14) render with top-aligned labels and balanced spacing.
- [x] Rework the mobile filter sections in `style.css` so `Filter to Characters or Tags` (Row 15) and `Filter to Generation Triggers` (Row 16) each become their own full-width rows while keeping labels and helper controls attached to the correct field.
- [x] Rework the mobile `Additional Matching Sources` section (Row 17) in `style.css` so its header stays above the options and the checkboxes render in two even columns on mobile.
- [x] Keep `[name='WIEntryBottomControls']` hidden in `style.css` and verify that no part of this re-layout accidentally makes that block visible again.
- [ ] Manually verify on a phone-sized screen:
  - Every visible field has its own label directly above it.
  - The approved row groupings match the documented layout.
  - Rows wrap cleanly instead of forcing sideways scrolling.
  - Row 2 fields appear balanced in width.
  - Row 17 (additional matching sources) checkboxes appear in two even columns.
  - `Selective`, `Use Probability`, and `Add Memo` remain hidden.

---

## After Implementation
*Implemented: March 10, 2026*

### What changed

`style.css`, `src/editor-panel/editor-panel.js`

- Added new mobile-only entry editor layout rules so the header now breaks into the approved four-row structure.
- Added JS-assisted mobile regrouping so the shared contextual header row keeps `Position` paired with `Depth` or `Outlet Name`, while the recursion controls and group controls stay together lower in the form.
- Added explicit named mobile containers for the header, content, recursion, budget, group, timing, and filter areas so the mobile layout now has stable container names instead of relying on anonymous template rows.
- Converted the lower editor rows and the Additional Matching Sources section to mobile grid/wrap layouts so they stay readable without horizontal scrolling.
- Kept the hidden bottom checkbox block hidden.

### Risks / What might break

- This touches the mobile editor layout, so spacing could look off if SillyTavern changes the editor template structure later.
- The new header labels for the active toggle, title, and state are visual CSS labels, so they are not part of SillyTavern's built-in translated text system.
- The row placement depends on current DOM order in the SillyTavern template, so upstream template changes could shift one of the mobile rows.

### Manual checks

- Open an entry editor on a phone-sized screen and confirm the header shows: active toggle + title + state, then strategy / order / trigger %, then the contextual header row (`Position` plus `Depth` for `@D` entries or `Outlet Name` for `Outlet` entries), then the three action buttons.
- Confirm the content area shows the content settings section directly under `Content`, with `Ignore budget` first, then the recursion subsection (`Non-recursable` + `Prevent further recursion`, followed by `Delay until recursion` + `Recursion Level`), then the recursion settings row (`Scan Depth` + `Case-Sensitive` + `Whole Words`), then `Automation ID`.
- Scroll through the editor and confirm the mobile Group container shows inclusion group on its own row, then group weight + group scoring beneath it, followed by sticky + cooldown + delay, and confirm the two filter rows plus Additional Matching Sources all wrap cleanly without sideways scrolling.
- Confirm the content meta strip still sits directly above the content text box and its checkboxes stay readable.
- Confirm `Selective`, `Use Probability`, and `Add Memo` do not reappear anywhere in the mobile editor.
