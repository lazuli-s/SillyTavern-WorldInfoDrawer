# CODE REVIEW FINDINGS: `src/orderHelper.js`

## F01: Opening Order Helper can clear the entry editor and lose unsaved typing (no “dirty” guard)

### STEP 1. FIRST CODE REVIEW

When you open the Order Helper, the entry editor on the right can get cleared immediately. If you were in the middle of typing something into an entry and it wasn’t saved yet, that work may disappear without any warning.

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
  - There is no check here for “is the editor dirty / unsaved?” and no confirmation prompt. So the user can lose in-progress changes if they open Order Helper while typing in an entry editor that hasn’t yet been persisted back to the underlying world-info model.
  - This is a data-integrity risk because the extension explicitly supports “dirty tracking to prevent refresh discarding typed input” in the normal update flow, but Order Helper bypasses that protective behavior by force-resetting the editor at open time.

- **Why it matters:**
  - Users can lose typed content without realizing it, which is one of the highest-impact UX failures for an editor.
  - It can reduce trust in the extension (“it ate my edits”).

- **Severity:** High ❗❗

- **Confidence:** High 😀
  - The call chain is direct (`openOrderHelper()` → `renderOrderHelper()` → `resetEditorState()`), and `resetEditorState()` clears the editor.

- **Reproducing the issue:**
  1. Open any entry in the editor and start typing in a text field.
  2. Without doing anything that clearly “saves”, open the Order Helper.
  3. Observe the entry editor is cleared and your typing may be gone.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add a safety gate before opening Order Helper when the entry editor has unsaved changes.

- **Proposed fix:**
  - In `openOrderHelper()` (or immediately before `renderOrderHelper(book)`), consult the editor panel API for dirty state (or the currently edited entry key) and block opening unless the user confirms discarding changes.
  - If you can’t reliably detect dirty state globally, consider a conservative approach: treat “an entry is open” as potentially dirty and prompt, or implement an explicit “Save/Apply” step before switching modes.

- **Implementation Checklist:**
  - [ ] Confirm where dirty-state is exposed (e.g. `editorPanelApi.isDirty(name, uid)` plus current editor key from `getEditorPanelApi()`).
  - [ ] In `openOrderHelper()`, if the editor is dirty, show a confirm dialog (using the repo’s existing popup surface) and only proceed on confirm.
  - [ ] Ensure the same guard exists for any other entry-editor-clearing Order Helper entry points (e.g. menu shortcuts).
  - [ ] Add a small regression note/test plan item: “unsaved editor typing survives unless user confirms discard”.

- **Fix risk:** Medium 🟡
  - Adds a new prompt in some flows; if implemented too aggressively it may annoy users.
  - If dirty detection is incomplete, you may either miss cases (still lose edits) or over-prompt.

- **Why it’s safe to implement:**
  - The Order Helper’s behavior and capabilities remain the same; only adds a user safety confirmation when unsaved editor changes exist.

- **Pros:**
  - Prevents the most painful class of user data loss.
  - Aligns Order Helper mode-switching with the extension’s existing “don’t discard typed edits” goal.


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
  - In those cases, the expression will throw (e.g., “Cannot read properties of undefined”), breaking the Order Helper UI.

- **Why it matters:**
  - A single transient desync between DOM and cache can crash the entire Order Helper, often during workflows where users are already doing bulk edits.
  - This kind of crash can also interrupt saves mid-flow, increasing confusion about what actually got applied.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔
  - The failure depends on runtime timing (updates while Order Helper is open), but the code path is clearly unguarded.

- **Reproducing the issue:**
  1. Open Order Helper.
  2. While it’s open, trigger an action that rebuilds/refreshes world-info state (e.g., reload list / import / delete book).
  3. Interact with Order Helper (sort, filter, select rows) and observe a potential crash/console error.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make DOM→cache dereferencing resilient: skip rows whose cache data is missing, and/or rebuild from source entries when desynced.

- **Proposed fix:**
  - In the `includeDom` mapping branch, use safe lookups:
    - Validate `entryBook`, `uid`, `cache[entryBook]`, and `cache[entryBook].entries[uid]`.
    - If missing, exclude that row from the returned entries list (or fall back to `getOrderHelperSourceEntries()`).
  - Consider also cleaning up `dom.order.entries` for missing books/uids when detected.

- **Implementation Checklist:**
  - [ ] Add null guards around `cache[entryBook]` and the uid lookup in `getOrderHelperEntries(includeDom=true)`.
  - [ ] Decide a fallback strategy (skip invalid rows vs. rebuild from source).
  - [ ] Ensure downstream sorting/filtering functions can handle reduced entry lists without breaking.
  - [ ] Add a minimal test plan note: “delete an entry/book while Order Helper is open; Order Helper should not crash”.

