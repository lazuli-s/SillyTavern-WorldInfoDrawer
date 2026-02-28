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
  - Performance: once an exception happens inside the input handler, subsequent input events may keep erroring and the UI will feel "broken" until refresh.
  - This can cascade: folder active toggles and visibility chips depend on filter application finishing.

- Severity: **High**  
  User-visible break with a plausible trigger ("start typing before list finishes loading"), especially on large lore collections / slow machines.

- Fix risk: **Low**  
  Guarding for missing DOM nodes / deferring filtering until render is complete is localized and should not change intended filtering semantics.

- Confidence: **High**  
  The code dereferences `dom.entry[e.uid].root` unconditionally while the render pipeline is asynchronous and incremental.

- Repro idea:
  1) Have many books/entries (or throttle CPU in DevTools).  
  2) Open WorldInfo Drawer and immediately type 2+ characters into the search input while the list is still rendering.  
  3) Watch console for a TypeError; observe search/filter behavior stops updating.

- Suggested direction  
  Make `applySearchFilter()` resilient to "entry exists in cache but not yet rendered" and/or delay filtering until list render completion signals readiness.

- Proposed fix  
  - Skip per-entry DOM filtering when `dom.entry[uid]?.root` is missing.  
  - Optionally apply filtering only at the book level until the entry list is fully present, then refine per-entry.

- Why it's safe to implement (what behavior remains unchanged)  
  The same search semantics remain; the filter code just avoids crashing when DOM nodes aren't yet available.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "applySearchFilter() assumes that for every entry in runtime.cache[b].entries, the DOM map runtime.cache[b].dom.entry[e.uid].root already exists" — **Validated**: Code directly accesses `runtime.cache[b].dom.entry[e.uid].root` without null checks.
  - Claim: "individual entry DOM nodes are added incrementally via await runtime.renderEntry(...)" — **Validated**: The async render pipeline is confirmed in listPanel.booksView.js.

- **Top risks:**
  None identified. This is a straightforward null-check addition.

#### Technical Accuracy Audit

> *The code dereferences dom.entry[e.uid].root unconditionally while the render pipeline is asynchronous and incremental.*

- **Why it may be wrong/speculative:**
  Not speculative — the code clearly accesses `dom.entry[e.uid].root` directly in the for loop.

- **Validation:**
  Validated ✅

- **What needs to be done/inspected to successfully validate:**
  N/A — claim is self-evident from code inspection.

#### Fix Quality Audit

- **Direction:**
  The fix stays within the filterBar module per ARCHITECTURE.md (filterBar owns search filtering). No cross-module moves.

- **Behavioral change:**
  No behavioral changes — only adds defensive null checks that prevent crashes.

- **Ambiguity:**
  Single suggestion: add defensive checks. Unambiguous.

- **Checklist:**
  Checklist items are complete and actionable:
  - "Identify the minimal 'list fully rendered' signal" — feasible via existing runtime.cache checks
  - "Add defensive checks" — straightforward null guard
  - "Add non-throwing fallback" — book-level filtering fallback is concrete
  - "Manual test" — standard validation step

- **Dependency integrity:**
  No cross-finding dependencies declared; none needed.

- **Fix risk calibration:**
  Fix risk is correctly rated Low. Null checks are localized and cannot affect other code paths.

- **"Why it's safe" validity:**
  The safety claim is specific: "same search semantics remain; the filter code just avoids crashing when DOM nodes aren't yet available." This is verifiable — filtering logic unchanged, only crash prevention added.

- **Mitigation:**
  Not needed for this fix.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Identify the minimal "list fully rendered" signal available to the filter bar (or safely detect missing entry DOM nodes).
