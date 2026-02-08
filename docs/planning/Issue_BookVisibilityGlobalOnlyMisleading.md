# DETAILED ISSUE: Book Visibility - Global only is misleading

- User Report
  > "there are books linked to chat, persona, char, and globally active books. because sometimes the extension only shows 'globally active', leading the user to think that no other book is going to be added to the AI context."

- Mental Map
  1. The user opens the WorldInfo Drawer and sees books with different source relationships: global activation (`selected_world_info`) and source links (chat, persona, character).
  2. The current list filter UI includes an `Active` control (`stwid--filterActive`) that maps only to global activation state, not to the full set of source-linked books.
  3. When that filter is enabled, the extension hides any book not globally active, even if the same book is linked through chat/persona/character.
  4. The user mentally interprets `Active` as "will participate in context," but in current behavior it means only "globally active in `selected_world_info`."
  5. This creates a UI-language mismatch: visibility suggests exclusion from context, while runtime source-link logic can still include other books.
  6. The extension already computes and renders source-link indicators (chat/persona/character) on book rows, but these indicators are informational and not currently the main filter driver.
  7. Source-link refresh happens through event-driven synchronization in `index.js` (World Info updates plus context-related events), so row icons can be correct while list filtering is still global-only.
  8. Because filtering and source indicators are decoupled, users can see an empty or reduced list and infer "nothing else is active," even when source-linked books are still eligible.
  9. The expected UX direction is a clearer `Book Visibility` model that distinguishes categories and exposes an `All Active` union view (global + chat + persona + character).
  10. Temporary coexistence is required: keep the old global `Active` filter while introducing the new visibility control, to avoid abrupt behavior change and allow transition.
  11. `All Active` must be defined as "books currently eligible by source links" (union, deduplicated by book name), not as a guarantee that every entry will inject this generation.
  12. The control should keep selection state visible without opening the menu every time (dropdown + inline chips), so the user can immediately verify what visibility rule is currently applied.

- **Goal**
  Implement a new `Book Visibility` filter control that clearly communicates which book category is currently being shown (`All Active`, `Global`, `Chat`, `Persona`, `Character`) while temporarily preserving the legacy `Active` checkbox behavior. The new default is always `All Active`, and the UI must show the current selection at a glance using inline chips and consistent source icons.

- **Extension Modules**
  1. `src/listPanel.js`: Extend the existing filter row (`setupFilter`) to add the `Book Visibility` dropdown + inline chips; reuse existing source icon definitions; apply visibility classes on book rows using current cache and source-link state.
  2. `index.js`: Reuse current source-link refresh pipeline (`refreshBookSourceLinks`) and ensure list filtering is reapplied when source-link state changes.
  3. `style.css`: Add targeted styles for the new control (menu button/menu/chips) scoped to the list filter row, reusing existing extension style tokens and menu/button patterns.
  4. `FEATURE_MAP.md` and `ARCHITECTURE.md`: Update documentation to record the new control surface and filtering behavior ownership once implementation is complete.

- **ST Context**
  1. Global active state: `selected_world_info` (SillyTavern-owned activation list).
  2. Source-link state already computed by extension: `lorebookSourceLinks` via `buildLorebookSourceLinks()` in `index.js`.
  3. Inputs used for source-link computation: `chat_metadata[METADATA_KEY]`, `power_user.persona_description_lorebook`, `characters`, `this_chid`, `groups`, `selected_group`, and `world_info.charLore` mapping.
  4. Sync events already wired: `WORLDINFO_UPDATED`, `WORLDINFO_SETTINGS_UPDATED`, `CHAT_CHANGED`, `GROUP_UPDATED`, `CHARACTER_EDITED`, `CHARACTER_PAGE_LOADED`, `SETTINGS_UPDATED`.
  5. Selector-change sync already wired: `.chat_world_info_selector` and `.persona_world_info_selector` change handler triggers source-link recompute.

