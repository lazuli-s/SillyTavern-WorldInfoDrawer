# DETAILED IMPLEMENTATION PLAN: Lorebook Source Icons and Source Scope Filter (List Panel + Order Helper)

## Step S01: Define source classification and shared scope state without changing rendering
- Relevant file(s): `index.js`, `src/listPanel.js`, `src/orderHelper.js`, `src/lorebookFolders.js`
- Module responsibilities for this feature
  - `index.js`: gather runtime source bindings (global/character/chat/persona), expose read-only helpers to modules.
  - `src/listPanel.js`: consume source metadata for per-book rendering/filter decisions.
  - `src/orderHelper.js`: consume the same scope selection to decide which books feed rows.
  - `src/lorebookFolders.js`: folder active state should continue to use global active only unless explicitly changed.
- Decision point: where logic likely needs to change
  - Create one extension-level source map keyed by book name, with details like `kind`, `priority`, and optional character names for tooltip text.
  - Define source priority rule as `character > chat > persona > global/none` for single-icon rendering.
  - Define scope selection model for visibility and order-helper filtering as multi-select set: `{global, character, chat, persona}`.
- Smallest likely change set (description only, no code)
  [ ] Add a source-classification helper in extension code (no vendor edits).
  [ ] Pass `getBookSourceInfo` and `getSourceScopeSelection` callbacks into `initListPanel` and `initOrderHelper`.
  [ ] Add a lightweight in-memory state object for selected source scopes, defaulting to all selected.
  [ ] Hook re-computation to existing update events (`WORLDINFO_UPDATED`, `WORLDINFO_SETTINGS_UPDATED`, chat/persona/character context changes where available).
- Invariants: what must NOT change
  - Current global active toggle behavior (checkboxes and `#world_info` sync) remains unchanged.
  - Existing search, folder grouping, drag/drop, and selection behavior remains unchanged.
  - No modifications under `/vendor/SillyTavern`.
- Risks: 1-3 plausible regressions/side effects
  - Stale source markers when chat/character/persona context changes but map is not refreshed.
  - Source map computation includes invalid/missing lorebook names not present in `world_names`.
  - Group-chat character mapping may not match user expectation without explicit character-name resolution fallback.
- Manual test steps: exact UI actions + expected result
  - Open drawer with no scope filter changes. Expected: visual behavior unchanged before icon/filter additions.
  - Switch chats/characters/personas and refresh drawer. Expected: no errors, no loss of existing functionality.
  - Toggle global active checkboxes. Expected: same behavior as today.
- Console checks/logs to inspect (if relevant)
  - Verify one normalized source map snapshot per context refresh.
  - Verify no repeated warning/error spam during rapid chat switches.

## Step S02: Add single-priority source icon and tooltip to each book row
- Relevant file(s): `src/listPanel.js`, `style.css` (only if existing ST classes are insufficient)
- Module responsibilities for this feature
  - `src/listPanel.js`: render source icon at the left side of each book row title area.
  - `style.css`: minimal positioning/alignment adjustments if needed.
- Decision point: where logic likely needs to change
  - Insert source icon element in book header/title composition, before title text.
  - Tooltip content rules:
    - character: include character name(s) owning that lorebook.
    - chat/persona: identify that source clearly.
    - global-only: show no icon.
  - Overlap resolution for icon kind uses priority `character > chat > persona`.
- Smallest likely change set (description only, no code)
  [ ] Add icon render branch in `renderBook(...)` using shared source metadata.
  [ ] Add tooltip string builder for source-specific text.
  [ ] Re-render/update icon state when source map changes.
  [ ] Add only minimal CSS if existing icon utility classes are not enough.
- Invariants: what must NOT change
  - Existing active checkbox position and click behavior.
  - Existing book title drag/collapse interactions.
  - Existing menu actions and shortcuts.
- Risks: 1-3 plausible regressions/side effects
  - Icon placement interferes with drag handle or collapse click target.
  - Tooltip becomes noisy for many group characters if not truncated predictably.
  - DOM update path misses icon refresh for incremental `updateWIChange(...)` cases.
- Manual test steps: exact UI actions + expected result
  - Bind lorebooks as character/chat/persona/global combinations. Expected: only one icon appears per book with configured priority.
  - Hover icon on character-linked book. Expected: tooltip shows owning character name(s).
  - Use only global active lorebook. Expected: no source icon.
