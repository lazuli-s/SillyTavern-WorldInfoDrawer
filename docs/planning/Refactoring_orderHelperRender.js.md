# Refactoring Plan: orderHelperRender.js

## 1. Mental Model of the Current File
- This file builds the full Order Helper screen each time it opens.
- It receives many helper functions and shared objects from `orderHelper.js`, then uses those to render controls, filters, and table rows.
- It creates almost all UI elements directly in one large flow: top action bar, filter panel, table headers, and one row per entry.
- It wires many click/change listeners. Most listeners do three things in sequence: update in-memory entry data, update visual state, then save with `saveWorldInfo`.
- It supports both row ordering and field editing in the same place. That includes drag and drop, move up/down buttons, and "Apply Order" recalculation.
- It also runs script-based row filtering using `SlashCommandParser`, and shows syntax-highlighted script text with `hljs`.
- Data flow in plain terms:
- Input data comes from `getOrderHelperEntries(...)` (which reads from `cache`, and sometimes from current table DOM order).
- UI actions mutate `cache[book].entries[uid]` values.
- Filter actions mutate `orderHelperState.filters` and row dataset flags.
- Some UI settings are persisted to `localStorage` (`hide keys`, `column visibility`, `start`, `step`, `direction`, `script input`).
- Save calls persist book changes through `saveWorldInfo(book, buildSavePayload(book), true)`.
- Main sources of truth:
- Lorebook entry truth for edits: `cache[book].entries[uid]`.
- Order Helper UI/session truth: `orderHelperState`.
- Persisted UI preferences: `localStorage` keys used by this file.
- Current rendered rows and controls: `dom.order.*` references and row dataset flags.
- External template contract: `#entry_edit_template` controls for enabled/strategy/position.

## 2. Why This File Is Hard to Change
- The file is very large and centered around one huge renderer function, so small edits require understanding many unrelated parts first.
- Responsibilities are mixed together:
- Building DOM structure
- Managing transient UI state
- Persisting user preferences
- Running filters
- Updating entry data
- Saving data
- There is repeated logic for multiple dropdown filter menus (open/close/outside click/checkbox handling/indicator updates), which increases copy-paste risk.
- Hidden state exists in local closures, for example:
- `refreshOutletFilterIndicator`, `refreshAutomationIdFilterIndicator`, `refreshGroupFilterIndicator`
- `filterStack` for script filter race control
- `updateOutlet` function created per row
- Row filtering depends on string-based dataset keys (`stwidFilter...`) spread across many places. A typo can silently break filtering.
- The file is tightly coupled to adjacent modules and DOM contracts:
- `orderHelper.js` supplies most behavior hooks
- `orderHelperFilters.js` owns filter rules but this file drives when they run
- `#entry_edit_template` must exist in host DOM
- `cache` and list-row DOM are updated together
- Many listeners save immediately. This is behaviorally correct now, but it makes changes risky because one missed save call can cause silent data drift.
- Uncertainty to keep in mind: there is no evidence in this file that automated tests cover the full interactive matrix, so manual checks are critical after each phase.

## 3. Refactoring Phases

### Phase 1: Structure and Reading Order
- Goal (one sentence): Make the file easier to read without changing any runtime behavior.
- What is allowed to change:
- Reorder code blocks inside the file so related sections are grouped (action bar, filter panel, table header filters, row cells, final mount).
- Rename local variables where names are unclear, while keeping meaning identical.
- Add short plain-language comments that mark section boundaries and important assumptions.
- Replace repeated literal lists (for columns and labels) with one clearly located definition in the same file.
- What must NOT change:
- No event wiring changes.
- No class names, data attributes, or localStorage keys changes.
- No API signature changes (`createOrderHelperRenderer`, `renderOrderHelper`).
- No behavior changes in sorting, filtering, saving, or row rendering.
- Why this phase is low-risk:
- It is layout and naming cleanup only; logic paths stay the same.
- What becomes clearer or safer after this phase:
- Future edits can target one section at a time instead of scanning the entire file.
- Reviewers can quickly spot whether a change touched behavior or only organization.