- **Decision Points**
  1. Filter composition while both controls exist: keep legacy `Active` checkbox as an additive filter (logical AND) so existing behavior is preserved.
  2. `All Active` definition: union of `Global + Chat + Persona + Character` per book, deduplicated by book name.
  3. Selection model: `Book Visibility` remains single-choice (one mode at a time), while inline chips show current mode and legacy `Active` state when enabled.
  4. Icon mapping for options/chips: reuse `SOURCE_ICON_DEFINITIONS` icons for Chat/Persona/Character; reuse an existing extension icon class for Global (`fa-toggle-on`) to avoid introducing a new icon language.
  5. Search behavior: unchanged in this fix (search classes and search logic remain untouched).

- **Evidence-based fix**
  1. Reuse existing `setupFilter()` in `src/listPanel.js` and introduce one new in-module mode state (default `allActive`) for the new control.
  2. Reuse existing source-link access (`state.getBookSourceLinks(name)`) plus `selected_world_info` to resolve a book's visibility flags (`global/chat/persona/character`).
  3. Extend current `applyActiveFilter()` to become the single filter applier for both controls, keeping `stwid--filter-active` for the legacy checkbox and adding `stwid--filter-visibility` for the dropdown mode.
  4. Build a small dropdown menu in the filter row using existing extension menu/button styling patterns (`stwid--columnMenuButton` / `stwid--columnMenu`) with five options: `All Active`, `Global`, `Chat`, `Persona`, `Character`.
  5. Render inline chips next to the dropdown trigger so current state is always visible; include icons beside chip labels and dropdown option labels.
  6. Keep book-row source icons unchanged; only list visibility logic changes.
  7. On every source-link refresh in `index.js`, reapply list filters after updating source-link state so visibility mode reacts immediately to context changes.
  8. Keep search logic and folder toggle logic intact; rely on existing `updateFolderActiveToggles()` after filter application.

- **Risks/cons**
  1. Temporary dual-filter behavior can confuse users if both `Active` and `Book Visibility` are restrictive at the same time (expected during transition period).
  2. Reapplying filters on every source-link refresh can increase DOM class toggling work for very large lorebook lists.
  3. If the `Global` icon choice is unclear, users may still misread that specific option until tooltip text is tuned.

- **Smallest Change Set Checklist**
  [x] In `src/listPanel.js`, add one `bookVisibilityMode` state variable with default `allActive` and references for dropdown/chips DOM.
  [x] In `src/listPanel.js`, add one helper that computes per-book visibility flags from `selected_world_info` and `state.getBookSourceLinks`.
  [x] In `src/listPanel.js`, extend `applyActiveFilter()` to apply both legacy and new visibility filtering classes in one pass.
  [x] In `src/listPanel.js`, add `Book Visibility` dropdown UI (5 options) with icons beside each option label.
  [x] In `src/listPanel.js`, add inline chips renderer that always shows current visibility mode (and legacy `Active` when enabled).
  [x] In `index.js`, ensure source-link refresh path triggers list filter reapplication after source-link map updates.
  [x] In `style.css`, add scoped styles for the new filter control/menu/chips using existing extension style tokens.
  [x] Update `FEATURE_MAP.md` and `ARCHITECTURE.md` to document the new control surface and filter behavior ownership.

## AFTER IMPLEMENTATION

## What changed

- `src/listPanel.js`
  - Added `Book Visibility` mode state (`allActive` default), dropdown UI, and inline chips in the filter row.
  - Added per-book visibility flag helper using global active state + source-link state.
  - Extended `applyActiveFilter()` to apply both `stwid--filter-active` and `stwid--filter-visibility`.
- `index.js`
  - Updated source-link refresh flow to reapply list filtering immediately after source-link map updates.
- `style.css`
  - Added scoped styles for the Book Visibility control/menu/chips.
  - Added `stwid--filter-visibility` to the hidden-book class rules.
- `FEATURE_MAP.md`
  - Documented Book Visibility ownership and source-link-driven filter reapplication.
- `ARCHITECTURE.md`
  - Documented new list-panel visibility model and index-level source-link/filter sync behavior.

## Risks/What might break

- Visibility filtering in `src/listPanel.js`:
  - This touches list hide/show logic, so it might hide more books than expected if both `Active` and `Book Visibility` are restrictive.
  - Mode chips/menu state could look out of sync if future code changes mutate filter state without calling `applyActiveFilter()`.
