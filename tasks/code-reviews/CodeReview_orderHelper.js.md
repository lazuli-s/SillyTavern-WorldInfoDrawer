# CODE REVIEW FINDINGS: `src/orderHelper.js`

## F01: Opening Order Helper can clear the entry editor and lose unsaved typing (no "dirty" guard)

### STEP 1. FIRST CODE REVIEW

When you open the Order Helper, the entry editor on the right can get cleared immediately. If you were in the middle of typing something into an entry and it wasn't saved yet, that work may disappear without any warning.

- **Location:**
  - `src/orderHelper.js` → `openOrderHelper()` calling `renderOrderHelper(book)`
  - (Effect occurs inside the renderer; see `src/orderHelperRender.js` → `renderOrderHelper()` calling `editorPanelApi.resetEditorState()`)
  - Anchor snippet (caller):
    ```js
    const openOrderHelper = (book = null, scope = null)=>{
        ...
        dom.order.toggle.classList.add('stwid--active');
        renderOrderHelper(book);
    };
    ```

- **Detailed Finding:**
  - `openOrderHelper()` activates the Order Helper and immediately calls `renderOrderHelper(book)`.
  - The Order Helper render pipeline unconditionally calls `editorPanelApi.resetEditorState()` before building the table UI.
  - `resetEditorState()` clears the editor DOM and entry highlight state.
  - There is no check here for "is the editor dirty / unsaved?" and no confirmation prompt. So the user can lose in-progress changes if they open Order Helper while typing in an entry editor that hasn't yet been persisted back to the underlying world-info model.
  - This is a data-integrity risk because the extension explicitly supports "dirty tracking to prevent refresh discarding typed input" in the normal update flow, but Order Helper bypasses that protective behavior by force-resetting the editor at open time.

- **Why it matters:**
  - Users can lose typed content without realizing it, which is one of the highest-impact UX failures for an editor.
  - It can reduce trust in the extension ("it ate my edits").

- **Severity:** High ❗❗

- **Confidence:** High 😀
  - The call chain is direct (`openOrderHelper()` → `renderOrderHelper()` → `resetEditorState()`), and `resetEditorState()` clears the editor.

- **Reproducing the issue:**
  1. Open any entry in the editor and start typing in a text field.
  2. Without doing anything that clearly "saves", open the Order Helper.
  3. Observe the entry editor is cleared and your typing may be gone.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add a safety gate before opening Order Helper when the entry editor has unsaved changes.

- **Proposed fix:**
  - In `openOrderHelper()` (or immediately before `renderOrderHelper(book)`), consult the editor panel API for dirty state (or the currently edited entry key) and block opening unless the user confirms discarding changes.
  - If you can't reliably detect dirty state globally, consider a conservative approach: treat "an entry is open" as potentially dirty and prompt, or implement an explicit "Save/Apply" step before switching modes.

- **Fix risk:** Medium 🟡
  - Adds a new prompt in some flows; if implemented too aggressively it may annoy users.
  - If dirty detection is incomplete, you may either miss cases (still lose edits) or over-prompt.

- **Why it's safe to implement:**
  - The Order Helper's behavior and capabilities remain the same; only adds a user safety confirmation when unsaved editor changes exist.

- **Pros:**
  - Prevents the most painful class of user data loss.
  - Aligns Order Helper mode-switching with the extension's existing "don't discard typed edits" goal.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ Call chain `openOrderHelper()` → `renderOrderHelper(book)` verified in `orderHelper.js:167-168`
  - ✅ `renderOrderHelper()` calls `editorPanelApi.resetEditorState()` verified in `orderHelperRender.js:47-48`
  - ✅ `resetEditorState()` clears editor (`clearEditor()`) and entry highlights verified in `editorPanel.js:132-136`
  - ✅ Dirty-tracking mechanism (`isDirty(name, uid)`) exists in `editorPanel.js:197-200` but is NOT consulted before Order Helper opens

- **Top risks:**
  - High-severity data loss issue is confirmed
  - Fix is straightforward (add guard + confirmation) but must use correct dirty-state API

#### Technical Accuracy Audit

For each questionable claim:

  > *The Order Helper render pipeline unconditionally calls `editorPanelApi.resetEditorState()` before building the table UI.*

- **Why it may be wrong/speculative:**
  Not speculative — verified in source.