- Console checks/logs to inspect (if relevant)
  - Confirm selected priority branch for overlap cases.
  - Confirm tooltip source payload includes character names when kind is character.

## Step S03: Add controls-row multi-select source visibility filter for the list panel
- Relevant file(s): `index.js`, `src/listPanel.js`, `style.css` (if necessary)
- Module responsibilities for this feature
  - `index.js`: create source scope filter control in `stwid--controlsRow`, own selected scope state.
  - `src/listPanel.js`: apply source visibility rules on top of existing query/active filters.
- Decision point: where logic likely needs to change
  - UI control format (single compact menu button with checkboxes vs inline toggle buttons) while keeping controls row layout stable.
  - Filter semantics:
    - multi-select source categories.
    - hidden when a book's computed source kind is not selected.
    - global category corresponds to books without character/chat/persona binding.
- Smallest likely change set (description only, no code)
  [ ] Add one controls-row button for source scope selection.
  [ ] Add selected-scope state updates and trigger list re-filter.
  [ ] Extend list filtering pipeline with a source filter class/state, composed with existing search and active filters.
  [ ] Keep default as all categories selected to preserve initial behavior.
- Invariants: what must NOT change
  - Existing search behavior and active filter meaning (global active) remain intact.
  - Existing folder collapse and ordering behavior.
  - Existing keyboard and selection interactions.
- Risks: 1-3 plausible regressions/side effects
  - Combined filter states (query + active + source) hide more than expected if class toggles conflict.
  - Controls row overcrowding on narrow widths.
  - Source filter unintentionally changes what "Active" means.
- Manual test steps: exact UI actions + expected result
  - Select only `character` in source filter. Expected: only character-linked books visible.
  - Select only `chat`. Expected: only chat-linked books visible.
  - Select only `global`. Expected: only books with no source icon visible.
  - Combine `character + chat + persona`. Expected: matching books visible; global-only books hidden.
  - Enable Active filter simultaneously. Expected: intersection of both filters without redefining global-active logic.
- Console checks/logs to inspect (if relevant)
  - Log selected source categories after each UI toggle.
  - Log per-book computed visibility reasons when debug mode is enabled.

## Step S04: Apply the same source scope filter to Order Helper source selection
- Relevant file(s): `index.js`, `src/orderHelper.js`, `src/orderHelperRender.js` (only if display labels need update)
- Module responsibilities for this feature
  - `src/orderHelper.js`: restrict `getOrderHelperSourceEntries(...)` by selected source scopes in addition to existing active/scoped book logic.
  - `index.js`: provide current source-scope selection and source lookup callbacks.
- Decision point: where logic likely needs to change
  - Scope composition order for Order Helper:
    - existing explicit scope (`scopedBookNames`) remains highest priority.
    - otherwise use current source scope filter + existing active/global source rules.
  - Whether Order Helper should auto-refresh rows when source filter changes while open.
- Smallest likely change set (description only, no code)
  [ ] Add source-scope predicate to order-helper entry source selection.
  [ ] Trigger order-helper rerender/reload when source scope state changes.
  [ ] Keep select-all/apply behavior unchanged for currently visible rows.
  [ ] Update any helper text so scope behavior is clear.
- Invariants: what must NOT change
  - Existing row edit/apply flow and save behavior.
  - Existing sorting/filter columns and row selection mechanics.
  - Existing folder-scoped Order Helper invocation behavior.
- Risks: 1-3 plausible regressions/side effects
  - Empty table confusion when source scope excludes all currently active books.
  - Scoped folder invocation may combine unexpectedly with source scope if precedence is unclear.
  - Performance regressions if source checks are recomputed per row without caching.
- Manual test steps: exact UI actions + expected result
  - Open Order Helper with all source categories selected. Expected: same baseline row set as before feature.
  - Restrict source filter to `chat` only. Expected: Order Helper rows only from chat-linked books.
  - Restrict to `character` in group chat. Expected: rows include books linked to applicable characters.
  - Use folder-specific Order Helper launch. Expected: folder scope still respected, then intersected with selected source scopes.
- Console checks/logs to inspect (if relevant)
  - Log effective order-helper scope (`explicit book scope`, `active books`, `source categories`).
  - Log row-count before/after scope filtering.