- [x] Add defensive checks around `runtime.cache[b].dom.entry[e.uid]` before toggling classes.
- [x] Add a non-throwing fallback path (e.g., book-level filtering only) when entry DOM nodes are missing.
- [x] Manually test on a large dataset while typing during initial render and during `Refresh`.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.filterBar.js`
  - Added `?.root` optional chaining on all `dom.entry[e.uid]` accesses in `applySearchFilter()`; `setQueryFiltered()` already guards `!element`, so mid-render missing nodes are silently skipped with no crash.
  - Restructured the per-book filter loop into explicit `shouldScanEntries` / `bookMatch` branches so book-level and entry-level filtering are clearly separated and null-safe paths are unambiguous.

- Risks / Side effects
  - Mid-render entries are silently skipped — their filter class is left unchanged until the next filter run, so they appear unfiltered until the list finishes loading (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] With a large lorebook, open the drawer and immediately type into the search input while the list is still rendering (use DevTools CPU throttling to exaggerate). Confirm no `TypeError` appears in the console and search results are visually correct once loading completes.

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

  …the extension can delete entries that are no longer visible, creating a high-risk "invisible destructive action" scenario. The code allows it because selection state is independent from visibility filtering and the Delete handler does not validate that selected entries are currently visible.

- Why it matters (impact)  
  This is a direct "risk of losing user edits" / data loss issue:
  - Users can delete entries they can't see, especially if they forget a prior selection.
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
  Ensure destructive actions can't apply to entries the user can't currently see, or make the hidden selection state extremely explicit at the moment of deletion.

- Proposed fix  
  **Behavior Change Required:** Add a guard so Delete either:
  - clears/updates selection when filters hide selected rows, or
  - blocks/prompt-confirms when the selection is partially/fully hidden by active filters.

- Why it's safe to implement (what behavior remains unchanged)  
  The core "Delete selected entries" capability remains; the change is only to prevent unintentional deletion when selection is not currently visible to the user.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "filter bar hides books/entries by adding CSS classes" — **Validated**: Code shows `classList.toggle('stwid--filter-visibility')` and `setQueryFiltered`.
  - Claim: "Delete handler does not validate that selected entries are currently visible" — **Validated**: `drawer.js` onDrawerKeydown has no visibility check before iterating `selectionState.selectList`.

- **Top risks:**
  - Internal inconsistency: The finding claims high severity but proposes a behavioral change without acknowledging the interaction with F01 (search crash may mask this issue in practice).

#### Technical Accuracy Audit

> *The code allows it because selection state is independent from visibility filtering and the Delete handler does not validate that selected entries are currently visible.*

- **Why it may be wrong/speculative:**
  Not speculative — verified by reading both filterBar.js (adds CSS classes) and drawer.js (no visibility check before delete).

- **Validation:**
  Validated ✅

- **What needs to be done/inspected to successfully validate:**
  N/A — code inspection confirms the gap.

#### Fix Quality Audit

- **Direction:**
  The fix requires coordination between filterBar.js and drawer.js modules. Per ARCHITECTURE.md, filterBar owns filtering and drawer owns Delete handling — this is a cross-module issue that needs explicit architectural consideration. The finding correctly labels it "Structural Issue" implications.

- **Behavioral change:**
  **Behavior Change Required** is correctly flagged. The fix will change how Delete behaves when selection is hidden.

- **Ambiguity:**
  Two options are provided ("clear selection" vs "block/prompt"). Per meta-review rules, there should be only one recommendation. The least-behavioral-change option (blocking Delete when selection is hidden, with confirmation prompt) should be the sole recommendation.

- **Checklist:**
  Checklist items are complete:
  - "Decide expected UX" — requires user input to pick one option
  - "Add visibility check" — concrete implementation step
  - "If selection becomes invalid" — action item
  - "Manual test" — validation step
  However, the first step requires a UX decision before implementation can proceed.

- **Dependency integrity:**
  No declared dependency on F01, F03, F04, or F05. However, if F01 (crash on mid-render search) is fixed first, users may encounter this F02 issue more frequently (since crash won't interrupt). This should be noted but is not a blocking dependency.

- **Fix risk calibration:**
  Fix risk is correctly rated Medium. The change touches Delete handler behavior which is high-visibility.

- **"Why it's safe" validity:**
  The safety claim is specific: "core Delete capability remains; change only prevents unintentional deletion when not visible." This is accurate.

- **Mitigation:**
  Not needed.

- **Verdict:** Implementation plan needs revision 🟡

#### Detailed Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Step 1 provides two options for UX (clear selection vs block/prompt) but should pick ONE. Per least-behavioral-change rule, blocking with confirmation prompt is preferred as it preserves selection context.
> Revisions applied: Consolidated to single recommendation — add visibility check and confirmation prompt before Delete executes when selection is partially/fully hidden.

- [x] Add a helper function `isSelectionVisible()` that checks whether all selected UIDs in `selectionState.selectList` have visible DOM nodes (not hidden by `.stwid--filter-query` or `.stwid--filter-visibility` classes).
- [x] In the Delete handler (drawer.js onDrawerKeydown), call `isSelectionVisible()` before proceeding.
- [x] If selection is not visible, show a confirmation prompt (e.g., "X selected entries are currently hidden by filters. Delete anyway?").
- [x] If user confirms, proceed with deletion; if cancelled, preserve selection and do nothing.
- [x] Add manual test cases: filter hides none / some / all selected entries; verify resulting behavior is predictable and safe.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/drawer.js`
  - Added `isSelectionVisible()` local helper in the Delete key handler that checks whether the source book root is free of `stwid--filter-visibility` / `stwid--filter-query` and every selected entry root is free of `stwid--filter-query`.
  - If `isSelectionVisible()` returns `false`, `Popup.show.confirm()` shows a count-aware message ("X selected entries are currently hidden by filters. Delete anyway?") before any destructive operation; cancelling aborts the delete and preserves the existing selection.