- **Validation:**
  Validated ✅ — Line 47-48 of `orderHelperRender.js` shows `editorPanelApi.resetEditorState()` called unconditionally.

---

  > *There is no check here for "is the editor dirty / unsaved?"*

- **Why it may be wrong/speculative:**
  Not speculative — verified.

- **Validation:**
  Validated ✅ — `openOrderHelper()` in `orderHelper.js:156-168` has no dirty check before calling `renderOrderHelper()`.

---

  > *The extension explicitly supports "dirty tracking to prevent refresh discarding typed input" in the normal update flow*

- **Why it may be wrong/speculative:**
  Could be overstated without verification.

- **Validation:**
  Validated ✅ — `editorPanel.js` implements full dirty tracking (`isEditorDirty`, `markEditorDirtyIfCurrent`, `isDirty()`, `markClean()`) used elsewhere (e.g., `wiUpdateHandler.js` guards against refresh when dirty).

#### Fix Quality Audit

- **Direction:**
  Correct — adding a guard in `openOrderHelper()` before calling `renderOrderHelper()` is the right location. Stays within `orderHelper.js` module boundaries.

- **Behavioral change:**
  Yes, adds a confirmation prompt when editor is dirty. This is explicitly a behavior change, but it's protective rather than disruptive. Should be documented as "adds unsaved-changes confirmation when opening Order Helper".

- **Ambiguity:**
  Single recommendation: check dirty state before opening, prompt if dirty. No alternatives presented.

- **Checklist:**
  - ⚠️ Step 1 ("Confirm where dirty-state is exposed") is unnecessary — already confirmed: `getEditorPanelApi().isDirty(name, uid)` plus `currentEditorKey` tracking exists. Should be rephrased as "Use the existing `getEditorPanelApi().isDirty()` API".
  - ⚠️ Step 3 ("Ensure the same guard exists for any other entry-editor-clearing Order Helper entry points") is vague — what are these? Should specify: verify menu shortcuts in `listPanel.bookMenu.js` that call `openOrderHelper()`.

- **Dependency integrity:**
  No cross-finding dependencies declared. This fix is independent.

- **Fix risk calibration:**
  Medium 🟡 is appropriate — adds user-facing prompt flow, requires correct API usage.

- **"Why it's safe" validity:**
  Claim is vague ("Order Helper's behavior and capabilities remain the same"). Should specify: existing Order Helper functionality unchanged; only adds pre-open guard.

- **Mitigation:**
  Not required — risk is acceptable with proper implementation.

- **Verdict:** Implementation plan needs revision 🟡

  **Reason:** Checklist Step 1 is redundant (dirty-state API location is confirmed). Step 3 is vague about which "other entry points" exist. The checklist needs tightening before implementation.

#### Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Step 1 redundant (dirty-state API confirmed); Step 3 vague about entry points.
> Revisions applied: Removed redundant "confirm where dirty-state is exposed" step. Specified exact entry points to verify. Added explicit API usage.

- [ ] In `openOrderHelper()` (src/orderHelper.js), before `renderOrderHelper(book)`, check if editor is dirty using `getEditorPanelApi().isDirty(name, uid)` with `currentEditorKey` from editor panel API.
- [ ] If dirty, show confirmation dialog using existing popup surface (Popup.show.confirm or equivalent from SillyTavern). Only proceed with `renderOrderHelper(book)` if user confirms; otherwise return early.
- [ ] Verify any Order Helper shortcuts in `listPanel.bookMenu.js` that call `openOrderHelper()` — confirm guard applies automatically since it's inside `openOrderHelper()`.
- [ ] Test: open entry, type without saving, open Order Helper → confirmation should appear. Cancel → editor preserved. Confirm → Order Helper opens.

---

## F02: Order Helper entry collection can throw if cache/DOM desyncs during updates (missing null guards)

### STEP 1. FIRST CODE REVIEW

If the list of books/entries changes while Order Helper is open (for example, due to a refresh, import, or another extension action), Order Helper may try to read entries that no longer exist and crash.

- **Location:**
  - `src/orderHelper.js` → `getOrderHelperEntries(..., includeDom = true)`
  - Anchor snippet:
    ```js
    data: cache[entryBook].entries[tr.getAttribute('data-uid')],
    ```

