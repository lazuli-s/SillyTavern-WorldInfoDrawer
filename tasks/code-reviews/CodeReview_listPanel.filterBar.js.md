# CODE REVIEW FINDINGS: `src/listPanel.filterBar.js`

Scope reviewed:
- `src/listPanel.filterBar.js` (primary)
- Referenced helpers (evidence only where relevant):
  - `src/listPanel.state.js` (entry-search cache, visibility state holders)
  - `src/listPanel.booksView.js` (load pipeline interacts with search)
  - `src/drawer.js` (Delete key behavior + selection model interaction)
  - `src/bookSourceLinks.js` / `src/wiUpdateHandler.js` (re-application of active filter triggers)

## F01: Search filter can throw during list load due to partially built `dom.entry[uid]` map (race during async render)
- Location:
  - `src/listPanel.filterBar.js` → `createFilterBarSlice()` → `setupFilter()` → `applySearchFilter()`
  - Anchor snippet:
    ```js
    for (const b of Object.keys(runtime.cache)) {
        // ...
        for (const e of Object.values(runtime.cache[b].entries)) {
            setQueryFiltered(runtime.cache[b].dom.entry[e.uid].root, !(bookMatch || entryMatchesQuery(b, e, query)));
        }
    }
    ```

- What the issue is  
  `applySearchFilter()` assumes that for every entry in `runtime.cache[b].entries`, the DOM map `runtime.cache[b].dom.entry[e.uid].root` already exists. During `loadList()` and `renderBook()` the cache object is created early, but individual entry DOM nodes are added incrementally via `await runtime.renderEntry(...)` (see `src/listPanel.booksView.js` → `renderBook()`).

  If the user types into the search box while a book is mid-render (or while entries are being appended), `runtime.cache[b].entries` can already contain a UID whose `dom.entry[uid]` has not been created yet, leading to `Cannot read properties of undefined (reading 'root')` and breaking the filter logic (and potentially leaving the UI in a partially filtered state).

- Why it matters (impact)  
  - UI correctness: search filtering becomes flaky during initial load or heavy refreshes.
  - Performance: once an exception happens inside the input handler, subsequent input events may keep erroring and the UI will feel “broken” until refresh.
  - This can cascade: folder active toggles and visibility chips depend on filter application finishing.

- Severity: **High**  
  User-visible break with a plausible trigger (“start typing before list finishes loading”), especially on large lore collections / slow machines.

- Fix risk: **Low**  
  Guarding for missing DOM nodes / deferring filtering until render is complete is localized and should not change intended filtering semantics.

- Confidence: **High**  
  The code dereferences `dom.entry[e.uid].root` unconditionally while the render pipeline is asynchronous and incremental.

- Repro idea:
  1) Have many books/entries (or throttle CPU in DevTools).  
  2) Open WorldInfo Drawer and immediately type 2+ characters into the search input while the list is still rendering.  
  3) Watch console for a TypeError; observe search/filter behavior stops updating.

- Suggested direction  
  Make `applySearchFilter()` resilient to “entry exists in cache but not yet rendered” and/or delay filtering until list render completion signals readiness.

- Proposed fix  
  - Skip per-entry DOM filtering when `dom.entry[uid]?.root` is missing.  
  - Optionally apply filtering only at the book level until the entry list is fully present, then refine per-entry.

- Immplementation Checklist:
  - [ ] Identify the minimal “list fully rendered” signal available to the filter bar (or safely detect missing entry DOM nodes).
  - [ ] Add defensive checks around `runtime.cache[b].dom.entry[e.uid]` before toggling classes.
  - [ ] Add a non-throwing fallback path (e.g., book-level filtering only) when entry DOM nodes are missing.
  - [ ] Manually test on a large dataset while typing during initial render and during `Refresh`.

- Why it’s safe to implement (what behavior remains unchanged)  
  The same search semantics remain; the filter code just avoids crashing when DOM nodes aren’t yet available.

