# CODE REVIEW FINDINGS: src/listPanel.js

## F01: Race: `setBookSortPreference()` can crash or reorder stale DOM after an awaited save
- Location:  
  `src/listPanel.js` — `setBookSortPreference()` → `sortEntriesIfNeeded()`

  Anchor snippet:
  ```js
  await state.saveWorldInfo(name, state.buildSavePayload(name), true);
  sortEntriesIfNeeded(name);
  ```

- What the issue is  
  `setBookSortPreference()` awaits an async save, then immediately calls `sortEntriesIfNeeded(name)` which assumes `state.cache[name]` and its DOM references (`dom.entryList`, `dom.entry[uid].root`) are still present and consistent.

- Why it matters  
  If `refreshList()` (or any other cache-clearing/reload path) runs while the save is in-flight, `state.cache` may be cleared and rebuilt. When the await resumes, `sortEntriesIfNeeded()` can throw (e.g., `Cannot read properties of undefined (reading 'entries')`) or reorder a DOM that no longer matches the book/entries that were just saved. That is a stability issue and can also desync UI state (selection highlight, scroll position, collapse state).

- Severity: High

- Fix risk: Medium  
  The fix will touch a frequently used preference path and needs to avoid changing when/if sorts are applied.

- Confidence: High  
  The post-`await` call uses unguarded cache/DOM access and `refreshList()` explicitly deletes cache keys synchronously.

- Repro idea:  
  1) Open a book with many entries.  
  2) Open the book menu and change sort preference.  
  3) While the save is happening, trigger a list reload (e.g., “Refresh” button, or any action that calls `refreshList()` such as some folder operations).  
  4) Watch for console errors and/or entry list order snapping to an unexpected ordering.

- Suggested direction  
  Ensure the post-save UI update only runs if the same book instance is still in cache and the entryList DOM is still valid.

- Proposed fix  
  Add a stable “generation/token” guard (or equivalent) around list reloads and post-save actions so stale async continuations do not touch cleared/rebuilt cache/DOM. At minimum, short-circuit `sortEntriesIfNeeded()` if the cache entry is missing or DOM nodes are not present.

- Immplementation Checklist:
  [ ] Identify every callsite that can invoke `refreshList()` while menu actions are awaiting (book menu, folder actions, update handler)
  [ ] Add a lightweight list “refresh token” (monotonic counter) stored in listPanel runtime state
  [ ] Capture the token before `await state.saveWorldInfo(...)`
  [ ] After await, validate token and validate `state.cache[name]` + required DOM refs exist; abort if not
  [ ] Add console.warn (prefixed) for aborted stale continuation (optional, low-noise)
  [ ] Manually re-test sort preference change with simultaneous refresh triggers

- Why it’s safe to implement  
  This only prevents stale async continuations from touching invalid state; normal user flows where no refresh occurs in-between remain unchanged.


## F02: Data integrity: `setBookSortPreference()` writes via `buildSavePayload()` from cache (risk of overwriting newer book data)
- Location:  
  `src/listPanel.js` — `setBookSortPreference()`

  Anchor snippet:
  ```js
  state.cache[name].metadata[state.METADATA_NAMESPACE][state.METADATA_SORT_KEY] = { sort, direction };
  await state.saveWorldInfo(name, state.buildSavePayload(name), true);
  ```

- What the issue is  
  Updating a sort preference is fundamentally a metadata-only operation, but the code persists it by calling `saveWorldInfo(name, buildSavePayload(name), ...)`. `buildSavePayload(name)` is typically derived from extension cache (entries + metadata). If the cache is stale or mid-update, this save can unintentionally overwrite changes made elsewhere (core WI UI, other extensions, or even this extension’s own async update cycle).

- Why it matters  
  This is a “silent overwrite” class of bug: users may lose edits that happened between cache hydration and this metadata save (e.g., an entry edit saved through another path, or changes applied by an in-flight WORLDINFO update handler). It directly hits the top priority area (risk of losing user edits) because it saves a full payload even though only a small metadata change is intended.

- Severity: High

- Fix risk: Medium  
  The safe approach likely changes the persistence strategy (load-latest + patch metadata) but should keep observed behavior identical.