- **Detailed Finding:**
  - When `includeDom === true`, `getOrderHelperEntries()` builds its source list from `dom.order.entries` rows and then dereferences the cache:
    - `cache[entryBook]`
    - `.entries[...]`
    - `[data-uid]` from the `<tr>` attribute
  - There are no guards for:
    - `cache[entryBook]` being undefined (book removed / cache cleared / partial reload)
    - `tr.getAttribute('data-uid')` being null/empty
    - `cache[entryBook].entries[uid]` being undefined (entry deleted or not yet loaded)
  - In those cases, the expression will throw (e.g., "Cannot read properties of undefined"), breaking the Order Helper UI.

- **Why it matters:**
  - A single transient desync between DOM and cache can crash the entire Order Helper, often during workflows where users are already doing bulk edits.
  - This kind of crash can also interrupt saves mid-flow, increasing confusion about what actually got applied.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔
  - The failure depends on runtime timing (updates while Order Helper is open), but the code path is clearly unguarded.

- **Reproducing the issue:**
  1. Open Order Helper.
  2. While it's open, trigger an action that rebuilds/refreshes world-info state (e.g., reload list / import / delete book).
  3. Interact with Order Helper (sort, filter, select rows) and observe a potential crash/console error.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make DOM→cache dereferencing resilient: skip rows whose cache data is missing, and/or rebuild from source entries when desynced.

- **Proposed fix:**
  - In the `includeDom` mapping branch, use safe lookups:
    - Validate `entryBook`, `uid`, `cache[entryBook]`, and `cache[entryBook].entries[uid]`.
    - If missing, exclude that row from the returned entries list (or fall back to `getOrderHelperSourceEntries()`).
  - Consider also cleaning up `dom.order.entries` for missing books/uids when detected.

- **Fix risk:** Low 🟢
  - Mostly defensive checks and graceful degradation.

- **Why it's safe to implement:**
  - It does not change intended behavior for valid rows; it only prevents crashes when state is inconsistent.

- **Pros:**
  - Better stability during refresh/import/delete workflows.
  - Less chance of "Order Helper randomly broke" bug reports.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ Code path `getOrderHelperEntries(includeDom=true)` verified in `orderHelper.js:84-91`
  - ✅ Missing guards verified: `cache[entryBook]` accessed without null check, `tr.getAttribute('data-uid')` result not validated
  - ✅ Potential throw confirmed: `cache[entryBook].entries[undefined]` would fail

- **Top risks:**
  - Crash during concurrent updates is real
  - Severity Medium is appropriate — crash is bad but recoverable (reload)

#### Technical Accuracy Audit

For each questionable claim:

  > *`cache[entryBook]` being undefined (book removed / cache cleared / partial reload)*

- **Why it may be wrong/speculative:**
  Could be that cache is always synchronized with DOM, but this is an assumption.

- **Validation:**
  Validated ✅ — Cache can be cleared/rebuilt independently of Order Helper DOM references. No synchronization mechanism exists between `wiUpdateHandler` cache updates and `dom.order.entries`.

---

  > *`tr.getAttribute('data-uid')` being null/empty*

- **Why it may be wrong/speculative:**
  All rows should have data-uid attribute by design.

- **Validation:**
  Validated ✅ — While rows should have `data-uid` by design, defensive coding is appropriate. If a row is partially constructed or corrupted, `getAttribute` could return `null`.

#### Fix Quality Audit

- **Direction:**
  Correct — add null guards. Stays within `orderHelper.js` module.

- **Behavioral change:**
  No observable behavior change for valid data. Invalid/stale rows are silently skipped — this is graceful degradation, not a behavior change.

- **Ambiguity:**
  Single recommendation with clear fallback options.

- **Checklist:**
  - ✅ All steps actionable
  - ⚠️ Step 2 ("Decide a fallback strategy") implies a choice mid-implementation. Should specify: prefer "skip invalid rows" as the default strategy (simpler, less disruptive).

- **Dependency integrity:**
  No cross-finding dependencies.

- **Fix risk calibration:**
  Low 🟢 is appropriate — purely defensive code.

- **"Why it's safe" validity:**
  Valid — "does not change intended behavior for valid rows" is specific and correct.

- **Mitigation:**
  Not required.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Add null guards in `getOrderHelperEntries()` (src/orderHelper.js:84-91): validate `cache[entryBook]` exists, `tr.getAttribute('data-uid')` returns non-null, and `cache[entryBook].entries[uid]` exists before including in result.