---

## F02: Data integrity risk—filtering can hide an active multi-entry selection, making Delete key operations unintentionally destructive (**Behavior Change Required**)
- Location:
  - `src/listPanel.filterBar.js` → `setupFilter()` → `applySearchFilter()` and `applyActiveFilter()` (hiding via CSS classes)
  - Related behavior:
    - `src/drawer.js` → `onDrawerKeydown()` (Delete key deletes `selectionState.selectList` from `selectionState.selectFrom`)
  - Anchor snippet (filter hiding):
    ```js
    runtime.cache[b].dom.root.classList.toggle('stwid--filter-visibility', hideByVisibilityFilter);
    // and
    setQueryFiltered(runtime.cache[b].dom.root, !(bookMatch || entryMatch));
    ```
    Anchor snippet (delete):
    ```js
    if (selectionState.selectFrom === null || !selectionState.selectList?.length) return;
    // ...
    for (const uid of selectionState.selectList) {
        const deleted = await deleteWorldInfoEntry(srcBook, uid, { silent:true });
        // ...
    }
    ```

- What the issue is  
  The filter bar hides books/entries by adding CSS classes (`stwid--filter-query` / `stwid--filter-visibility`) but does not coordinate with selection state. If the user:
  1) Selects multiple entries (possibly across a book),
  2) Applies a search/visibility filter that hides the selected entries or even the entire source book,
  3) Presses Delete,

  …the extension can delete entries that are no longer visible, creating a high-risk “invisible destructive action” scenario. The code allows it because selection state is independent from visibility filtering and the Delete handler does not validate that selected entries are currently visible.

- Why it matters (impact)  
  This is a direct “risk of losing user edits” / data loss issue:
  - Users can delete entries they can’t see, especially if they forget a prior selection.
  - The Delete action is silent (`{ silent:true }`) and loops multiple UIDs.

- Severity: **High**

- Fix risk: **Medium**  
  Any mitigation likely changes interaction behavior (clearing selection on filter change, blocking Delete when selection is hidden, or prompting). That is a behavior change, but arguably required to protect data.

- Confidence: **Medium**  
  Depends on whether selection UI makes hidden selections obvious (toast/highlight) in practice, but from code alone there is no guard in the Delete flow.

- Repro idea:
  1) Select multiple entries in a book (Shift-select).  
  2) In search, type a query that hides the book/entries.  
  3) Press Delete while the drawer is focused.  
  4) Clear the search; verify entries were deleted.

- Suggested direction  
  Ensure destructive actions can’t apply to entries the user can’t currently see, or make the hidden selection state extremely explicit at the moment of deletion.

- Proposed fix  
  **Behavior Change Required:** Add a guard so Delete either:
  - clears/updates selection when filters hide selected rows, or
  - blocks/prompt-confirms when the selection is partially/fully hidden by active filters.

- Immplementation Checklist:
  - [ ] Decide expected UX: clear selection on any filter change vs preserve selection but prevent invisible deletion.
  - [ ] Add a visibility check for `selectionState.selectFrom/selectList` before deletion (book + entry DOM visibility classes).
  - [ ] If selection becomes invalid/hidden, either clear it or require confirmation before deleting.
  - [ ] Add manual test cases: filter hides none / some / all selected entries; verify resulting behavior is predictable and safe.

- Why it’s safe to implement (what behavior remains unchanged)  
  The core “Delete selected entries” capability remains; the change is only to prevent unintentional deletion when selection is not currently visible to the user.

---

## F03: Search filtering does full DOM toggling across all books and all entries every keystroke (input latency risk on large datasets)
- Location:
  - `src/listPanel.filterBar.js` → `setupFilter()` → `applySearchFilter()`
  - Anchor snippet:
    ```js
    for (const b of Object.keys(runtime.cache)) {
        // potentially scans entries
        const entryMatch = shouldScanEntries
            && Object.values(runtime.cache[b].entries).find((e)=>entryMatchesQuery(b, e, query));
        // then toggles classes on book and on every entry
        for (const e of Object.values(runtime.cache[b].entries)) {
            setQueryFiltered(runtime.cache[b].dom.entry[e.uid].root, ...);
        }
    }
    ```

