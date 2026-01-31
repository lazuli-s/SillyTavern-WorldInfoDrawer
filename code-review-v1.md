# SillyTavern-WorldInfoDrawer — Read-only Code Review (v1)

Focus areas requested:
- Bugs or risky logic
- Performance issues (DOM, events, re-rendering)
- Redundant/duplicated code
- State management problems

> Notes: This is a **read-only review**; no behavior changes were made.

---

- **`updateWIChange()` can throw when `name` is provided but `data` is null**
  - **Issue:** `updateWIChange(name = null, data = null)` assumes `data.metadata` / `data.entries` exist inside `if (name && cache[name]) { ... }`, but callers like `updateWIChangeDebounced()` can be triggered by the `MutationObserver` with no args, and it’s plausible for other callers to pass `name` without `world`.
  - **Why it matters:** A single unexpected call shape can crash the update pipeline, leaving the UI desynced or broken until reload.
  - **Severity:** **high**
  - **Suggested direction:** Guard `data` usage (early return, or load `data` when missing) and/or separate “full refresh” vs “book delta” code paths explicitly.

- **Race condition / out-of-order updates in `updateWIChangeDebounced` + async body**
  - **Issue:** `updateWIChangeDebounced` wraps an `async` function that mutates global `cache` and DOM. Multiple WORLDINFO_UPDATED events (or the mutation observers) can enqueue overlapping executions. There is no “latest-wins” token inside `updateWIChange()` itself.
  - **Why it matters:** Out-of-order async completion can revert the UI to stale state (e.g., book list ordering, entry list contents), especially because the function awaits `loadWorldInfo()` while also deleting/adding nodes.
  - **Severity:** **high**
  - **Suggested direction:** Introduce a monotonic version/token inside `updateWIChange` (or serialize calls) so older executions can no-op after a newer update begins.

- **Performance hot spot: `updateWIChange()` uses `JSON.stringify` deep compares inside nested loops**
  - **Issue:** In “updated entries” loop, it compares object values via `JSON.stringify(o[k]) == JSON.stringify(n[k])` for any object-typed field, and loops `Set([...Object.keys(o), ...Object.keys(n)])` for every entry.
  - **Why it matters:** World Info books can get large; this becomes O(entries × fields × stringify cost). It also allocates many temporary arrays/sets/strings.
  - **Severity:** **medium**
  - **Suggested direction:** Compare only known object fields that need deep compare, or use cheaper checks (length + element compare for arrays like `key`), and avoid stringify in tight loops.

- **Potential crash: `updateWIChange()` assumes DOM elements exist when updating current editor**
  - **Issue:** Cases like `dom.editor.querySelector('[name="content"]').value` assume the selector exists and is an `<input>/<textarea>`. If the editor is not currently showing an entry (activation settings/order helper/empty), `querySelector` returns null → `.value` throws.
  - **Why it matters:** External events (WORLDINFO_UPDATED) can arrive while the editor is in a different mode; crashes break sync.
  - **Severity:** **high**
  - **Suggested direction:** Null-check queried editor inputs before accessing `.value`, or gate editor-refresh logic behind a “currently editing entry UI is mounted” check.

- **Selection state compares by object identity (fragile across reloads/updates)**
  - **Issue:** In `worldEntry.js`, selection uses `context.selectList.includes(e)` where `e` is the entry object passed to `renderEntry`. But `cache[name].entries` is frequently replaced with `structuredClone` (e.g., in `updateWIChange`, `refreshList`), which creates new objects.
  - **Why it matters:** After refresh/update, selected entries may become “unremovable” or selection actions behave inconsistently because the DOM refers to old object refs, while the cache holds new ones.
  - **Severity:** **high**
  - **Suggested direction:** Track selection by stable IDs (uid + book name) rather than object identity; resolve to current cache objects when needed.

- **SHIFT range-select logic likely incorrect when selecting “upwards”**
  - **Issue:** In range-select: `for (let i = Math.min(start, end); i <= end; i++)` uses `end` directly rather than `Math.max(start,end)`. If `start > end`, the loop condition fails or selects an unintended range.
  - **Why it matters:** UX bug: shift-select is core behavior; users will hit inconsistent selection.
  - **Severity:** **medium**
  - **Suggested direction:** Use a normalized `[min,max]` range and iterate to `max`.

- **Drag/drop move/copy saves inside a loop (excessive I/O)**
  - **Issue:** In `listPanel.js` drop handler for entries: for each selected entry, it does `await state.saveWorldInfo(name, dstBook, true);` inside the loop.
  - **Why it matters:** Multiple sequential saves are slow, increase server load, and risk partial completion if an error occurs mid-loop.
  - **Severity:** **medium**
  - **Suggested direction:** Batch: apply all mutations to `dstBook` (and `srcBook`) in-memory, then save once per book.

- **Folder/book drag-drop code is duplicated in multiple places**
  - **Issue:** Similar logic appears in:
    - `createFolderDom(... onDrop ...)`
    - book `drop` handler
    - books container `drop` handler
    Each repeats: read `dragBookName`, check ctrl for copy, `duplicateBook`, `refreshList`, `setBookFolder`, `refreshList`.
  - **Why it matters:** Bug fixes must be repeated; drift risk is high (one path may handle edge cases differently).
  - **Severity:** **low**
  - **Suggested direction:** Consolidate the shared “handle book drop” flow into a single helper (even if kept local to listPanel).