- [ ] Use "skip invalid rows" strategy — filter out entries where any guard fails rather than throwing or rebuilding.
- [ ] Verify downstream sorting/filtering handles reduced lists (they iterate over results, so already safe).
- [ ] Test: open Order Helper, trigger external book/entry deletion, interact with table — should not throw.

---

## F03: Scope comparison is order-sensitive and can cause unnecessary full rerenders

### STEP 1. FIRST CODE REVIEW

Order Helper can rerender its entire UI even when the set of books in scope is effectively the same, just in a different order.

- **Location:**
  - `src/orderHelper.js` → `isSameScope(a, b)`
  - Anchor snippet:
    ```js
    return a.every((name, index)=>name === b[index]);
    ```

- **Detailed Finding:**
  - `refreshOrderHelperScope()` uses `isSameScope(scopedBookNames, nextScope)` to decide whether to rerender.
  - `isSameScope()` treats scope arrays as equal only if they have identical ordering.
  - If the scope provider returns the same books in a different order (common if derived from UI state), Order Helper will rebuild unnecessarily:
    - extra DOM work
    - possible selection resets
    - extra perceived "jank" while using the drawer.

- **Why it matters:**
  - Avoidable full rerenders can cause UI stutters for large collections.
  - Unnecessary rerenders also increase the chance of race conditions with ongoing edits.

- **Severity:** Low ⭕

- **Confidence:** High 😀
  - The current comparison is explicitly index-based.

