# DETAILED IMPLEMENTATION PLAN: Lorebook Source Badges and Source Visibility Scope

## Step S01: Define one canonical source map for every lorebook in current context
- Relevant file(s): `index.js`, `src/listPanel.js`, `src/orderHelper.js`, `src/constants.js` (only if a shared key/enum is needed)
- Module responsibilities for this feature
- `index.js` remains the single place that already wires shared state (`cache`, list panel, Order Helper), so it should own source-resolution data and pass read-only accessors into child modules.
- `src/listPanel.js` should consume source metadata for rendering and filtering, not recompute global/chat/persona/character scope itself.
- `src/orderHelper.js` should consume already-resolved scope input and continue owning Order Helper row source gathering.
- Vanilla ST/Main app state objects, useful functions, and utilities that can be reused (context inside `vendor/SillyTavern/public/scripts/st-context.js`)
- `selected_world_info` (global-selected books), `chat_metadata[METADATA_KEY]` (chat-bound book), `power_user.persona_description_lorebook` (persona-bound book), `characters` + `this_chid` (active character), `world_info.charLore` (additional character books).
- Context equivalents from `SillyTavern.getContext()` for compatibility checks: `characterId`, `groupId`, `groups`, `characters`, `chatMetadata`, `eventSource`, `event_types`.
- Existing extension utilities: `WORLDINFO_UPDATED` and `WORLDINFO_SETTINGS_UPDATED` listeners in `index.js` to trigger source map refresh.
- Decision point: where logic likely needs to change
- Keep source resolution centralized in `index.js` and expose two accessors:
- one accessor returning per-book source membership (global/character/chat/persona + character names for tooltip),
- one accessor returning currently visible source filter selection.
- Smallest likely change set
  [ ] Add an in-memory source map keyed by lorebook name in `index.js`
  [ ] Add a recompute function that resolves global/chat/persona/character memberships (including group members and additional character books)
  [ ] Recompute source map on existing relevant update paths (initial load, world info updates, settings/chat context updates)
  [ ] Pass read-only source-map/filter accessors to `initListPanel` and `initOrderHelper`
- Invariants: what must NOT change
- No changes under `vendor/SillyTavern`.
- No changes to world info activation semantics (global active toggles continue to behave exactly as today).
- No dependency additions.
- Risks: 1-3 plausible regressions/side effects
- Source map becomes stale after chat/character switch if not refreshed on every needed event.
- Group character resolution may miss a member if wrong source of member list is used.
- Duplicate source membership could produce inconsistent icon order unless normalized.
- Manual test steps: exact UI actions + expected result
- Open drawer in a single-character chat with known global/chat/persona/character books; expected: internal source map contains correct memberships for each existing book.
- Switch to a group chat with multiple members and additional char books; expected: source map includes all relevant group member books.
- Trigger refresh (`Refresh` button) and switch chats; expected: source map updates without requiring page reload.
- Console checks/logs to inspect (if relevant)
- If temporary debug logging is added, verify one concise `[STWID] [SOURCE-MAP]` summary per recompute and no repeated spam.
- Confirm no runtime errors from missing `chat_metadata`, `world_info.charLore`, or character context.

## Step S02: Render multi-source badges to the left of each book activation toggle
- Relevant file(s): `src/listPanel.js`, `style.css`, `docs/StyleGuide.md` (reference for class reuse decisions)
- Module responsibilities for this feature
- `src/listPanel.js` controls book row DOM (`renderBook`) and must add a badge container in the actions area directly before the activation checkbox.
- `style.css` should only add minimal local styles if existing ST classes are insufficient.
- Vanilla ST/Main app state objects, useful functions, and utilities that can be reused (context inside `vendor/SillyTavern/public/scripts/st-context.js`)
- Existing Font Awesome icon usage pattern in this extension (`fa-*` classes on action elements).
- Existing tooltip/accessibility pattern (`title`, `aria-label`) already used across controls.
- Existing per-book cached DOM references in `state.cache[name].dom`.
- Decision point: where logic likely needs to change
- Extend book-head actions in `renderBook` so badges are data-driven from the source map and rendered in stable order: `character`, `chat`, `persona` (global-only has no badge).
- Character badge tooltip should list character names when more than one character matches.
- Smallest likely change set
  [ ] Add a dedicated badge wrapper element per book row in `renderBook`
  [ ] Add a helper to render zero-to-many badges from source metadata
  [ ] Add/update badge DOM on initial render and on relevant refresh/update paths
  [ ] Add minimal CSS hooks for spacing/alignment while preserving existing row interaction behavior
- Invariants: what must NOT change
- Book title click-to-collapse behavior must remain unchanged.
- Activation toggle click behavior must remain unchanged.
- Drag-and-drop behavior and menu actions must remain unchanged.
- Risks: 1-3 plausible regressions/side effects
- Layout overlap in narrow widths if badge spacing is not constrained.
- Tooltip text may become ambiguous when multiple characters map to one book.
- Frequent re-rendering could cause minor UI jitter if badges are rebuilt inefficiently.
- Manual test steps: exact UI actions + expected result
- Open drawer and inspect a book with no special source (global-only): expected no badge.
- Inspect books linked to character/chat/persona: expected correct badge icons shown before activation toggle.
- Inspect a multi-source book: expected multiple badges visible together.
- In group chat, hover character badge on shared/additional book: expected tooltip lists all matching character names.
- Console checks/logs to inspect (if relevant)
- Confirm no `undefined` access errors when source metadata is absent.
- If debug enabled, verify badge source array order is deterministic for each book.