- What the issue is  
  Even with the 125ms debounce, each input event can:
  - iterate every book in `runtime.cache`,
  - potentially scan every entry twice (once for `.find`, then again for per-entry toggling),
  - toggle DOM classes for every entry in every book.

  This is O(total entries) per keystroke and involves heavy DOM writes, which can cause noticeable input lag for users with large lorebooks (hundreds/thousands of entries).

- Why it matters (impact)  
  - Performance: sluggish typing, delayed UI updates, main-thread stalls.
  - Secondary effects: frequent folder active toggle recomputations (`updateFolderActiveToggles()`) may amplify the cost.

- Severity: **Medium**  
  Not correctness-breaking, but very noticeable for large datasets, and search is a high-frequency interaction.

- Fix risk: **Medium**  
  Optimizing without changing behavior requires care (same visible results, just less work).

- Confidence: **High**  
  The algorithm is plainly linear over all rendered DOM nodes per invocation and does many classList operations.

- Repro idea:
  1) Use a large set of books/entries.  
  2) Turn on entry search toggle and type quickly.  
  3) Profile performance (DevTools) and look for long tasks from `applySearchFilter()` and repeated `classList` operations.

- Suggested direction  
  Reduce DOM work per input by short-circuiting, batching, or avoiding per-entry writes unless needed.

- Proposed fix  
  - Avoid scanning entries and toggling per-entry classes unless entry-search is enabled and query is non-empty.  
  - Consider tracking last query and only updating deltas (books/entries that changed match state).  
  - Defer `updateFolderActiveToggles()` or batch it to animation frames.

- Immplementation Checklist:
  - [ ] Measure current performance on large datasets to define baseline.
  - [ ] Identify avoidable passes (e.g., avoid `.find` + full loop when book already matches).
  - [ ] Reduce per-entry DOM writes when book-level match makes them redundant.
  - [ ] Ensure folder toggle refresh still reflects final filtered visibility.
  - [ ] Confirm identical visible results for existing search behavior.

- Why it’s safe to implement (what behavior remains unchanged)  
  Search results remain the same; only the internal efficiency and timing of DOM updates changes.

---

## F04: Entry search cache can grow unbounded across session (memory/perf degradation over time)
- Location:
  - `src/listPanel.filterBar.js` → `setupFilter()` → `getEntrySearchText()`
  - Related helper:
    - `src/listPanel.state.js` → `entrySearchCache` + `ensureEntrySearchCacheBook()` / `setEntrySearchCacheValue()`
  - Anchor snippet:
    ```js
    listPanelState.ensureEntrySearchCacheBook(bookName);
    const cached = listPanelState.getEntrySearchCacheValue(bookName, entry.uid);
    // ...
    listPanelState.setEntrySearchCacheValue(bookName, entry.uid, { signature, text });
    ```

- What the issue is  
  `entrySearchCache` stores per-(bookName, uid) cached lowercase search text and a signature. There is:
  - no pruning when entries are deleted,
  - no pruning when books are deleted/renamed,
  - no global size bound.

  Over long sessions with frequent entry churn, the cache can accumulate stale UID keys and increase memory usage. Since the cache is nested by book name, book rename can also “orphan” a whole subtree.

- Why it matters (impact)  
  - Performance: larger cache increases overhead when caching/signature checks happen frequently.
  - Memory: long-running browser sessions can bloat.

- Severity: **Low / Medium**  
  It is a gradual degradation rather than an immediate bug, but it affects high-frequency search interactions.

- Fix risk: **Low**  
  Adding cleanup hooks (on list refresh / book removal / entry removal) is typically localized.