### Phase 2: State and Side-Effect Clarity
- Goal (one sentence): Make state updates and save triggers explicit so behavior is easier to reason about.
- What is allowed to change:
- Standardize the order of operations inside listeners (update data, update UI, apply filters if needed, save).
- Make all local state touchpoints clearly visible near where they are used (`orderHelperState`, `dom.order`, `cache`, localStorage).
- Add clear comments for non-obvious behavior, such as why script filter uses a stack and why some filter indicators are refreshed later.
- What must NOT change:
- No changes to when or how often saves happen.
- No changes to filter semantics or selection semantics.
- No changes to script filter execution rules.
- Why this phase is low-risk:
- It clarifies existing behavior rather than introducing new flows.
- What becomes clearer or safer after this phase:
- Lower chance of accidentally breaking persistence when editing a listener.
- Easier debugging when a UI update appears but saved data does not match.

### Phase 3: Responsibility Separation Inside the File
- Goal (one sentence): Reduce cognitive load by making each responsibility live in one obvious region of the file.
- What is allowed to change:
- Separate the file into clearly bounded regions for:
- Global control bar and table-wide actions
- Filter panel and script filter UI
- Header-level filter menus
- Row construction and per-field edit handlers
- Keep repeated behavior aligned across regions (for example, same dropdown open/close pattern everywhere it appears).
- Keep shared constants and repeated labels in one place so future updates happen once.
- What must NOT change:
- No new modules.
- No public API changes.
- No changes to cross-module ownership (`orderHelper.js` remains orchestrator, `orderHelperFilters.js` remains filter logic owner).
- Why this phase is low-risk:
- Ownership boundaries stay the same; this is file-internal clarity work.
- What becomes clearer or safer after this phase:
- New contributors can safely modify one responsibility without touching unrelated logic.
- Lower risk of accidental regressions from copy-paste edits.

### Phase 4: Optional Future-Proofing (No Behavior Change)
- Goal (one sentence): Add lightweight guardrails that make future refactors safer.
- What is allowed to change:
- Add explicit invariants in comments near sensitive paths (for example: required DOM template fields, dataset filter keys, and save expectations).
- Add a short manual verification checklist comment block near `renderOrderHelper` entry points.
- Normalize user-facing warning/error wording where messages already exist, without changing conditions.
- What must NOT change:
- No new features.
- No performance rewrites.
- No UI redesign.
- Why this phase is low-risk:
- It documents and stabilizes current behavior rather than altering it.
- What becomes clearer or safer after this phase:
- Future maintainers have clear do-not-break rules before making edits.

## 4. Explicit Non-Goals
- Do not split logic into new files during this refactor.
- Do not redesign Order Helper UI or change column/filter behavior.
- Do not change how often or when `saveWorldInfo` is called.
- Do not replace host dependencies (`SlashCommandParser`, `hljs`, jQuery sortable).
- Do not rename storage keys, CSS classes, DOM data attributes, or entry field names.
- Do not alter integration boundaries with `orderHelper.js`, `orderHelperFilters.js`, `orderHelperState.js`, or SillyTavern-owned templates.
- Do not optimize for performance unless a clarity fix absolutely requires it.

