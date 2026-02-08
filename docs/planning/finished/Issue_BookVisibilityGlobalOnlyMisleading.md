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

### 2) Book Visibility button text/affordance mismatch

#### User Report
  > "Remove stwid--bookVisibilityLabel. stwid--columnMenuWrap: change it to a dropdown menu button, and the default text must be 'Book Visibility' (the chips already show which ones are active). We need to add checkboxes to 'global, chat, persona and character' options, so the user knows they are multiselect."

#### Mental Map
  1. The user sees a separate text label (`stwid--bookVisibilityLabel`) plus a dropdown trigger, which duplicates the same concept and adds visual noise.
  2. The current dropdown trigger text is state-driven (`Global`, `2 Sources`, etc.), while chips already show active filters; this causes redundant or conflicting status signals.
  3. The expected interaction model is a stable control entrypoint: the trigger itself should read `Book Visibility` by default, and chips should be the only persistent state summary.
  4. The menu currently highlights selected items via active styling/`aria-pressed`, but without checkbox affordance users may miss that options are multiselect.
  5. Because selection logic is multiselect for `global/chat/persona/character` and exclusive for `allActive`, menu visuals should make that distinction explicit (checkboxes on multiselect options only).
  6. This is a UI-language/affordance issue; filter computation (`applyActiveFilter()` with source flags), event timing (`refreshBookSourceLinks()` reapply), and core ST ownership boundaries remain unchanged.
  7. The smallest safe change is to keep existing filter state variables and behavior, and only adjust the trigger text policy + option-row rendering in `setupFilter()` and local CSS selectors.

#### TASK CHECKLIST
  Smallest Change Set Checklist:
  [x] In `src/listPanel.js`, remove the standalone `stwid--bookVisibilityLabel` element from the Book Visibility row.
  [x] In `src/listPanel.js`, keep the dropdown trigger as the main control and set its label text to constant `Book Visibility` (do not mirror active selections there).
  [x] In `src/listPanel.js`, render a checkbox control for `Global`, `Chat`, `Persona`, and `Character` options inside the menu, bound to existing multiselect state.
  [x] In `src/listPanel.js`, keep `All Active` as exclusive and without a multiselect checkbox affordance.
  [x] In `src/listPanel.js`, keep chips as the active-selection indicator and ensure chip rendering remains source-of-truth for visible state summary.
  [x] In `style.css`, remove/reduce now-unused label styling (`.stwid--bookVisibilityLabel`) and adjust menu option layout to align icon + checkbox + text without changing unrelated controls.
  [x] In `style.css`, ensure focus/hover styles remain consistent with existing menu/button patterns.

#### AFTER IMPLEMENTATION NOTES
  - The Book Visibility row no longer renders a separate text label.
  - The dropdown trigger now has stable text (`Book Visibility`), while chips remain the active-state summary.
  - Multiselect options (`Global`, `Chat`, `Persona`, `Character`) now show checkbox affordance in the menu; `All Active` stays exclusive.

### 3) Visibility chips must wrap inside their own lane while staying anchored beside the button

#### User Report
  > "within the chip list, you can wrap to a line below. but it must always remain aligned to the book visibility button."

#### Mental Map
  1. The Book Visibility row has two visual parts: the left button/help cluster and the right chips area.
  2. Current layout lets the whole `stwid--bookVisibility` container wrap, so chips can drop below the button cluster instead of staying in the right-side lane.
  3. The desired behavior is not "no wrap"; it is "wrap only inside the chips area."
  4. In practice, this means the button block keeps fixed width on the left, while chips get the remaining width and can create second/third lines within that area.
  5. This is a CSS layout issue only (flex wrapping/sizing), not a filter logic/state/event issue.
  6. The smallest safe fix is to keep existing DOM and JS untouched, and change flex rules in `style.css`:
     - prevent wrapping on `.stwid--bookVisibility`
     - keep `.stwid--columnMenuWrap` fixed (`flex: 0 0 auto`)
     - let `.stwid--visibilityChips` grow/shrink and wrap internally (`flex: 1 1 auto; min-width: 0; flex-wrap: wrap`)

#### TASK CHECKLIST
  Smallest Change Set Checklist:
  [x] In `style.css`, make `.stwid--bookVisibility` a non-wrapping horizontal flex container across the full visibility row.
  [x] In `style.css`, keep `.stwid--columnMenuWrap` fixed-size so the button/help block stays anchored on the left.
  [x] In `style.css`, make `.stwid--visibilityChips` the flexible area that wraps internally to additional lines when needed.
  [x] In this markdown file, mark this checklist as complete after applying the CSS-only change.

#### AFTER IMPLEMENTATION NOTES
  - Chips now wrap only inside the chips area.
  - The chips area remains aligned beside the `Book Visibility` button/help block instead of dropping below it.

