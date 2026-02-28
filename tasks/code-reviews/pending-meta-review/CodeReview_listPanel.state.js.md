# CODE REVIEW FINDINGS: `src/listPanel.state.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/listPanel.state.js`
- **Helper files consulted:** `src/lorebookFolders.js` (import only)
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** "List panel state container (UI/session state + lifecycle hydration/reset helpers)"

---

## F01: Potential data loss in folder collapse state persistence

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When saving folder collapse states, if localStorage is full or unavailable, the code silently fails with only a console warning. The user might not realize their folder collapse preferences aren't being saved.

- **Category:** Data Integrity

- **Location:**
  `src/listPanel.state.js`, function `saveFolderCollapseStates()` (lines 172-179)

- **Detailed Finding:**
  The `saveFolderCollapseStates()` function catches errors when writing to localStorage and only logs a warning. While this prevents crashes, it provides no feedback to the user that their UI state won't persist. The function returns undefined in both success and error cases, so callers can't detect failures either. This is particularly problematic because localStorage has a quota limit (typically 5-10MB shared across the origin) which could be exceeded by other SillyTavern extensions or data.

- **Why it matters:**
  Users may spend time organizing their folder collapse states, close and reopen the drawer, and find their organization lost. This creates frustration and reduces trust in the extension's reliability. The silent failure means users won't know why their preferences aren't sticking.

- **Severity:** Low ⭕
  Impact is limited to UI preference loss, not WI data loss.

- **Confidence:** High 😀
  The code path is clear and localStorage quota errors are a well-known browser behavior.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Consider surfacing the error to the user via a toast notification, or at minimum expose the success/failure status so callers can handle it appropriately.

- **Proposed fix:**
  Return a boolean success indicator from `saveFolderCollapseStates()` and check it in callers to show a toast if persistence fails.

- **Implementation Checklist:**
  - [ ] Modify `saveFolderCollapseStates()` to return `true` on success, `false` on failure
  - [ ] Modify `setFolderCollapsedAndPersist()` to check the return value
  - [ ] Add a toast notification in the extension's UI layer when persistence fails
  - [ ] Optionally add a retry mechanism or guidance for the user to clear browser storage

- **Fix risk:** Low 🟢
  The change is additive (returning a value) and doesn't modify existing behavior unless callers explicitly check the return value.

- **Why it's safe to implement:**
  The function currently returns undefined, so existing code that doesn't check the return value will continue to work identically.

- **Pros:**
  - Users are informed when their preferences can't be saved
  - Helps diagnose storage quota issues
  - Improves user trust and experience

---

## F02: Book collapse state capture may miss updates due to DOM timing

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The function that captures book collapse states from the DOM reads the class list at a single point in time, but if the DOM hasn't finished updating after a collapse/expand action, the captured state might be stale.

- **Category:** UI Correctness

- **Location:**
  `src/listPanel.state.js`, function `captureBookCollapseStatesFromDom()` (lines 211-216)

- **Detailed Finding:**
  The function checks `bookData?.dom?.entryList?.classList.contains('stwid--state-collapsed')` to determine if a book is collapsed. This relies on the DOM being in the correct state at the moment of capture. The function is exported and intended to be called by external code (likely before a refresh or navigation). If called immediately after toggling a collapse state but before the DOM update completes (e.g., if there's a CSS transition or async render), the captured state may be incorrect. The check `if (isCollapsed !== undefined)` is also problematic because `isCollapsed` will be `false` (not undefined) when the class is absent, but could be evaluated incorrectly if DOM traversal fails partially.

- **Why it matters:**
  Incorrect collapse state capture leads to books being in the wrong expanded/collapsed state after a drawer refresh or page reload, creating a jarring user experience.

- **Severity:** Low ⭕
  Timing issues are edge cases; most collapse toggles are synchronous.

- **Confidence:** Medium 🤔
  The issue depends on runtime timing and whether the calling code waits for DOM updates.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Ensure the DOM is fully updated before calling this function, or use the source of truth (the state that triggered the DOM change) rather than reading back from the DOM.

- **Proposed fix:**
  Document the precondition that DOM must be settled before calling this function, or refactor to track collapse state in the state object rather than inferring it from DOM classes.

- **Implementation Checklist:**
  - [ ] Review all call sites of `captureBookCollapseStatesFromDom()` to verify they wait for DOM updates
  - [ ] Add JSDoc comment documenting the precondition
  - [ ] Consider adding a `requestAnimationFrame` or `setTimeout(0)` delay if needed

- **Fix risk:** Low 🟢
  Documentation and verification changes are low risk.

- **Why it's safe to implement:**
  No functional changes unless timing issues are actually found and fixed.

- **Pros:**
  - Prevents stale state issues
  - Better documentation of assumed behavior
  - More maintainable code

---

## F03: Entry search cache lacks eviction limits

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The entry search cache can grow without bounds if the same instance of the list panel remains open while users switch between many different books, potentially consuming excessive memory.

- **Category:** Performance

- **Location:**
  `src/listPanel.state.js`, `entrySearchCache` state and related methods (lines 25, 119-137)

- **Detailed Finding:**
  The `entrySearchCache` stores search results per book per entry UID. While `pruneEntrySearchCacheStaleBooks()` exists to remove books no longer in the active list, there's no limit on:
  1. The number of entries cached per book
  2. The total number of books cached
  3. The age of cached entries

  For users with large lorebooks (hundreds or thousands of entries) who search frequently, this could lead to significant memory consumption over a long session.

- **Why it matters:**
  Memory pressure can cause browser tab slowdowns or crashes, especially on systems with limited RAM. This affects the SillyTavern host application, not just the extension.

- **Severity:** Low ⭕
  Requires extended use with large books to manifest; most users won't hit this.

- **Confidence:** Medium 🤔
  Impact depends on usage patterns and book sizes not visible in code.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add a maximum cache size limit and LRU (least-recently-used) eviction policy, or periodically clear the cache after book switches.

- **Proposed fix:**
  Add a maximum entry count (e.g., 10000 entries across all books) and track last-access timestamps for eviction.

- **Implementation Checklist:**
  - [ ] Add a constant for max cache entries (e.g., `MAX_ENTRY_CACHE_SIZE = 10000`)
  - [ ] Track last access time in cache entries
  - [ ] Implement LRU eviction when threshold is exceeded
  - [ ] Or simpler: Clear the entire cache when it exceeds a threshold

- **Fix risk:** Low 🟢
  Cache eviction is safe - at worst, a search might take slightly longer if results need to be recomputed.

- **Why it's safe to implement:**
  The cache is purely a performance optimization; losing entries only affects search speed, not correctness.

- **Pros:**
  - Prevents memory leaks during long sessions
  - Maintains performance for typical use cases
  - Self-healing (cache repopulates on next search)

---

*End of first-pass review findings*