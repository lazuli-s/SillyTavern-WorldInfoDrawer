# Code Review Implementation Changelog

Changes applied from code review findings across the extension's source files.

---

## February 17, 2026

### `src/utils.js`

- **F01** — `executeSlashCommand()` swallows failures, so callers cannot react or inform the user: Returned explicit `true`/`false` execution status, added parser/closure guards, and updated STLO menu handling to keep the menu open with an error toast on failure.
- **F02** — Direct internal import of `SlashCommandParser` is brittle across SillyTavern updates: Added runtime `globalThis.SlashCommandParser` discovery with guarded direct-import fallback and normalized unresolved parser state to `null`.

## February 17, 2026

### `src/bookSourceLinks.js`

- **F01** â€” `cleanup()` does not unsubscribe `eventSource` listeners (leak / duplicate refresh on re-init): Added tracked event subscriptions and teardown-time `removeListener` cleanup for each registered source-link event.
- **F02** â€” `getBookSourceLinks()` fallback returns a different object shape than normal entries: Expanded fallback links to full shape and kept per-book fresh defaults to avoid shared mutable fields.
- **F03** â€” Signature computation uses full `JSON.stringify(nextLinks)` (unnecessary churn + ordering sensitivity): Added canonical signature builder with sorted keys/character names and switched refresh diffing to use it.
- **F04** â€” Direct imports from internal ST modules increase upstream breakage risk (prefer `getContext()` where possible): Implemented context-first runtime access with direct-import fallback and documented world-info direct-import exception.

### `src/orderHelperRender.actionBar.js`

- **F01** â€” Bulk-apply actions can throw if table DOM/cache is not ready (missing null guards): Added shared tbody/entry guard helpers and updated bulk Apply handlers to skip invalid rows safely.
- **F02** â€” Outside-click listeners can leak if the component is removed while menus are open: Added bulk-row cleanup for outlet outside-click listeners and hooked renderer-level rerender cleanup.
- **F03** â€” Bulk apply loops can freeze the UI on large tables (no yielding in hot loops): Refactored State/Strategy/Order apply flows to precompute targets, disable Apply while running, and yield every 200 rows.
- **F04** â€” Direction radios are not grouped as radios (no `name`), risking inconsistent UI/accessibility: Grouped direction radios via shared `name` and switched persistence to `change` events with native exclusivity.

## February 15, 2026

### `src/drawer.js`

- **F01** — New-book creation awaits non-specific "update started" promise — race with cache init: Registered `waitForWorldInfoUpdate()` before `createNewWorldInfo(...)`, then guarded `cache[finalName]` and added a `refreshList()` fallback before scrolling.
- **F02** — Drawer "reopen" MutationObserver forces synthetic click that can discard unsaved edits: Skipped synthetic restore click when the editor is dirty to prevent silent loss of typed input.
- **F03** — Delete handler reads live `selectionState` across `await` — can delete wrong entries: Snapshotted `selectFrom` and selected UIDs at keypress time so async delete runs against a stable selection.
- **F06** — Splitter drag lifecycle missing `pointercancel` — listeners can leak: Added `pointercancel` + `lostpointercapture` termination paths to ensure drag listeners always detach and width is persisted.
- **F07** — Toggling Activation Settings / Order Helper clears entry editor without dirty-state guard: Added dirty guards + warning toasts to block mode switches that would clear the editor while unsaved edits exist.