### 4) Book Visibility filters books but does not hide folders with no visible books

#### User Report
  > "when I select an option inside the book visibility, the list currently shows all folders, even the ones that have no active books. I want to change that - only show folders with active books when I set the book visibility."

#### Mental Map
  1. The user chooses a `Book Visibility` option (for example `Global`, `Chat`, `Persona`, or `Character`) expecting the list to narrow to only relevant content.
  2. Book rows are filtered correctly in `src/listPanel.js` by `applyActiveFilter()`, which toggles `stwid--filter-visibility` on each `.stwid--book`.
  3. Folder containers are created from folder registry/book metadata and remain rendered even when every child book in that folder is currently hidden by visibility filters.
  4. This produces a UI mismatch: books disappear, but empty-looking folders still remain in the list, making the filter feel incomplete or misleading.
  5. Folder active-toggle logic in `src/lorebookFolders.js` uses `getVisibleFolderBookNames(...)`, but that helper currently excludes only `stwid--filter-query` and `stwid--filter-active`; it does not treat `stwid--filter-visibility` as hidden.
  6. Timing/event flow already re-runs filtering after source-link and settings updates (`refreshBookSourceLinks()` and `WORLDINFO_SETTINGS_UPDATED` paths call `listPanelApi.applyActiveFilter()`), so the main gap is folder-level visibility reconciliation after those filter passes.
  7. `updateFolderActiveToggles()` currently updates checkbox state only; it does not hide/show folder roots based on whether any child books remain visible.
  8. The expected behavior is: when Book Visibility is applied, folders with zero currently visible books should be hidden from the list, and reappear automatically when matching books become visible again.

#### TASK CHECKLIST
  Smallest Change Set Checklist:
  [x] In `src/lorebookFolders.js`, update `getVisibleFolderBookNames(...)` so visibility-filtered books (`stwid--filter-visibility`) are treated as hidden, consistent with query/global filters.
  [x] In `src/listPanel.js`, add a small folder-visibility reconciliation pass (reuse `folderDoms` + cache DOM state) that hides folder roots when they have zero visible books and shows them otherwise.
  [x] In `src/listPanel.js`, call that folder-visibility pass wherever list filters are applied (`applyActiveFilter()` and search filter path) so folder visibility stays in sync with both visibility mode and search.
  [x] Keep existing book filtering, source-link icon rendering, and event subscriptions unchanged; only extend folder presentation logic.
  [ ] Validate behavior manually: switching Book Visibility modes should hide empty folders immediately and restore them when matching books return.

#### AFTER IMPLEMENTATION NOTES
  - Folder visibility now follows effective visible-book state (query + legacy active + book visibility filters).
  - Folders with zero visible books are now hidden and re-shown automatically when matching books become visible again.

### 5) Source icon tooltip is too generic for character/persona-linked books

#### User Report
  > "make it so the 'stwid--sourceIcon' tooltip shows which character or persona they are linked to.
Like: "Lorebook linked to character: Seraphina"
"Lorebook linked to active persona: Elara""

#### Mental Map
  1. The user looks at the source icons on each book row to understand why that book is considered active in context.
  2. Today, hovering those icons only shows generic text (`Character linked`, `Persona linked`) from `renderBookSourceLinks()` in `src/listPanel.js`, so the user does not learn *who* caused the link.
  3. The UI is already showing the correct icon timing-wise, because `index.js` recomputes source links via `refreshBookSourceLinks()` whenever chat/character/persona-related events fire.
  4. The data passed to the list is currently only booleans (`character/chat/persona`) from `buildLorebookSourceLinks()` in `index.js`, so `src/listPanel.js` cannot render specific names even if it wants to.
  5. Character-linked books can come from either the current character or group members (`selected_group` path), so one book may be linked by more than one character at once.
  6. Persona-linked books come from the active persona lorebook binding (`power_user.persona_description_lorebook`), so the tooltip needs persona display-name context in addition to the boolean flag.
  7. The bug is not about filtering or activation rules; it is about missing explanatory text in tooltip copy for existing source icons.
  8. The expected UX is: icon still indicates source type quickly, and tooltip gives concrete attribution (for example, `Lorebook linked to character: Seraphina` or `Lorebook linked to active persona: Elara`).
  9. This should stay a small extension-only change: enrich source-link metadata in the existing source-link map and reuse current icon render/update paths.

