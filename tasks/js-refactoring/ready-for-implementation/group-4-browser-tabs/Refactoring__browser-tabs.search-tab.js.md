# REFACTORING: browser-tabs.search-tab.js
*Created: July 3, 2026*

**File:** `src/book-browser/browser-tabs/browser-tabs.search-tab.js`
**Findings:** 6 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 0 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **6** |

---

## Findings

### [1] DRY-02 - Magic value

**What:** The value `'stwid--filter-query'` appears 4 times. It represents the CSS class meaning "this row is filtered out by the search query" and should be a named constant.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.search-tab.js`, line 5
- `src/book-browser/browser-tabs/browser-tabs.search-tab.js`, line 6
- `src/book-browser/browser-tabs/browser-tabs.search-tab.js`, line 10
- `src/book-browser/browser-tabs/browser-tabs.search-tab.js`, line 11

**Steps to fix:**
- [ ] At the top of the file (or at the top of `buildSearchRow` if you want it scoped), add: `const FILTER_QUERY_CLASS = 'stwid--filter-query';`
- [ ] Replace each occurrence of the raw literal with `FILTER_QUERY_CLASS`.

---

### [2] DRY-02 - Magic value

**What:** The value `'input'` appears 2 times. It represents the DOM "input" event name used to re-run filtering and should be a named constant.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.search-tab.js`, line 93
- `src/book-browser/browser-tabs/browser-tabs.search-tab.js`, line 105

**Steps to fix:**
- [ ] At the top of the file (or at the top of `buildSearchRow`), add: `const INPUT_EVENT = 'input';`
- [ ] Replace `addEventListener('input', ...)` (line 93) with `addEventListener(INPUT_EVENT, ...)`.
- [ ] Replace `new Event('input')` (line 105) with `new Event(INPUT_EVENT)`.

---

### [3] NAME-01 - Shape-based name

**What:** `element` (line 2) describes its shape (a DOM element) rather than its purpose. Reading the name alone does not tell you what it is used for (it is the element being marked as filtered/unfiltered).

**Where:** `src/book-browser/browser-tabs/browser-tabs.search-tab.js`, line 2

**Steps to fix:**
- [ ] Rename `element` to `targetElement` (or `rowRootElement`) everywhere it appears in this function.

---

### [4] NAME-01 - Shape-based name

**What:** `keys` (line 17) describes a broad concept ("keys") rather than the specific value it holds (the entry key list turned into a single comma-separated string used for searching).

**Where:** `src/book-browser/browser-tabs/browser-tabs.search-tab.js`, line 17

**Steps to fix:**
- [ ] Rename `keys` to `entryKeysCsv` (or similar) everywhere it appears in `buildEntrySearchSignature`.

---

### [5] NAME-01 - Shape-based name

**What:** `cached` (line 25) is a vague, shape-based name ("some cached thing") rather than describing what it contains (the cached search text/signature object for a specific entry).

**Where:** `src/book-browser/browser-tabs/browser-tabs.search-tab.js`, line 25

**Steps to fix:**
- [ ] Rename `cached` to `cachedEntrySearch` (or similar) everywhere it appears in `getEntrySearchText`.

---

### [6] SIZE-01 - Large function

**What:** `buildSearchRow` is 110 lines long (lines 1-112). It is doing too much: it builds the DOM controls and also defines the search text caching logic and also applies filtering rules and event wiring.

**Where:** `src/book-browser/browser-tabs/browser-tabs.search-tab.js`, lines 1-112

**Steps to fix:**
- [ ] Extract the search-cache helpers (currently `buildEntrySearchSignature` and `getEntrySearchText`, lines 15-30) into module-level functions, so they are not re-created every time `buildSearchRow` runs.
- [ ] Extract the "apply filter to runtime cache" logic (currently `clearAllBookEntryFilters`, `applyEntrySearchToBook`, and `applySearchFilter`, lines 32-89) into a new function named `applyBookBrowserSearchFilter({ runtime, listPanelState, query, shouldScanEntries, setQueryFiltered, updateFolderActiveToggles })` (or similar). This keeps "what the filter does" separate from "how the DOM is built".
- [ ] Keep `buildSearchRow` focused on building UI elements and wiring events: create the input, create the checkbox, then call the extracted filtering function from event handlers.