- **Fix risk:** Low 🟢
  - Mostly defensive checks and graceful degradation.

- **Why it’s safe to implement:**
  - It does not change intended behavior for valid rows; it only prevents crashes when state is inconsistent.

- **Pros:**
  - Better stability during refresh/import/delete workflows.
  - Less chance of “Order Helper randomly broke” bug reports.


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
    - extra perceived “jank” while using the drawer.

- **Why it matters:**
  - Avoidable full rerenders can cause UI stutters for large collections.
  - Unnecessary rerenders also increase the chance of race conditions with ongoing edits.

- **Severity:** Low ⭕

- **Confidence:** High 😀
  - The current comparison is explicitly index-based.

- **Reproducing the issue:**
  1. Open Order Helper in “visibility scope” mode.
  2. Cause the same set of books to be recomputed in a different order (e.g., toggling filters that don’t change membership).
  3. Observe Order Helper rerenders when it doesn’t need to.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Compare scopes as sets (or compare sorted arrays) instead of comparing by index.

- **Proposed fix:**
  - Normalize scope arrays before storing/comparing:
    - clone + sort
    - or convert to `Set` and compare membership.
  - Keep `normalizeScope()` responsible for canonicalization, so `isSameScope()` becomes straightforward.

- **Implementation Checklist:**
  - [ ] Decide on a canonical scope representation (sorted array vs. Set).
  - [ ] Update `normalizeScope()` to return the canonical form.
  - [ ] Update `isSameScope()` accordingly.
  - [ ] Verify `getOrderHelperSourceEntries()` still behaves correctly with the normalized representation.

- **Fix risk:** Low 🟢
  - The behavior (which books are included) stays the same; only avoids unnecessary rerenders.

- **Why it’s safe to implement:**
  - If normalization preserves membership, visible output is unchanged except for fewer rerenders.

- **Pros:**
  - Better performance and a smoother UI under frequent scope updates.


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
  - Performance issues in bulk-edit tooling are especially noticeable because users expect “table-like” responsiveness.

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
  - If `book` is provided, short-circuit to only that book’s entries instead of building/flattening everything first.

- **Implementation Checklist:**
  - [ ] Introduce a canonical “scopeSet” derived from `scopedBookNames` / `getSelectedWorldInfo()`.
  - [ ] Update `getOrderHelperSourceEntries()` to use `Set.has`.
  - [ ] Add a fast path: if `book` is non-null, only consider that book’s cache data.
  - [ ] Verify derived option lists (outlet/automationId/group) still reflect the intended scope.

- **Fix risk:** Low 🟢
  - Purely internal performance improvement with no functional change intended.

- **Why it’s safe to implement:**
  - Membership logic remains the same; only the implementation becomes more efficient.

- **Pros:**
  - Better responsiveness for large datasets.
  - Less CPU work in hot UI paths.


## F05: Custom-order display index assignment mutates cache and triggers background saves with no error handling

### STEP 1. FIRST CODE REVIEW

When using “Custom” sort, Order Helper may silently write missing display indexes into entries and start saving books in the background. If something goes wrong, you may not know it happened, and the saved order can become inconsistent.

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
    - If a save fails (network/backend issue), the UI cache now has display indexes that aren’t persisted, leading to confusing “it worked until reload” behavior.
    - If `buildSavePayload(bookName)` is a full-book snapshot (not just metadata), these background saves can overwrite concurrent edits if the payload is built from a stale snapshot.

- **Why it matters:**
  - Custom ordering is an “advanced tool” feature; users will rely on it for bulk reordering.
  - Silent partial failure can cause lost work and hard-to-debug order “resets”.

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
  - Treat “assign missing display_index” as a real write operation:
    - await saves (or queue them through the existing update/wait primitives)
    - add minimal error handling/notification if a save fails
  - Consider ensuring the save payload is narrowly scoped to the minimal needed change (only `extensions.display_index`), if the architecture supports it.

- **Implementation Checklist:**
  - [ ] Trace `buildSavePayload(bookName)` to confirm whether it’s full-book and how it relates to cache state.
  - [ ] Replace fire-and-forget saves with an awaited sequence or a controlled queue.
  - [ ] Add failure handling (log + user-visible toast/popup if appropriate).
  - [ ] Add a regression note: “switching to Custom should not silently fail to persist indices”.

- **Fix risk:** Medium 🟡
  - Awaiting saves may change perceived responsiveness when entering Custom sort.
  - If implemented incorrectly, it could introduce new waits or deadlocks with other world-info update coordination.

- **Why it’s safe to implement:**
  - The intended behavior (“ensure custom sort works”) remains the same; this makes persistence more reliable.

- **Pros:**
  - More reliable custom ordering across reloads.
  - Reduced risk of silent data divergence between UI cache and persisted lorebooks.