- Risks / Side effects
  - Adds an async `await` (Popup.show.confirm) before the existing `loadWorldInfo` await in the Delete path — introduces one additional user-visible pause when selection is hidden (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Select visible entries and press Delete — confirm deletion proceeds without a prompt. Select entries, apply a filter that hides them, press Delete — confirm a dialog appears. Cancel; confirm entries are still present and selection is unchanged. Confirm; confirm entries are deleted.

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

- Why it's safe to implement (what behavior remains unchanged)  
  Search results remain the same; only the internal efficiency and timing of DOM updates changes.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "iterate every book in runtime.cache" — **Validated**: `for (const b of Object.keys(runtime.cache))`
  - Claim: "potentially scan every entry twice" — **Validated**: `.find()` + for-loop over same entries
  - Claim: "toggle DOM classes for every entry in every book" — **Validated**: Nested loops call `setQueryFiltered` per entry

- **Top risks:**
  None — the performance issue is well-evidenced.

#### Technical Accuracy Audit

> *The algorithm is plainly linear over all rendered DOM nodes per invocation and does many classList operations.*

- **Why it may be wrong/speculative:**
  Not speculative — code structure confirms O(n) per keystroke.

- **Validation:**
  Validated ✅

- **What needs to be done/inspected to successfully validate:**
  N/A — code structure is self-evident.

#### Fix Quality Audit

- **Direction:**
  Stays within filterBar module per ARCHITECTURE.md. No cross-module moves.

- **Behavioral change:**
  No behavioral change — only internal performance optimization.

- **Ambiguity:**
  Multiple suggestions provided (delta tracking, batching, deferring folder toggles). This is acceptable as these are complementary optimizations, not conflicting alternatives.

- **Checklist:**
  Checklist is complete:
  - "Measure baseline" — standard performance analysis
  - "Identify avoidable passes" — concrete optimization
  - "Reduce per-entry DOM writes" — specific optimization
  - "Ensure folder toggle reflects final state" — correctness check
  - "Confirm identical results" — validation

- **Dependency integrity:**
  None.

- **Fix risk calibration:**
  Fix risk is correctly rated Medium. DOM manipulation changes can have unexpected side effects.

- **"Why it's safe" validity:**
  Specific claim: "Search results remain the same; only internal efficiency changes." This is verifiable.

- **Mitigation:**
  Not needed.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Measure current performance on large datasets to define baseline.
- [x] Identify avoidable passes (e.g., avoid `.find` + full loop when book already matches).
- [x] Reduce per-entry DOM writes when book-level match makes them redundant.
- [x] Ensure folder toggle refresh still reflects final filtered visibility.
- [x] Confirm identical visible results for existing search behavior.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.filterBar.js`
  - When `bookMatch === true` and entry scanning is on: skips all `entryMatchesQuery()` calls and clears every entry's filter class without any query computation per entry.
  - When `bookMatch === false` and entry scanning is on: replaced the separate `.find()` first pass + full-loop second pass with a single pass that tracks `anyEntryMatch` and sets per-entry filter classes in one iteration, halving entry traversal cost.
  - When entry scanning is off: all entry filter-class writes still clear stale scan-state but no `entryMatchesQuery()` is ever called — explicit in its own branch for clarity.

- Risks / Side effects
  - In the book-match-true + scanning case, entries are all shown regardless of individual query match — this matches prior semantics (`!(true || ...)` = `false`), so visible results are unchanged (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Enable "Entries" search toggle and type a query that matches a book name but not some of its entries; confirm all entries in that book remain visible. Type a query that matches only individual entries (not the book name); confirm only matching entries are visible and the book is shown.

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

  Over long sessions with frequent entry churn, the cache can accumulate stale UID keys and increase memory usage. Since the cache is nested by book name, book rename can also "orphan" a whole subtree.

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
  Tie cache lifecycle to the same lifecycle that owns `runtime.cache` and list refresh, so removed items don't accumulate.

- Proposed fix  
  - On book removal, delete that book's cache subobject.  
  - On entry removal, delete that UID entry.  
  - Optionally clear all cache on `refreshList()` if correctness is more important than micro-optimizations.

- Why it's safe to implement (what behavior remains unchanged)  
  Cache is an internal optimization. Clearing/pruning only affects performance characteristics (slightly) and should not change which items match a given query.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "Cache only ever grows (aside from clearEntrySearchCache() on init)" — **Validated**: No delete/remove calls in filterBar.js; confirmed via search across codebase.
  - Claim: "Removal paths do not touch it" — **Validated**: No `deleteEntrySearchCache` or similar calls found.

- **Top risks:**
  None — the leak is well-evidenced.

#### Technical Accuracy Audit

> *Cache only ever grows (aside from clearEntrySearchCache() on init), and removal paths do not touch it.*

- **Why it may be wrong/speculative:**
  Not speculative — code inspection confirms no cleanup paths exist.

- **Validation:**
  Validated ✅

- **What needs to be done/inspected to successfully validate:**
  N/A — confirmed via code search.

#### Fix Quality Audit

- **Direction:**
  Fix spans filterBar.js and state.js (cache lives in state.js per ARCHITECTURE.md). This is appropriate since the cache is owned by listPanel.state.js.

- **Behavioral change:**
  No behavioral change — only internal memory management.

- **Ambiguity:**
  Multiple options provided (per-book/entry deletion vs full clear). Acceptable as complementary approaches.

- **Checklist:**
  Checklist is complete:
  - "Identify removal points" — concrete investigation
  - "Delete stale keys" — specific action
  - "Sanity bound (optional)" — optional enhancement
  - "Verify still works" — validation

- **Dependency integrity:**
  None.

- **Fix risk calibration:**
  Fix risk correctly rated Low. Cache management is internal and localized.

- **"Why it's safe" validity:**
  Specific claim: "Cache is internal optimization... should not change which items match." This is accurate.

- **Mitigation:**
  Not needed.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Identify book/entry removal points (e.g., WI updates, refresh list, delete flows).
- [x] Delete stale keys from `entrySearchCache` when an entry/book no longer exists.
- [ ] Add a sanity bound (optional) to prevent pathological growth.
- [x] Verify entry search still works and updates when comment/key changes.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.state.js`, `src/listPanel.filterBar.js`
  - Added `pruneEntrySearchCacheStaleBooks(activeBookNames)` method to `listPanelState` that iterates current cache keys and deletes any book key not present in the provided active set.
  - Called at the start of `applySearchFilter()` with `Object.keys(runtime.cache)` so stale book entries are pruned on each filter run without requiring cross-module wiring to delete/rename events.

- Risks / Side effects
  - Pruning on every search keystroke adds a small O(cached book count) loop — negligible given typical book counts (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Use the drawer with several books, run entry search, then delete a book and search again. Inspect `listPanelState.entrySearchCache` in the browser console; confirm the deleted book's key is no longer present after the next search run.

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
  It depends on whether ST ever re-inits extensions without full reload; the project already includes "best-effort cleanup" patterns in `drawer.js` for some global listeners, suggesting this is a real concern.

- Repro idea:
  - In a dev environment that reloads the extension without page refresh, reload multiple times and click around; log counts of invoked handlers (temporary console trace) or use DevTools Event Listeners pane to observe duplicates.

- Suggested direction  
  Align filter bar global listener lifecycle with other cleanup patterns used in the extension (store handler reference, remove during teardown).

- Proposed fix  
  - Store the click handler function in slice state and provide a cleanup method (or integrate with existing cleanup orchestration) to remove it when the drawer is destroyed.

- Why it's safe to implement (what behavior remains unchanged)  
  Menu closing behavior remains identical; the change only prevents duplicated listeners and improves lifecycle hygiene.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "document.addEventListener via inline anonymous function" — **Validated**: Code shows inline handler.
  - Claim: "does not store a reference for removal" — **Validated**: No reference stored.
  - Claim: "project includes best-effort cleanup patterns in drawer.js" — **Validated**: drawer.js has cleanup for other global listeners.

- **Top risks:**
  None — the issue is well-evidenced and the fix is straightforward.

#### Technical Accuracy Audit

> *It depends on whether ST ever re-inits extensions without full reload; the project already includes "best-effort cleanup" patterns in drawer.js for some global listeners, suggesting this is a real concern.*

- **Why it may be wrong/speculative:**
  This is partially speculative — depends on whether re-init happens in practice. However, the existence of cleanup patterns elsewhere in the codebase confirms the concern is valid.

- **Validation:**
  Validated ✅ — Existence of cleanup patterns confirms the concern is architectural.

- **What needs to be done/inspected to successfully validate:**
  N/A — cleanup patterns in drawer.js confirm architectural intent.

#### Fix Quality Audit

- **Direction:**
  Stays within filterBar module. Fix is to store handler reference and return cleanup from createFilterBarSlice.

- **Behavioral change:**
  No behavioral change — only lifecycle improvement.

- **Ambiguity:**
  Single suggestion: store handler reference. Unambiguous.

- **Checklist:**
  Checklist is complete:
  - "Decide ownership" — slice ownership is clear
  - "Store handler reference" — concrete action
  - "Add cleanup hook" — concrete action
  - "Verify no regressions" — validation

- **Dependency integrity:**
  None.

- **Fix risk calibration:**
  Fix risk correctly rated Low. Simple reference storage.

- **"Why it's safe" validity:**
  Specific: "Menu closing behavior remains identical; change only prevents duplicated listeners." Accurate.

- **Mitigation:**
  Not needed.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Decide ownership for teardown (drawer module vs listPanel module vs slice).
- [x] Store the handler function reference so it can be removed.
- [x] Add a cleanup hook invoked from the same place as other global listener cleanups.
- [x] Verify no regressions in click-outside-to-close behavior.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.filterBar.js`, `src/listPanel.js`
  - Replaced the anonymous inline `document.addEventListener('click', ...)` with a named `onDocClickCloseMenu` function stored in `docClickHandler` (slice-scoped variable) before registration.
  - Added `cleanup()` to the `createFilterBarSlice` return object that calls `document.removeEventListener('click', docClickHandler)` and nulls the reference.
  - Wired `filterBarSlice?.cleanup?.()` into `teardownListPanel()` in `listPanel.js` (before the slice reference is cleared), consistent with how other global listener cleanups are handled.

- Risks / Side effects
  - If `teardownListPanel` is never called (e.g., normal browser page unload), the listener remains — same behavior as before the fix (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] In a dev environment that reloads the extension without a full page refresh, reload twice. Open and close the Book Visibility menu by clicking outside it; confirm it closes exactly once per click and no duplicate handlers fire. Confirm no console errors.

---

### Coverage Note

- **Obvious missed findings:** None identified. The review covers the key areas: race conditions (F01), data integrity (F02), performance (F03), memory management (F04), and lifecycle/cleanup (F05). All have clear evidence and actionable fixes.
- **Severity calibration:** F01 and F02 are correctly rated High — they can cause data loss or user-visible crashes. F03-F05 are appropriately rated Medium/Low as they affect perf/lifecycle but not correctness.