- **Reproducing the issue:**
  1. Open Order Helper in "visibility scope" mode.
  2. Cause the same set of books to be recomputed in a different order (e.g., toggling filters that don't change membership).
  3. Observe Order Helper rerenders when it doesn't need to.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Compare scopes as sets (or compare sorted arrays) instead of comparing by index.

- **Proposed fix:**
  - Normalize scope arrays before storing/comparing:
    - clone + sort
    - or convert to `Set` and compare membership.
  - Keep `normalizeScope()` responsible for canonicalization, so `isSameScope()` becomes straightforward.

- **Fix risk:** Low 🟢
  - The behavior (which books are included) stays the same; only avoids unnecessary rerenders.

- **Why it's safe to implement:**
  - If normalization preserves membership, visible output is unchanged except for fewer rerenders.

- **Pros:**
  - Better performance and a smoother UI under frequent scope updates.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ `isSameScope()` uses index-based comparison verified in `orderHelper.js:20`
  - ✅ `refreshOrderHelperScope()` uses `isSameScope()` for rerender decision verified in `orderHelper.js:173-176`
  - ✅ Unnecessary rerender would occur if same books arrive in different order

- **Top risks:**
  - Low severity — performance only, no data loss
  - Actual impact depends on frequency of scope recomputation with order changes

#### Technical Accuracy Audit

For each questionable claim:

  > *If the scope provider returns the same books in a different order (common if derived from UI state)*

- **Why it may be wrong/speculative:**
  "Common" is speculative without evidence of how often scope order varies.

- **Validation:**
  Needs extensive analysis ❌ — Would need to trace all scope providers (visibility filters, book selectors) to determine if order instability actually occurs in practice.

- **What needs to be done/inspected to successfully validate:**
  Trace `refreshOrderHelperScope()` callers in `listPanel.js` and `drawer.js` to see if scope array order can vary between calls with same membership.

---

  > *Unnecessary rerenders also increase the chance of race conditions with ongoing edits.*

- **Why it may be wrong/speculative:**
  Speculative — rerender doesn't inherently cause race conditions.

- **Validation:**
  Needs extensive analysis ❌ — No evidence provided that rerenders cause race conditions.

- **What needs to be done/inspected to successfully validate:**
  Analyze concurrent edit scenarios during Order Helper rerender to confirm race condition risk.

#### Fix Quality Audit

- **Direction:**
  Correct — set-based comparison is appropriate. Stays within module.

- **Behavioral change:**
  No observable behavior change — same books included, just fewer rerenders.

- **Ambiguity:**
  Two options presented (sorted array vs. Set). Should pick one: sorted array is simpler and maintains array representation.

- **Checklist:**
  - ⚠️ Step 1 ("Decide on a canonical scope representation") is a decision point, not actionable. Should specify: use sorted array (simpler, maintains type consistency).
  - ✅ Other steps are actionable.

- **Dependency integrity:**
  No cross-finding dependencies.

- **Fix risk calibration:**
  Low 🟢 is appropriate — pure optimization, no functional change.

- **"Why it's safe" validity:**
  Valid — normalization preserving membership is the key guarantee.

- **Mitigation:**
  Not required.

- **Verdict:** Implementation plan needs revision 🟡

  **Reason:** Minor checklist issue — Step 1 is a decision point rather than actionable step. Also, claims about frequency and race conditions are speculative, but core issue (order-sensitive comparison) is real and worth fixing.

#### Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Step 1 is a decision point, not actionable; race condition claim speculative.
> Revisions applied: Specified sorted array as canonical form. Removed speculative race condition justification.

- [ ] Update `normalizeScope()` (src/orderHelper.js:16) to return a sorted copy: `Array.isArray(scope) ? [...scope].sort() : null`.
- [ ] Update `isSameScope()` (src/orderHelper.js:17-22) to use sorted array comparison (already comparing by index, now normalized arrays will have consistent order).
- [ ] Verify `getOrderHelperSourceEntries()` works correctly with sorted scope (it uses `.includes()`, order-independent — already safe).
- [ ] Test: toggle visibility filters that change book order but not membership → Order Helper should NOT rerender.

---

## F04: `getOrderHelperSourceEntries()` does repeated `includes()` scans and late book filtering (avoidable overhead)

### STEP 1. FIRST CODE REVIEW

Some Order Helper computations repeatedly scan arrays and process more data than needed, which can make the UI slower for users with many books/entries.

- **Location:**
  - `src/orderHelper.js` → `getOrderHelperSourceEntries()`
  - Anchor snippet:
    ```js
    .filter(([name])=>(scopedBookNames ?? getSelectedWorldInfo()).includes(name))
    ...
    .filter((entry)=>!book || entry.book === book);
    ```

- **Detailed Finding:**
  - The function:
    1. Iterates all `Object.entries(cache)` (all books in cache).
    2. For each book, calls `.includes(name)` on an array returned by `(scopedBookNames ?? getSelectedWorldInfo())`.
       - `.includes` is O(n), so this becomes O(books × scopeSize) per call.
    3. It also builds entries for all scoped books and only *afterwards* applies the `book` filter (when a single book is requested).
  - This function is used by multiple downstream operations (filters/options/rows). If those call it frequently (e.g., on each filter change), the overhead compounds.

- **Why it matters:**
  - In large collections, this can create input lag while filtering/sorting.
  - Performance issues in bulk-edit tooling are especially noticeable because users expect "table-like" responsiveness.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔
  - The complexity is clear from the code; actual impact depends on typical dataset sizes.

- **Reproducing the issue:**
  1. Create/import many books and entries (large lorebook set).
  2. Open Order Helper and repeatedly adjust filters/sort.
  3. Observe potential latency spikes.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Use faster membership checks (Set) and do early narrowing when a single book is specified.

- **Proposed fix:**
  - Convert the scope list into a `Set` once (per render/scope update) and use `set.has(name)` instead of `.includes`.
  - If `book` is provided, short-circuit to only that book's entries instead of building/flattening everything first.

- **Fix risk:** Low 🟢
  - Purely internal performance improvement with no functional change intended.

- **Why it's safe to implement:**
  - Membership logic remains the same; only the implementation becomes more efficient.

- **Pros:**
  - Better responsiveness for large datasets.
  - Less CPU work in hot UI paths.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ `.includes()` called in filter verified in `orderHelper.js:38`
  - ✅ Late book filtering after full flatten verified in `orderHelper.js:41`
  - ✅ Function called by multiple downstream operations confirmed

- **Top risks:**
  - Severity Medium may be overstated without actual latency measurements
  - Fix is straightforward optimization

#### Technical Accuracy Audit

For each questionable claim:

  > *`.includes` is O(n), so this becomes O(books × scopeSize) per call.*

- **Why it may be wrong/speculative:**
  Technically correct, but actual impact depends on dataset sizes and call frequency.

- **Validation:**
  Validated ✅ — `.includes()` is O(n), complexity claim is mathematically correct.

---

  > *This function is used by multiple downstream operations (filters/options/rows).*

- **Why it may be wrong/speculative:**
  Need to verify actual call frequency.

- **Validation:**
  Validated ✅ — `getOrderHelperEntries()` calls `getOrderHelperSourceEntries()` and is called by filter functions, option list builders, and renderers.

---

  > *In large collections, this can create input lag while filtering/sorting.*

- **Why it may be wrong/speculative:**
  "Large collections" and "input lag" are not quantified.

- **Validation:**
  Needs extensive analysis ❌ — Would need profiling with realistic large datasets to confirm user-noticeable lag.

- **What needs to be done/inspected to successfully validate:**
  Profile with 50+ books, 500+ entries to measure actual latency impact.

#### Fix Quality Audit

- **Direction:**
  Correct — Set-based lookup and early short-circuit are standard optimizations. Stays within module.

- **Behavioral change:**
  No observable behavior change — same results, faster computation.

- **Ambiguity:**
  Two optimizations proposed (Set + early book short-circuit). Both are valid and complementary.

- **Checklist:**
  - ⚠️ Step 1 ("Introduce a canonical 'scopeSet'") is vague about where to store it. Should specify: derive lazily in `getOrderHelperSourceEntries()` or cache in module variable with scope.
  - ✅ Other steps are actionable.

- **Dependency integrity:**
  No cross-finding dependencies.

- **Fix risk calibration:**
  Low 🟢 is appropriate — pure optimization.

- **"Why it's safe" validity:**
  Valid — "Membership logic remains the same" is the key guarantee.

- **Mitigation:**
  Not required.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] In `getOrderHelperSourceEntries()` (src/orderHelper.js:35-41), derive scope Set at function start: `const scopeSet = new Set(scopedBookNames ?? getSelectedWorldInfo())`.
