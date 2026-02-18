# Code Review Implementation Changelog

Changes applied from code review findings across the extension's source files.

---

## February 18, 2026

### `src/lorebookFolders.js`

- **F01** — `createBookInFolder` assumes `loadWorldInfo()` always succeeds and returns an object: Added a null/object guard after book creation load, warning toast/logging on failure, and a safe early return that preserves the created book for manual reassignment.
- **F02** — Folder import can miss the update event if it fires before `waitForWorldInfoUpdate` is registered: Moved update-wait registration before import start, kept timeout fallback behavior, and added timeout warning logs for troubleshooting.

## February 18, 2026

### `src/listPanel.state.js`

- **F01** — State caches use plain objects with user-controlled keys (prototype pollution / key collisions): Replaced state object maps with null-prototype maps, added key normalization/validation, and updated folder collapse accessors to use validated state APIs.
- **F02** — Selection state can survive list reloads, leaving stale `selectFrom`/`selectList`: Added selection reset to cache rebuild flow and passed `clearToast` through `refreshList` cache clears so stale selection UI is removed.

## February 17, 2026

### `src/listPanel.js`

- **F01** — Race: `setBookSortPreference()` can crash or reorder stale DOM after an awaited save: Added refresh-token stale-continuation guard, sortable DOM validation, and skip-with-warning handling for stale post-save sort paths.
- **F02** — Data integrity: `setBookSortPreference()` writes via `buildSavePayload()` from cache (risk of overwriting newer book data): Switched sort preference persistence to load-latest/clone/metadata-patch/save and synced cache metadata after save.
- **F03** — Async ordering: `refreshList()` awaits a debounced loader, which can drop/merge refresh requests and produce stale UI: Added refresh worker token sequencing so callers await the newest completed refresh before resolving.
- **F04** — Potential memory leak / duplicate handlers if `initListPanel()` runs more than once: Added `teardownListPanel()` cleanup, idempotent init guard, and `destroyListPanel` API exposure for safe re-init behavior.
- **F05** — UI correctness edge case: `renderBookSourceLinks()` clears container with `innerHTML = ''` (focus/selection can be lost): Replaced full container reset with keyed icon diffing that preserves nodes and updates tooltip/aria text in place.

## February 17, 2026

### `src/constants.js`

- **F01** â€” `SORT_DIRECTION` docstrings are incorrect/misaligned with actual meaning: Corrected ascending/descending docstrings to direction semantics without changing runtime values.
- **F02** â€” Recursion option values are duplicated across modules â€” drift risk breaks filters/indicators: Replaced hardcoded recursion values in `createOrderHelperState()` with values derived from `ORDER_HELPER_RECURSION_OPTIONS`.
- **F03** â€” Column-schema â€œsyncâ€ is comment-only â€” mismatch can silently break column visibility/persistence: Added schema/default mismatch warning, canonical schema-key backfill (`false`), and schema-key-only stored-columns hydration.
- **F05** â€” `SORT` enum names overlap conceptually (TITLE vs ALPHABETICAL) â€” increases future misuse risk: Updated `SORT.TITLE`/`SORT.ALPHABETICAL` docs and marked `ALPHABETICAL` as a legacy compatibility alias.

### `src/wiUpdateHandler.js`

- **F01** Ã¢â‚¬â€ Failed update cycles can leave waiters hanging indefinitely: Wrapped `updateWIChange()` in `try/finally` and finalized each cycle with a captured deferred so waiters always receive completion.
- **F02** Ã¢â‚¬â€ `fillEmptyTitlesWithKeywords()` forces a duplicate update pass for the same save: Removed the direct post-save `updateWIChange(...)` call and kept event-driven reconciliation as the single update path.
- **F03** Ã¢â‚¬â€ Event bus listeners are registered without a teardown path: Replaced inline listeners with named handlers, added `cleanup()` listener removal, and called handler cleanup from drawer teardown.
- **F04** Ã¢â‚¬â€ Direct `script.js` imports bypass the stable context API: Switched event bus/event enum access to `SillyTavern.getContext()` and updated listener registration/removal to use context-derived references.

### `src/utils.js`

- **F01** Ã¢â‚¬â€ `executeSlashCommand()` swallows failures, so callers cannot react or inform the user: Returned explicit `true`/`false` execution status, added parser/closure guards, and updated STLO menu handling to keep the menu open with an error toast on failure.
- **F02** Ã¢â‚¬â€ Direct internal import of `SlashCommandParser` is brittle across SillyTavern updates: Added runtime `globalThis.SlashCommandParser` discovery with guarded direct-import fallback and normalized unresolved parser state to `null`.

### `src/bookSourceLinks.js`

- **F01** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `cleanup()` does not unsubscribe `eventSource` listeners (leak / duplicate refresh on re-init): Added tracked event subscriptions and teardown-time `removeListener` cleanup for each registered source-link event.
- **F02** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `getBookSourceLinks()` fallback returns a different object shape than normal entries: Expanded fallback links to full shape and kept per-book fresh defaults to avoid shared mutable fields.
- **F03** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Signature computation uses full `JSON.stringify(nextLinks)` (unnecessary churn + ordering sensitivity): Added canonical signature builder with sorted keys/character names and switched refresh diffing to use it.
- **F04** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Direct imports from internal ST modules increase upstream breakage risk (prefer `getContext()` where possible): Implemented context-first runtime access with direct-import fallback and documented world-info direct-import exception.

### `src/orderHelperRender.actionBar.js`

- **F01** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Bulk-apply actions can throw if table DOM/cache is not ready (missing null guards): Added shared tbody/entry guard helpers and updated bulk Apply handlers to skip invalid rows safely.
- **F02** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Outside-click listeners can leak if the component is removed while menus are open: Added bulk-row cleanup for outlet outside-click listeners and hooked renderer-level rerender cleanup.
- **F03** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Bulk apply loops can freeze the UI on large tables (no yielding in hot loops): Refactored State/Strategy/Order apply flows to precompute targets, disable Apply while running, and yield every 200 rows.
- **F04** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Direction radios are not grouped as radios (no `name`), risking inconsistent UI/accessibility: Grouped direction radios via shared `name` and switched persistence to `change` events with native exclusivity.

## February 15, 2026

### `src/drawer.js`

- **F01** Ã¢â‚¬â€ New-book creation awaits non-specific "update started" promise Ã¢â‚¬â€ race with cache init: Registered `waitForWorldInfoUpdate()` before `createNewWorldInfo(...)`, then guarded `cache[finalName]` and added a `refreshList()` fallback before scrolling.
- **F02** Ã¢â‚¬â€ Drawer "reopen" MutationObserver forces synthetic click that can discard unsaved edits: Skipped synthetic restore click when the editor is dirty to prevent silent loss of typed input.
- **F03** Ã¢â‚¬â€ Delete handler reads live `selectionState` across `await` Ã¢â‚¬â€ can delete wrong entries: Snapshotted `selectFrom` and selected UIDs at keypress time so async delete runs against a stable selection.
- **F06** Ã¢â‚¬â€ Splitter drag lifecycle missing `pointercancel` Ã¢â‚¬â€ listeners can leak: Added `pointercancel` + `lostpointercapture` termination paths to ensure drag listeners always detach and width is persisted.
- **F07** Ã¢â‚¬â€ Toggling Activation Settings / Order Helper clears entry editor without dirty-state guard: Added dirty guards + warning toasts to block mode switches that would clear the editor while unsaved edits exist.