- Source-link refresh hook in `index.js`:
  - This touches source-link update timing, so it might increase class toggling work on very large lorebook lists.
  - Frequent context-link updates may make the visible list change more often while the user is browsing.
- Filter-row UI styling in `style.css`:
  - This touches list filter layout, so it might wrap controls differently on narrow widths.
  - Menu/chip spacing could need tuning with unusual themes or custom font scaling.

## Manual checks

- Open the drawer without changing filters; confirm only books in `All Active` (Global/Chat/Persona/Character union) are visible.
  - Success looks like: non-linked, non-global books are hidden by default.
- Change `Book Visibility` across `Global`, `Chat`, `Persona`, and `Character`; confirm each mode only shows matching books.
  - Success looks like: list changes immediately and chips show the selected mode.
- Enable legacy `Active` checkbox while a non-Global mode is selected; confirm behavior is additive (AND).
  - Success looks like: only globally active books that also match the selected mode remain visible.
- Change chat/persona selectors (or switch character/group) to alter source links; confirm visibility updates immediately.
  - Success looks like: list reacts without manual refresh and row source icons stay correct.
- Use search (with and without `Entries`) while changing visibility mode; confirm search behavior remains unchanged.
  - Success looks like: search still filters as before, on top of visibility filtering.

## NEW ISSUES/FIXES AFTER IMPLEMENTATION

### 1) Book Visibility control layout and selection model mismatch

#### User Report
  > "The css is bad. I want this new feature to be on it's own SEPARATE ROW. Change the global icon to a 'world globe'. Global, chat, persona and character must be all MULTISELECT (except all active option)"

#### Mental Map
  1. The user opens the filter area and sees the new `Book Visibility` control mixed into the same row as search/options, which feels visually crowded and harder to scan.
  2. The control currently behaves like a single-choice mode (`bookVisibilityMode`), so selecting one source (for example `Chat`) replaces the previous one instead of combining sources.
  3. The user expectation is category-combination behavior: `Global`, `Chat`, `Persona`, and `Character` should be selectable together as a set.
  4. The current `All Active` option is a union preset (`global OR chat OR persona OR character`) and is conceptually different from manual multi-select combinations, so it should remain exclusive.
  5. The icon language currently uses a toggle icon for `Global` (`fa-toggle-on`), but the user expects semantic consistency with source meaning (world/global scope), so a globe icon is clearer.
  6. Filtering is applied in `applyActiveFilter()` and row visibility is class-based (`stwid--filter-active`, `stwid--filter-visibility`), so this bug is primarily UI-state modeling and filter-condition composition, not data persistence.
  7. Source-link updates already trigger re-filtering through `refreshBookSourceLinks()` in `index.js`, so once selection model is corrected, timing/event wiring should continue to work without new event surfaces.

#### TASK CHECKLIST
  Smallest Change Set Checklist:
  [x] In `src/listPanel.js`, replace single `bookVisibilityMode` state with a multi-select source set for `global/chat/persona/character`, plus an explicit `allActive` exclusive mode.
  [x] In `src/listPanel.js`, update the visibility menu option behavior so `All Active` clears manual selections, and manual selections disable `All Active`.
  [x] In `src/listPanel.js`, update `applyActiveFilter()` conditions to match multi-select semantics (`show if any selected source flag matches`) while preserving legacy `Active` checkbox as additive AND filter.
  [x] In `src/listPanel.js`, switch the `Global` option/chip icon from toggle to globe (`fa-globe` or `fa-earth-americas`, whichever matches existing icon set usage).
  [x] In `style.css`, move Book Visibility UI into its own dedicated filter row container under the current search row using existing spacing/tokens.
  [x] In `style.css`, adjust chips/menu styles for the two-row layout so wrapping and focus behavior remain readable on narrow widths.
  [x] In this markdown file, mark checklist completion and append post-implementation notes for this new issue block.

#### AFTER IMPLEMENTATION NOTES
  - `Book Visibility` now renders in its own filter row below the search row.
  - `Global/Chat/Persona/Character` now behave as multiselect filters; `All Active` is exclusive and resets manual selection.
  - `Global` now uses a globe icon (`fa-globe`) in the menu/chips.