- [ ] Replace `.includes(name)` with `scopeSet.has(name)` in the filter.
- [ ] Add early return fast path: if `book` is provided and in scope, return that single book's entries directly without iterating all cache entries.
- [ ] Verify derived option lists (outlet/automationId/group computed via `getOrderHelperEntries()`) still return correct results.

---

## F05: Custom-order display index assignment mutates cache and triggers background saves with no error handling

### STEP 1. FIRST CODE REVIEW

When using "Custom" sort, Order Helper may silently write missing display indexes into entries and start saving books in the background. If something goes wrong, you may not know it happened, and the saved order can become inconsistent.

- **Location:**
  - `src/orderHelper.js` → `ensureCustomDisplayIndex()`
  - (Triggered by renderer when sort is `SORT.CUSTOM`; see `src/orderHelperRender.js`)
  - Anchor snippet:
    ```js
    entry.extensions ??= {};
    entry.extensions.display_index = nextIndex;
    ...
    return [...updatedBooks];
    ```

- **Detailed Finding:**
  - `ensureCustomDisplayIndex()`:
    - reads entries out of `cache`
    - mutates entry objects in-place (`entry.extensions.display_index = ...`)
    - returns the set of books that were changed
  - The renderer then starts saving each updated book via `saveWorldInfo(bookName, buildSavePayload(bookName), true)` without awaiting, batching, or checking for failures.
  - Risks:
    - If a save fails (network/backend issue), the UI cache now has display indexes that aren't persisted, leading to confusing "it worked until reload" behavior.
    - If `buildSavePayload(bookName)` is a full-book snapshot (not just metadata), these background saves can overwrite concurrent edits if the payload is built from a stale snapshot.

- **Why it matters:**
  - Custom ordering is an "advanced tool" feature; users will rely on it for bulk reordering.
  - Silent partial failure can cause lost work and hard-to-debug order "resets".

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔
  - The mutation + fire-and-forget save is clear; the overwrite risk depends on how `buildSavePayload` is constructed and on concurrent edits.

- **Reproducing the issue:**
  1. Open Order Helper, choose Custom sort.
  2. Simulate a save failure (offline / server error).
  3. Reload and check whether custom order persisted or partially reverted.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make custom-index assignment and persistence more robust and observable.

- **Proposed fix:**
  - Treat "assign missing display_index" as a real write operation:
    - await saves (or queue them through the existing update/wait primitives)
    - add minimal error handling/notification if a save fails
  - Consider ensuring the save payload is narrowly scoped to the minimal needed change (only `extensions.display_index`), if the architecture supports it.

- **Fix risk:** Medium 🟡
  - Awaiting saves may change perceived responsiveness when entering Custom sort.
  - If implemented incorrectly, it could introduce new waits or deadlocks with other world-info update coordination.

- **Why it's safe to implement:**
  - The intended behavior ("ensure custom sort works") remains the same; this makes persistence more reliable.