## 5. Safety Checklist
- Invariants that must remain true after every phase:
- Opening Order Helper still renders the same controls, same columns, and same initial row selection state.
- Sort selection, custom order drag/drop, and move up/down controls still persist custom order correctly.
- "Apply Order" still updates only non-filtered and selected rows, with start/spacing/direction rules unchanged.
- Every inline field edit still updates the matching entry in `cache` and persists to the correct book.
- Strategy/position/recursion/outlet/automation/group/script filters still combine into the same final filtered rows.
- Column visibility and hide-keys toggles still persist through reload using the same localStorage keys.
- Entry link click still focuses the correct entry in the main list/editor.
- Missing `#entry_edit_template` controls still fail fast with a clear error.
- Observable signs of regression:
- A row visibly changes but reload reverts it.
- Filter button active state does not match selected filter options.
- Select-all icon state does not match row selection state.
- Drag reorder appears to work but custom order is lost after reopening.
- Script filter errors clear all rows unexpectedly instead of preserving previous results.
- Things to manually verify after changes:
- Open helper in "all active books" mode and in single-book mode.
- Edit at least one field in each editable column and confirm persistence.
- Toggle each filter family and confirm expected rows remain.
- Use script filter with a valid script and an invalid script.
- Test apply-order with both direction options and with filtered rows present.
- Toggle column visibility presets and individual columns, then reopen helper.
- Use drag, single-click move, and double-click jump move on visible rows.

---

## AFTER IMPLEMENTATION

### Task checklist

- [x] Phase 1: Structure and Reading Order
- [x] Phase 2: State and Side-Effect Clarity
- [x] Phase 3: Responsibility Separation Inside the File
- [x] Phase 4: Optional Future-Proofing

### What changed

**`src/orderHelperRender.js`**

- Extracted `TOGGLE_COLUMNS`, `TABLE_COLUMNS`, `NUMBER_COLUMN_KEYS`, and `RECURSION_OPTIONS` as named constants at factory level — the two previous inline `columns` arrays and the inline recursion options list are now a single source of truth.
- Added `wireMultiselectDropdown(menu, menuButton, menuWrap)` helper that replaces the repeated open/close/outside-click pattern that appeared in 6 separate dropdown blocks. Moved `errorEl` creation outside the `inp` block for clearer reading order.
- Added section boundary comments (`── Init`, `── Action Bar`, `── Filter Panel`, `── Table Header`, `── Table Body`, `── Mount`), Phase 2 state-flow comments on key listeners, and Phase 4 invariant comments near the template guard and `stwidFilter*` dataset keys.

### Risks / What might break

- **Column visibility dropdown**: The `setColumnVisibility` preset actions now close the menu via `menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER]` instead of a captured `closeMenu` variable. If the handler property were ever missing, the close step would silently no-op — but this cannot happen because `wireMultiselectDropdown` always writes it before any button can be clicked.
- **Recursion row builder**: The `addCheckbox` calls are now driven by `RECURSION_OPTIONS` instead of three explicit string literals. If a value or label in `RECURSION_OPTIONS` were wrong it would affect both the header filter and the row cells simultaneously — but the values are identical to what was there before.
- **All dropdown menus**: The shared `wireMultiselectDropdown` helper now handles open/close/outside-click for all 6 dropdown menus. A bug in that helper would affect every dropdown at once instead of just one.

### Manual checks

- Open Order Helper with multiple active books; confirm all rows and columns appear normally. **Success: table renders with correct entries.**
- Click each column filter (Strategy, Position, Recursion, Outlet, Automation ID, Inclusion Group); confirm the filter button highlights when options are deselected, and rows hide/show as expected. **Success: button is highlighted when filter is active, rows update immediately.**
- Open Column Visibility, click "SELECT ALL" and "MAIN COLUMNS"; confirm the table columns show/hide and the menu closes after each. **Success: menu closes and columns change.**
- Enable the script filter panel; type a valid script (`{{var::entry}}`), then type a broken script; confirm rows are preserved on error and an inline error message appears (not a popup). **Success: error shown inline, row state unchanged.**
- Edit one value in each of: Strategy, Position, Depth, Outlet, Inclusion Group, Order, Sticky, Cooldown, Delay, Automation ID, Trigger %, Recursion flags, Budget, Enabled toggle; close and reopen Order Helper; confirm each edit persisted. **Success: values match what was entered.**
- Drag a row to a new position, then reopen Order Helper; confirm the custom order survived. **Success: row is in the same position after reopen.**
- Use "Apply Order" with direction = down, then direction = up, with some rows filtered out; confirm only unfiltered, selected rows received new order values. **Success: filtered rows are skipped, order increments correctly.**