- Confidence: Medium  
  Exact risk depends on how authoritative/updated `state.cache` is in practice, but the pattern (“save full payload from cache for metadata-only change”) is commonly risky in async multi-writer systems.

- Repro idea:  
  1) Open Book A in the extension.  
  2) In another UI surface (core WI editor or another extension), modify Book A (add/edit an entry) and let it save.  
  3) Without forcing a list refresh, change Book A’s sort preference in the extension.  
  4) Check whether the other change persists after the sort preference save.

- Suggested direction  
  Persist metadata-only changes using a “load latest → patch metadata only → save” pattern, similar to `setBookFolder()`.

- Proposed fix  
  For sort preference writes, avoid `buildSavePayload(name)` and instead fetch the latest book (`loadWorldInfo`) and update only the `stwid.sort` metadata key before saving.

- Immplementation Checklist:
  [ ] Confirm what `state.buildSavePayload(name)` includes (entries + metadata) and whether it can be stale
  [ ] Align sort-preference persistence strategy with `setBookFolder()` (load latest, structuredClone, patch metadata, save)
  [ ] Ensure cache metadata/sort fields are updated after successful save
  [ ] Add a regression check: set/clear per-book sort while concurrently receiving WORLDINFO updates
  [ ] Verify no other metadata keys are removed/normalized unintentionally

- Why it’s safe to implement  
  The visible behavior (setting/clearing sort preference) remains the same; only the internal method used to avoid overwriting unrelated book state changes.


## F03: Async ordering: `refreshList()` awaits a debounced loader, which can drop/merge refresh requests and produce stale UI
- Location:  
  `src/listPanel.js` — `initListPanel()` / `refreshList()`

  Anchor snippet:
  ```js
  listPanelState.loadListDebounced = state.debounceAsync(()=>loadList());
  // ...
  await listPanelState.loadListDebounced();
  ```

- What the issue is  
  `refreshList()` calls `listPanelState.loadListDebounced()` and awaits it, but the loader itself is wrapped in `debounceAsync`. If multiple refresh triggers fire in quick succession (user actions + WORLDINFO_UPDATED + folder actions), debounce behavior can:
  - cancel earlier scheduled loads,
  - coalesce calls into one,
  - or resolve promises in an order that doesn’t reflect the caller’s “happens after” assumptions.

  The code also clears `state.cache` before scheduling the debounced work.

- Why it matters  
  A refresh call expects the list to be loaded at the point `refreshList()` resolves. With debounced async, callers may observe “refresh resolved but list content is from a later/earlier trigger” or “cache cleared but list not rebuilt yet”, depending on debounce semantics. This can cascade into selection/drag handlers referencing missing DOM, and into editor sync issues.

- Severity: Medium

- Fix risk: Medium  
  Requires careful treatment to preserve current user-perceived behavior (avoid making refresh “spammy”).

- Confidence: Medium  
  The actual behavior depends on `debounceAsync` implementation (host util). The pattern is inherently tricky and the “clear cache before debounced load” increases risk.

- Repro idea:  
  1) Trigger multiple refreshes quickly: click Refresh repeatedly, or perform an action that triggers refresh, then quickly toggle visibility/search.  
  2) Watch for list flicker, incorrect selection state, or console errors from missing DOM/cache.

- Suggested direction  
  Make `refreshList()` internally idempotent and explicitly await the most-recent refresh request, not “a debounced promise that might be superseded”.

- Proposed fix  
  Use an internal “in-flight refresh promise” and/or token-based sequencing so all callers await the final load that corresponds to the latest refresh request, even if debounce coalesces work.

- Immplementation Checklist:
  [ ] Inspect `debounceAsync` semantics (cancelation, promise resolution strategy)
  [ ] Document the intended contract: what does `refreshList()` guarantee to callers?
  [ ] Add a refresh sequencing mechanism (token/promise chaining) around cache clear + loadList
  [ ] Ensure the loading spinner class only toggles off after the final load completes
  [ ] Re-test rapid refresh triggers + drag/drop + sort preference saves

- Why it’s safe to implement  
  The UI still refreshes with debounce behavior, but callers get a reliable “refresh completed” boundary and stale refresh requests stop mutating state after being superseded.