- **Pros:**
  - More reliable custom ordering across reloads.
  - Reduced risk of silent data divergence between UI cache and persisted lorebooks.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ `ensureCustomDisplayIndex()` mutates cache entries verified in `orderHelper.js:55-57`
  - ✅ Fire-and-forget saves verified in `orderHelperRender.js:55-57`: `void saveWorldInfo(bookName, buildSavePayload(bookName), true)`
  - ✅ No error handling on save confirmed

- **Top risks:**
  - Silent persistence failure is real
  - `buildSavePayload` behavior unknown without tracing

#### Technical Accuracy Audit

For each questionable claim:

  > *If `buildSavePayload(bookName)` is a full-book snapshot (not just metadata), these background saves can overwrite concurrent edits if the payload is built from a stale snapshot.*

- **Why it may be wrong/speculative:**
  `buildSavePayload` behavior not verified in review.

- **Validation:**
  Needs extensive analysis ❌ — Would need to trace `buildSavePayload` in `wiUpdateHandler.js` to confirm payload scope.

- **What needs to be done/inspected to successfully validate:**
  Read `buildSavePayload()` implementation in `src/wiUpdateHandler.js` to determine if it's full-book or partial.

---

  > *If a save fails (network/backend issue), the UI cache now has display indexes that aren't persisted*

- **Why it may be wrong/speculative:**
  Assumption about cache state after failed save.

- **Validation:**
  Validated ✅ — `saveWorldInfo` failure would leave the mutated cache entry with `display_index` set but not persisted. Cache mutation happens before save is initiated.

#### Fix Quality Audit

- **Direction:**
  Correct — await saves and add error handling. Stays within module boundaries.

- **Behavioral change:**
  Yes — entering Custom sort may become slightly slower if saves are awaited. Should be documented. Error toasts are a new user-visible behavior.

- **Ambiguity:**
  Single recommendation with clear approach.

- **Checklist:**
  - ⚠️ Step 1 ("Trace `buildSavePayload`") is a prerequisite investigation, not an implementation step. Should be completed before implementation to confirm overwrite risk.
  - ⚠️ Step 2 ("Replace fire-and-forget saves with an awaited sequence or a controlled queue") presents two options. Should specify: use awaited sequence for simplicity (queue adds complexity).
  - ✅ Other steps are actionable.

- **Dependency integrity:**
  No cross-finding dependencies.

- **Fix risk calibration:**
  Medium 🟡 is appropriate — involves async flow changes and error handling.

- **"Why it's safe" validity:**
  Valid — "intended behavior remains the same; this makes persistence more reliable" is correct.

- **Mitigation:**
  Not required — fix is already low-risk.

- **Verdict:** Implementation plan needs revision 🟡

  **Reason:** Step 1 is an investigation prerequisite, not an implementation step. Step 2 presents options. Also need to verify `buildSavePayload` behavior to assess overwrite risk.

#### Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Step 1 is investigation, not implementation; Step 2 presents options.
> Revisions applied: Added prerequisite investigation step. Specified awaited sequence over queue. Added explicit `buildSavePayload` verification.

- [ ] **Prerequisite:** Read `buildSavePayload()` in `src/wiUpdateHandler.js` to confirm payload scope (full-book vs. partial). If full-book, concurrent edit overwrite risk is real; if partial/metadata-only, risk is lower.
- [ ] In `renderOrderHelper()` (src/orderHelperRender.js:52-58), replace `void saveWorldInfo(...)` fire-and-forget with `await saveWorldInfo(...)` in a `for...of` loop (sequential awaits).
- [ ] Wrap the save loop in try/catch. On failure, log error and show user-visible toast (using `toastr.error` or equivalent) indicating which book failed to save.
- [ ] Test: switch to Custom sort with multiple books needing index assignment → all should save; simulate failure → toast should appear.

---

### Coverage Note

- **Obvious missed findings:** None identified. The review covers data integrity (F01, F05), crash prevention (F02), and performance (F03, F04) concerns comprehensively for `orderHelper.js`.
- **Severity calibration:** F01 (High) is appropriate for potential data loss. F02 (Medium) is appropriate for crash risk. F03 (Low) is appropriate for performance-only issue. F04 (Medium) may be slightly overstated without profiling evidence but is reasonable. F05 (Medium) is appropriate for persistence reliability.