- **`duplicateBook()` relies on timing + DOM side effects; fragile**
  - **Issue:** It changes `#world_editor_select`, dispatches `change`, waits fixed delays, clicks `#world_duplicate`, then polls for new name by diffing arrays.
  - **Why it matters:** Timing-dependent logic can break with ST UI changes, slow devices, or if another extension modifies the same elements; can mis-detect “newName”.
  - **Severity:** **medium**
  - **Suggested direction:** Prefer a direct API if available; otherwise, listen for WORLDINFO_UPDATED/new world_names change instead of fixed sleeps.

- **Global document keydown handler uses `elementFromPoint(...).closest(...)` without null guard**
  - **Issue:** `document.elementFromPoint(...)` can return `null` (e.g., during transitions, unusual browser states), then `.closest` will throw.
  - **Why it matters:** Uncaught exception on any keypress can break interaction.
  - **Severity:** **medium**
  - **Suggested direction:** Guard `const el = document.elementFromPoint(...); if (!el) return;`.

- **Potential memory leaks / duplicated listeners on re-injection**
  - **Issue:** `addDrawer()` attaches:
    - `document.addEventListener('keydown', ...)`
    - `MutationObserver`s on `#world_editor_select` and `#WorldInfo`
    - `setTimeout` loop in `checkDiscord()`
    There’s no teardown if the extension is reloaded, hot-reloaded, or `addDrawer()` is called again.
  - **Why it matters:** Duplicate handlers can cause repeated actions, performance degradation, and confusing behavior over time.
  - **Severity:** **medium**
  - **Suggested direction:** Store handler refs and observers; add an idempotency guard (only install once) or a cleanup routine.

- **`checkDiscord()` polling every 1s indefinitely**
  - **Issue:** Constant polling via `setTimeout(()=>checkDiscord(), 1000)`; no stop condition.
  - **Why it matters:** Minor but permanent CPU wakeups; on long sessions this adds up, and it’s unnecessary if there are better signals (resize/theme changes).
  - **Severity:** **low**
  - **Suggested direction:** Switch to event-driven checks where possible (resize/mutation), or increase interval / pause when drawer closed.

- **`refreshList()` clears cache and DOM, but selection and other state may reference old nodes**
  - **Issue:** It deletes `state.cache[bookName]` while selection variables (`selectLast`, `selectList`) are module-level and not force-reset unless other code calls `selectEnd()`. It calls `state.resetEditor?.()` but not `selectEnd()`.
  - **Why it matters:** Stale references can cause errors on subsequent drag/drop/selection operations, or silently misbehave.
  - **Severity:** **medium**
  - **Suggested direction:** Ensure refresh invalidates selection state consistently (call selection reset, or make selection state resilient).

- **`clearBookSortPreferences()` does sequential awaits**
  - **Issue:** Iterates books and `await setBookSortPreference(...)` for each.
  - **Why it matters:** For many books, this is slow and blocks UI longer than needed.
  - **Severity:** **low**
  - **Suggested direction:** Consider batching saves (if safe) or parallelizing with care; at minimum, show progress/feedback.

- **Order Helper: `ensureCustomDisplayIndex()` mutates entries but doesn’t obviously persist here**
  - **Issue:** It sets `entry.extensions.display_index` in cache objects and returns `updatedBooks`, but persistence depends on renderer calling `saveWorldInfo` later. If the renderer forgets to persist after calling it, the state is ephemeral.
  - **Why it matters:** Risk of “it worked until reload” inconsistency; also mutating shared cache during “view” operations can create hidden side effects.
  - **Severity:** **medium**
  - **Suggested direction:** Make persistence explicit in the call site (renderer): if you assign display_index, immediately save affected books or clearly document the expectation.

- **Order Helper: `getOrderHelperEntries(includeDom=true)` trusts DOM rows to map to `cache` entries**
  - **Issue:** Uses `cache[entryBook].entries[tr.getAttribute('data-uid')]` without guarding missing cache/book/uid.
  - **Why it matters:** If cache updates mid-render (WORLDINFO_UPDATED), rows might reference entries that no longer exist → undefined data.
  - **Severity:** **medium**
  - **Suggested direction:** Add defensive checks and drop rows whose backing data is missing; consider snapshotting inputs during render.

- **CSS: heavy use of `:has()` selectors**
  - **Issue:** Selectors like `.stwid--book:has(...)` and `.stwid--entry:has(...)` can be expensive because `:has()` is “parent-aware” and may trigger more costly style recalculation.
  - **Why it matters:** Large lists + frequent DOM updates (sorting/filtering/selection) can cause noticeable UI jank.
  - **Severity:** **low/medium** (depends on list sizes)
  - **Suggested direction:** Where possible, toggle explicit classes in JS (e.g., “hasActiveEntry”) instead of relying on `:has()` for dynamic states.

- **Minor robustness: assumes templates exist (`#entry_edit_template` clones)**
  - **Issue:** In `worldEntry.js`, it clones `#entry_edit_template [name="entryKillSwitch"]` and `[name="entryStateSelector"]` without null checks.
  - **Why it matters:** If SillyTavern changes template IDs/names, this extension will hard-fail at render time.
  - **Severity:** **medium**
  - **Suggested direction:** Validate template elements exist once at init; fail gracefully (disable toggles) instead of throwing.

- **Console logging in hot paths**
  - **Issue:** `updateWIChange` logs on every WORLDINFO_UPDATED; keydown handler logs every key.
  - **Why it matters:** Can spam console and slow devtools, especially with frequent updates.
  - **Severity:** **low**
  - **Suggested direction:** Gate logs behind a debug flag / setting, or reduce verbosity in frequently-called handlers.
