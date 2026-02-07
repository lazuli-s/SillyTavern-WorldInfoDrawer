# DETAILED IMPLEMENTATION PLAN: Lorebook Source Badges and Source Visibility Scope

## Step S01: Add a canonical lorebook source map in the extension runtime
- Relevant file(s)
  `index.js`, `src/constants.js` (only if new local constant keys are needed)

- Extension Modules
  `index.js` remains the single orchestration point that already owns shared runtime state (`cache`, world-info event wiring, panel initialization). This step adds read-only source-map state and recompute hooks there so downstream modules consume a single truth source.

- ST Context
  Reuse existing ST state already available to this extension runtime: `selected_world_info` (global active books), `chat_metadata` + WI metadata key (chat-linked book), `power_user.persona_description_lorebook` (persona-linked book), and character/group lorebook associations from active character/group context.

- Decision point
  Determine whether source resolution should be recomputed only on existing world-info/settings updates or also on chat/character switch lifecycle events to avoid stale source badges/filtering.

- Smallest change set
  [ ] Add in-memory source map keyed by lorebook name (global/character/chat/persona membership + optional character labels)
  [ ] Add one recompute function in `index.js` that resolves memberships from current ST state
  [ ] Call recompute on initial load and existing update paths before list/order helper refreshes
  [ ] Pass read-only accessors into `initListPanel` and `initOrderHelper`

- Invariants
  Keep existing book/entry cache semantics unchanged.
  Keep existing world-info persistence/update calls unchanged.
  Do not change behavior under `/vendor/SillyTavern`.

- Risks
  Source map can become stale if event coverage is incomplete.
  Group/character source detection may miss edge cases if context resolution is incomplete.
  Unnormalized membership ordering can produce inconsistent badge order.

- Manual test steps
  Open drawer with known global/chat/persona/character books and verify source map-backed UI state is populated.
  Switch between character chat and group chat, reopen/refresh drawer, and verify source membership updates.
  Trigger existing refresh action and verify no source state desync.

- Console checks/logs to inspect 
  Confirm no runtime errors from missing/null ST state objects.
  If temporary debug logs are added, ensure one concise recompute log per refresh cycle.

## Step S02: Render source badges on each lorebook row without altering row controls
- Relevant file(s)
  `src/listPanel.js`, `style.css`

- Extension Modules
  `src/listPanel.js` owns lorebook row rendering and receives source metadata via accessors from `index.js`; it adds badge DOM next to existing actions without changing existing click/drag/menu handlers.

- ST Context
  Reuse existing icon/tooltip conventions already used in the extension and ST styles (`menu_button`, font-awesome classes, `title`/`aria-label`).

- Decision point
  Choose stable badge render order (`character`, `chat`, `persona`) and tooltip format for multi-character associations while avoiding extra per-row recomputation.

- Smallest change set
  [ ] Add a source-badge container in `renderBook` action area (before global active checkbox)
  [ ] Add a small render helper that maps source-map metadata to badges/icons/tooltips
  [ ] Update badge DOM on initial render and relevant row refresh/update paths
  [ ] Add minimal CSS only for spacing/alignment if existing ST classes are insufficient

- Invariants
  Keep existing active toggle behavior unchanged.
  Keep existing book collapse/select/drag/menu behavior unchanged.
  Keep existing row DOM structure stable for unrelated controls.

- Risks
  Badge layout may overlap controls on narrow widths.
  Tooltip text may be ambiguous for multi-character sources.
  Excessive DOM rebuilds may cause visual jitter.

- Manual test steps
  Verify global-only book shows no source badge.
  Verify chat/persona/character books show correct badges.
  Verify multi-source book renders multiple badges in stable order.
  In group context, hover character badge and verify tooltip shows expected names.

- Console checks/logs to inspect 
  Verify no undefined access errors when a book has no source metadata.

## Step S03: Add a source visibility filter and merge it with existing list filters
- Relevant file(s)
  `index.js`, `src/listPanel.js`, `src/lorebookFolders.js`, `style.css`

- Extension Modules
  `index.js` provides source-filter state/accessor wiring; `src/listPanel.js` applies source visibility alongside query/active filters; `src/lorebookFolders.js` continues folder visible-book logic and must include the new source-filtered class state.

- ST Context
  Reuse existing localStorage-based UI persistence patterns and existing class-based filtering pipeline (`stwid--filter-query`, `stwid--filter-active`).

- Decision point
  Decide filter semantics as OR-within-source-types and AND-across-filter-groups (source + search + active) while keeping Active filter semantics strictly global-active.

- Smallest change set
  [ ] Add source filter UI control(s) with four toggles: `global`, `character`, `chat`, `persona`
  [ ] Add source filter state (default all enabled), optionally persisted
  [ ] Add one new row class for source-filter exclusion (for example `stwid--filter-source`)
  [ ] Integrate source filter into existing filter apply flow without replacing current search/active logic
  [ ] Update folder visible-book checks to also consider source-filter exclusion class

- Invariants
  Existing search behavior (including entry search option) must not change.
  Existing Active filter meaning must not change.
  Filtering must remain visibility-only and never mutate book activation/data.

- Risks
  Incorrect logical composition can hide/show wrong books.
  Folder tri-state active toggle can desync if visible-book computation omits source filter class.
  Persisted filter schema may break if keys are changed later.

- Manual test steps
  With all source toggles on, verify baseline list visibility matches current behavior.
  Toggle each source off one at a time and verify affected books hide as expected.
  Turn all source toggles off and verify no books are visible.
  Combine source filter with search + Active filter and verify final visible set follows combined logic.
  Verify folder active toggles/counts reflect only visible (source-filtered) books.

- Console checks/logs to inspect 
  Verify filter application does not throw and runs once per input change.

## Step S04: Apply source visibility scope to Order Helper book-entry collection
- Relevant file(s)
  `index.js`, `src/orderHelper.js`, `src/listPanel.js`, `src/lorebookFolders.js`

- Extension Modules
  `src/orderHelper.js` owns source-entry collection and must intersect candidate books with source-visible scope; `index.js` passes accessor(s); list/folder modules continue invoking Order Helper with explicit scopes where applicable.

- ST Context
  Reuse existing active-book source (`selected_world_info`) and existing scoped invocation contract (`openOrderHelper(book, scope)`), preserving current explicit single-book/folder invocations.

- Decision point
  Define intersection order for candidate books: explicit scope (if provided) or active books, then source visibility filter, then existing per-book/per-entry constraints.

- Smallest change set
  [ ] Add source-visibility accessor dependency to `initOrderHelper`
  [ ] Intersect Order Helper candidate books with source-visible set inside entry gathering path
  [ ] Preserve explicit scope entry points (book/folder) while still honoring source visibility
  [ ] Ensure open/reopen refresh uses current source filter state

- Invariants
  Existing Order Helper edit/apply behavior must not change.
  Existing table filtering/sorting/script filter behavior must not change.
  Existing CUSTOM display index handling must not change.

- Risks
  Wrong intersection order can produce unexpectedly empty helper rows.
  Folder-scoped helper may include hidden-source books if bypass path is missed.
  Derived filter-option lists may be inconsistent if source scope refresh timing is wrong.

- Manual test steps
  Set source filter to character-only and open Order Helper; verify only character-source entries appear.
  Open Order Helper from folder scope with chat-only source filter; verify intersection behavior.
  Set all source toggles off and open Order Helper; verify empty but stable UI.
  Re-enable all source toggles and verify baseline Order Helper behavior is restored.

- Console checks/logs to inspect 
  Verify no errors when candidate scope intersects to empty set.
  Verify Order Helper source-book list matches current list-panel source visibility.
