# Code Review Implementation Changelog

Changes applied from code review findings across the extension's source files.

---

## February 15, 2026

### `src/drawer.js`

- **F01** — New-book creation awaits non-specific "update started" promise — race with cache init: Registered `waitForWorldInfoUpdate()` before `createNewWorldInfo(...)`, then guarded `cache[finalName]` and added a `refreshList()` fallback before scrolling.
- **F02** — Drawer "reopen" MutationObserver forces synthetic click that can discard unsaved edits: Skipped synthetic restore click when the editor is dirty to prevent silent loss of typed input.
- **F03** — Delete handler reads live `selectionState` across `await` — can delete wrong entries: Snapshotted `selectFrom` and selected UIDs at keypress time so async delete runs against a stable selection.
- **F06** — Splitter drag lifecycle missing `pointercancel` — listeners can leak: Added `pointercancel` + `lostpointercapture` termination paths to ensure drag listeners always detach and width is persisted.
- **F07** — Toggling Activation Settings / Order Helper clears entry editor without dirty-state guard: Added dirty guards + warning toasts to block mode switches that would clear the editor while unsaved edits exist.