## Step S03: Add a source visibility control and integrate it with existing list filtering
- Relevant file(s): `index.js`, `src/listPanel.js`, `style.css`, `src/lorebookFolders.js`
- Module responsibilities for this feature
- `index.js` owns top control-row composition and should host the new source filter trigger/control in the same control cluster.
- `src/listPanel.js` owns filtering and should integrate source filter with current query filter and current active-only filter.
- `src/lorebookFolders.js` should continue deriving folder active state from visible books after source filtering is applied.
- Vanilla ST/Main app state objects, useful functions, and utilities that can be reused (context inside `vendor/SillyTavern/public/scripts/st-context.js`)
- Existing localStorage pattern for UI state persistence (already used for collapse states/order helper state).
- Existing filter class toggling approach (`stwid--filter-query`, `stwid--filter-active`) to keep behavior consistent.
- Existing `menu_button` and related ST classes for compact control UI.
- Decision point: where logic likely needs to change
- Add source filter state with four toggles (`global`, `character`, `chat`, `persona`) and apply as an additional visibility filter.
- Visibility rule should be OR across selected source types, then combined with existing filters so any failed filter hides the row.
- Smallest likely change set
  [ ] Add source filter UI control in top controls row
  [ ] Add source filter state (default all on) and optional persistence key
  [ ] Add new per-book class (for example `stwid--filter-source`) applied/removed by source filter pass
  [ ] Update filter application pipeline so source filtering coexists with search and active-only filtering
  [ ] Ensure "all source toggles off" yields no visible books and folder states update accordingly
- Invariants: what must NOT change
- Existing Search and Active filters keep their current semantics.
- Filter actions remain visibility-only and do not toggle actual world activation.
- No folder/book data mutation occurs from source filtering.
- Risks: 1-3 plausible regressions/side effects
- Incorrect logical combination (AND/OR) could hide too many or too few books.
- Folder active indicators could desync if visibility classes are not considered consistently.
- Persisted filter state could become incompatible if keys are renamed later.
- Manual test steps: exact UI actions + expected result
- With all four source toggles on, expected list visibility matches current baseline.
- Disable each source type one at a time: expected only matching books are hidden/shown by source membership.
- Disable all source toggles: expected no books visible.
- Re-enable one source type (for example `chat`): expected only chat-matching books appear.
- Combine with Search and Active toggles: expected final visible set follows combined filters without activation changes.
- Console checks/logs to inspect (if relevant)
- Verify one consolidated source-filter application path runs (avoid duplicate passes).
- Confirm visible-book counting in folder helpers reflects source-filtered visibility.

## Step S04: Apply the same source visibility scope to Order Helper entry source gathering
- Relevant file(s): `index.js`, `src/orderHelper.js`, `src/listPanel.js`, `src/lorebookFolders.js`
- Module responsibilities for this feature
- `src/orderHelper.js` controls which books contribute entries (`getOrderHelperSourceEntries`) and should intersect existing scope with source-filter-visible books.
- `index.js` should pass source-filter accessors into Order Helper init, matching the list panel's active filter state.
- `src/listPanel.js` and `src/lorebookFolders.js` already open Order Helper in book/folder scopes and should preserve those explicit scopes.
- Vanilla ST/Main app state objects, useful functions, and utilities that can be reused (context inside `vendor/SillyTavern/public/scripts/st-context.js`)
- Existing `openOrderHelper(book, scope)` contract and `scopedBookNames` behavior.
- Existing active/global selection accessor (`getSelectedWorldInfo`) already used by Order Helper.
- Existing folder-scope opening behavior from folder context menu.
- Decision point: where logic likely needs to change
- In `getOrderHelperSourceEntries`, compute candidate books as:
- explicit scope (if provided) or active/global selection,
- intersected with source-filter-visible books from the new source filter state.
- Smallest likely change set
  [ ] Add Order Helper dependency input for source-filter-visible book names
  [ ] Intersect source book list with current source filter visibility before building entries
  [ ] Preserve explicit single-book and folder scopes while still applying source visibility filter
  [ ] Re-render/open behavior: ensure toggling source filters then opening Order Helper reflects the same scope as drawer
- Invariants: what must NOT change
- Order Helper row editing/apply behavior must remain unchanged.
- Existing column filters and script filter logic must remain unchanged.
- Sorting behavior (including CUSTOM index handling) must remain unchanged.
- Risks: 1-3 plausible regressions/side effects
- Unexpected empty Order Helper table if scope intersection is applied in wrong order.
- Folder-scoped Order Helper may include hidden-source books if scope bypasses new filter.
- Derived filter options (strategy/position/outlet/group) may appear inconsistent if source scope updates late.
- Manual test steps: exact UI actions + expected result
- Set source filter to only `character`, open main Order Helper: expected only character-source books contribute entries.
- Set source filter to only `chat`, open Order Helper from a folder: expected only folder books that also match chat source contribute entries.
- Turn all source toggles off and open Order Helper: expected empty table with no crash.
- Re-enable all source toggles and reopen: expected baseline behavior restored.
- Console checks/logs to inspect (if relevant)
- Confirm Order Helper source book list before render matches list panel visible-source set.
- Confirm no errors when scoped book list intersects to an empty set.