- Confidence: **High**  
  Cache only ever grows (aside from `clearEntrySearchCache()` on init), and removal paths do not touch it.

- Repro idea:
  - Add/remove many entries and books, then inspect `listPanelState.entrySearchCache` size in console.

- Suggested direction  
  Tie cache lifecycle to the same lifecycle that owns `runtime.cache` and list refresh, so removed items don’t accumulate.

- Proposed fix  
  - On book removal, delete that book’s cache subobject.  
  - On entry removal, delete that UID entry.  
  - Optionally clear all cache on `refreshList()` if correctness is more important than micro-optimizations.

- Immplementation Checklist:
  - [ ] Identify book/entry removal points (e.g., WI updates, refresh list, delete flows).
  - [ ] Delete stale keys from `entrySearchCache` when an entry/book no longer exists.
  - [ ] Add a sanity bound (optional) to prevent pathological growth.
  - [ ] Verify entry search still works and updates when comment/key changes.

- Why it’s safe to implement (what behavior remains unchanged)  
  Cache is an internal optimization. Clearing/pruning only affects performance characteristics (slightly) and should not change which items match a given query.

---

## F05: Global document click handler for menu close has no cleanup path (listener leak if drawer is re-initialized without full page unload)
- Location:
  - `src/listPanel.filterBar.js` → `setupFilter()` (adds `document.addEventListener('click', ...)`)
  - Anchor snippet:
    ```js
    document.addEventListener('click', (evt)=>{
        if (!menu.classList.contains('stwid--active')) return;
        const target = evt.target instanceof HTMLElement ? evt.target : null;
        if (target?.closest('.stwid--bookVisibility')) return;
        closeBookVisibilityMenu();
    });
    ```

- What the issue is  
  `setupFilter()` adds a document-level click listener via an inline anonymous function and does not store a reference for removal. If the extension is reloaded or the drawer/list panel is re-initialized without a full browser reload (e.g., ST extension reload mechanisms, dev hot-reload patterns, or repeated `addDrawer()` calls in future refactors), multiple identical listeners can accumulate.

  Additionally, because the handler closes over `menu`, old handlers can retain detached DOM references longer than necessary.

- Why it matters (impact)  
  - Performance: redundant global listeners run on every click.
  - UI correctness: multiple handlers might race/duplicate-close, making menu behavior harder to reason about in future changes.
  - Memory: closures can keep old DOM alive longer.

- Severity: **Medium**  
  Not always triggered in normal use, but becomes significant during reload/dev workflows and makes the module more fragile to future lifecycle changes.

- Fix risk: **Low**  
  Storing a handler reference and removing it in an explicit cleanup hook is localized.

- Confidence: **Medium**  
  It depends on whether ST ever re-inits extensions without full reload; the project already includes “best-effort cleanup” patterns in `drawer.js` for some global listeners, suggesting this is a real concern.

- Repro idea:
  - In a dev environment that reloads the extension without page refresh, reload multiple times and click around; log counts of invoked handlers (temporary console trace) or use DevTools Event Listeners pane to observe duplicates.

- Suggested direction  
  Align filter bar global listener lifecycle with other cleanup patterns used in the extension (store handler reference, remove during teardown).

- Proposed fix  
  - Store the click handler function in slice state and provide a cleanup method (or integrate with existing cleanup orchestration) to remove it when the drawer is destroyed.

- Immplementation Checklist:
  - [ ] Decide ownership for teardown (drawer module vs listPanel module vs slice).
  - [ ] Store the handler function reference so it can be removed.
  - [ ] Add a cleanup hook invoked from the same place as other global listener cleanups.
  - [ ] Verify no regressions in click-outside-to-close behavior.

- Why it’s safe to implement (what behavior remains unchanged)  
  Menu closing behavior remains identical; the change only prevents duplicated listeners and improves lifecycle hygiene.

---