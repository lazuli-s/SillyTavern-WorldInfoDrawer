# Code Review Implementation Changelog

Changes applied from code review findings across the extension's source files.

---

## February 15, 2026

### `src/bookSourceLinks.js`

- **F01** — `cleanup()` does not unsubscribe `eventSource` listeners (leak / duplicate refresh on re-init): Tracked `eventSource` subscriptions and now remove them during `cleanup()` to prevent duplicate refreshes on re-init.
- **F02** — `getBookSourceLinks()` fallback returns a different object shape than normal entries: Made the fallback object full-shape (includes `characterNames` and `personaName`) so callers always receive a consistent contract.
- **F03** — Signature computation uses full `JSON.stringify(nextLinks)` (unnecessary churn + ordering sensitivity): Canonicalized `characterNames` ordering (sorted) to reduce signature churn when set contents are unchanged.
- **F04** — Direct imports from internal ST modules increase upstream breakage risk (prefer `getContext()` where possible): Implemented a context-first strategy with fallback to existing direct imports for host-version compatibility.

### `src/drawer.js`

- **F01** — New-book creation awaits non-specific "update started" promise — race with cache init: Registered `waitForWorldInfoUpdate()` before `createNewWorldInfo(...)`, then guarded `cache[finalName]` and added a `refreshList()` fallback before scrolling.
- **F02** — Drawer "reopen" MutationObserver forces synthetic click that can discard unsaved edits: Skipped synthetic restore click when the editor is dirty to prevent silent loss of typed input.
- **F03** — Delete handler reads live `selectionState` across `await` — can delete wrong entries: Snapshotted `selectFrom` and selected UIDs at keypress time so async delete runs against a stable selection.
- **F06** — Splitter drag lifecycle missing `pointercancel` — listeners can leak: Added `pointercancel` + `lostpointercapture` termination paths to ensure drag listeners always detach and width is persisted.
- **F07** — Toggling Activation Settings / Order Helper clears entry editor without dirty-state guard: Added dirty guards + warning toasts to block mode switches that would clear the editor while unsaved edits exist.