#### TASK CHECKLIST
  Smallest Change Set Checklist:
  [x] In `index.js`, extend `buildLorebookSourceLinks()` output to include optional attribution metadata (for example `characterNames[]`, `personaName`) while preserving existing boolean keys used by filters.
  [x] In `index.js`, collect character attribution names from the same logic that marks character-linked books (single character or group members), deduplicated and stable in order.
  [x] In `index.js`, resolve the active persona display name from existing ST context (with a safe fallback label when unavailable) when marking persona-linked books.
  [x] In `src/listPanel.js`, update `renderBookSourceLinks()` to build tooltip/aria-label text from attribution metadata for `character` and `persona` icons, with current generic fallback when metadata is absent.
  [x] In `src/listPanel.js`, keep icon set/class usage unchanged (`stwid--sourceIcon`, existing Font Awesome icons); only tooltip text behavior changes.
  [x] Keep `refreshBookSourceLinks()` and `updateAllBookSourceLinks()` flow unchanged except for passing richer source-link payloads through existing APIs.
  [ ] Validate manually: tooltip text updates correctly after chat switch, character/group switch, and persona switch without requiring page reload.

#### AFTER IMPLEMENTATION NOTES
  - `index.js` now enriches per-book source-link state with `characterNames` and `personaName` while keeping existing boolean keys unchanged for filtering.
  - Character-linked attribution is deduplicated and ordered by discovery order from current character/group member resolution.
  - Persona-linked attribution now resolves from active ST persona context with fallback behavior.
  - `src/listPanel.js` now renders source icon tooltips/aria labels using the richer metadata:
    - `Lorebook linked to character: <Name>`
    - `Lorebook linked to characters: <Name1>, <Name2>, ...`
    - `Lorebook linked to active persona: <Name>`
  - Existing icon classes, icon set, and source-link refresh/filter reapplication flow are unchanged.

### 6) Add an `All Books` preset to Book Visibility and make it the default

#### User Report
  > "Ok, we also need to add an option (not multiselect, a preset) right at the top of the book visibility dropdown to show All books (including the ones that are not active), and make this option the default one"

#### Mental Map
  1. The user opens the drawer and currently sees only books considered `All Active` by default, because `bookVisibilityMode` starts as `allActive`.
  2. In code, this default comes from `bookVisibilityMode` initialization and `initListPanel()` reset, and `applyActiveFilter()` then hides books where `flags.allActive` is false.
  3. `flags.allActive` is derived from `global OR chat OR persona OR character`, so any book not linked to those sources is hidden even before the user makes a visibility choice.
  4. The request is to add a new top-level preset that means "show everything in the list", including books with no active source links and no global activation.
  5. This new preset must be exclusive (like `All Active`), not part of the multiselect source set (`Global/Chat/Persona/Character`).
  6. The dropdown order matters: `All Books` should be the first option so it is immediately discoverable.
  7. The default selection should switch from `All Active` to `All Books`, which means changing initial filter state and menu/chip rendering defaults.
  8. Legacy `Active` checkbox behavior should remain additive (`AND`) on top, so enabling it still narrows list visibility to globally active books.
  9. Timing/event behavior should remain unchanged: source-link refresh (`refreshBookSourceLinks()`) still triggers `applyActiveFilter()`, but in `All Books` mode that re-filter pass should not hide anything by visibility rules.
  10. This is a small UI/filter-state adjustment inside extension-owned surfaces (`src/listPanel.js` and scoped style/docs if needed), with no SillyTavern core ownership changes.

#### TASK CHECKLIST
  Smallest Change Set Checklist:
  [x] In `src/listPanel.js`, add an exclusive `All Books` visibility mode constant and option metadata, placed first in `BOOK_VISIBILITY_OPTIONS`.
  [x] In `src/listPanel.js`, add tooltip copy for `All Books` clarifying it shows every book in the list (active and inactive).
  [x] In `src/listPanel.js`, change default visibility state initialization/reset from `All Active` to `All Books` (`bookVisibilityMode` module init + `initListPanel()`).
  [x] In `src/listPanel.js`, update menu click handling so `All Books` behaves as an exclusive preset (not multiselect), parallel to `All Active`.
  [x] In `src/listPanel.js`, update `applyActiveFilter()` so `All Books` mode never applies `stwid--filter-visibility` hiding (except legacy `Active` if checked).
  [x] In `src/listPanel.js`, update chip rendering logic so default chip is `All Books` and current preset remains visible at a glance.
  [x] Keep `Global/Chat/Persona/Character` multiselect behavior unchanged, and keep legacy `Active` checkbox as additive filter.
  [x] After implementation, update `FEATURE_MAP.md`/`ARCHITECTURE.md` only if behavior ownership wording needs to reflect the new default preset.

#### AFTER IMPLEMENTATION NOTES
  - `Book Visibility` now has `All Books` as the first dropdown option and default preset.
  - `All Books` is exclusive (preset), and `All Active` remains an exclusive preset.
  - Multiselect source filters (`Global`, `Chat`, `Persona`, `Character`) remain unchanged, and the legacy `Active` checkbox is still additive.
  - `FEATURE_MAP.md` and `ARCHITECTURE.md` were updated to reflect the new default/option model.