## F04: Potential memory leak / duplicate handlers if `initListPanel()` runs more than once
- Location:  
  `src/listPanel.js` — `initListPanel()` → `wireSlices()` / `setupBooks()`

  Anchor snippet:
  ```js
  const initListPanel = (options)=>{
      state = options;
      wireSlices();
      // ...
      setupListPanel(state.list);
      return getListPanelApi();
  };
  ```

- What the issue is  
  `initListPanel()` wires slices and DOM listeners (e.g., `setupBooks()` adds `dragover`/`drop` handlers), but there is no teardown path if the list panel is re-initialized (drawer rebuilt, hot reload, extension re-mounted, etc.). Since slices are module-level singletons (`filterBarSlice`, `selectionDnDSlice`, etc.), repeated `initListPanel()` calls can stack event listeners and create behavior duplication.

- Why it matters  
  Duplicate handlers can produce “double drop”, “double refresh”, repeated filter applications, and subtle race conditions, as well as long-lived references preventing GC of old DOM nodes (performance and correctness). This is particularly risky in a third-party extension ecosystem where extensions can be enabled/disabled without full page reload depending on host behavior.

- Severity: Medium

- Fix risk: Low to Medium  
  Adding a teardown mechanism is usually localized but must avoid breaking current single-init assumption.

- Confidence: Medium  
  Whether `initListPanel()` can be called more than once depends on how `drawer.js` composes lifecycle, but the code as written provides no protection if it happens.

- Repro idea:  
  Logging idea (if hard to reproduce): add a temporary console counter around `setupBooks()` and slice setup, then reload/re-open the drawer or re-enable the extension and observe whether handlers multiply.

- Suggested direction  
  Treat initialization as a lifecycle: add explicit teardown/disconnect hooks (or make init idempotent) so re-init doesn’t stack listeners.

- Proposed fix  
  Track and remove listeners (or gate init via a “didInit” flag) and expose a `destroyListPanel()` used by drawer teardown if needed.

- Immplementation Checklist:
  [ ] Confirm whether drawer/list panel can be initialized multiple times in the host lifecycle
  [ ] Inventory listeners attached in this module (and through slices) during init
  [ ] Add a teardown function to remove listeners and clear slice refs
  [ ] Ensure `initListPanel()` is idempotent or fails fast if called twice without teardown
  [ ] Verify drag/drop + filter behavior remains single-trigger

- Why it’s safe to implement  
  In the common case (single init), behavior remains unchanged; only repeated init scenarios are stabilized by preventing duplicate listeners.


## F05: UI correctness edge case: `renderBookSourceLinks()` clears container with `innerHTML = ''` (focus/selection can be lost)
- Location:  
  `src/listPanel.js` — `renderBookSourceLinks()`

  Anchor snippet:
  ```js
  sourceLinksContainer.innerHTML = '';
  // re-create icons
  ```

- What the issue is  
  The source link container is wiped and rebuilt whenever `updateBookSourceLinks()` runs. If a user is navigating via keyboard and focus lands on an icon (or assistive tech is reading it), wiping the DOM can drop focus and interrupt screen reader context.

- Why it matters  
  This is an accessibility/UX polish issue that can also manifest as subtle “tab order jumps” during frequent updates (e.g., book source-link refresh triggers). While not a data-loss issue, it affects UI correctness in edge cases and can feel “glitchy”.

- Severity: Low

- Fix risk: Low

- Confidence: Medium  
  Depends on whether the icons are focusable in practice; currently they are `<i>` elements without tabIndex, but some assistive tooling and parent container focus patterns can still be affected.

- Repro idea:  
  Trigger source-link refresh while keeping keyboard focus near the book row controls; observe whether focus unexpectedly moves or whether screen reader announcements reset.

- Suggested direction  
  Prefer minimal DOM diffing: only add/remove icons that changed, instead of replacing the entire container.

- Proposed fix  
  Compare current rendered sources to next sources and update only the delta; avoid clearing the entire container.

- Immplementation Checklist:
  [ ] Confirm whether source icons can receive focus or are part of an aria flow in the book row
  [ ] Add a lightweight diff approach (by `data-source` attribute per icon)
  [ ] Preserve existing nodes when unchanged to maintain focus/AT stability
  [ ] Verify tooltips and aria-labels still update when attribution names change

- Why it’s safe to implement  
  The same icons and labels are rendered; only the internal update strategy changes to reduce UI disruption.