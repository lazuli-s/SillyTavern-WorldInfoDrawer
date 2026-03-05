# REFACTORING: browser-tabs.filter-bar.js
*Created: March 4, 2026*

**File:** `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`
**Findings:** 13 total
**Status:** IMPLEMENTED

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 2 |
| Magic values | DRY-02 | 3 |
| Shape-based naming | NAME-01 | 5 |
| Large functions | SIZE-01 | 2 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **13** |

---

## Findings

### [1] DRY-01 — Duplicated code block

**What:** The code that builds and appends a single "visibility chip" (a small labelled badge showing the active filter) is written out three separate times inside `renderVisibilityChips`. Each copy creates a `<span>` element, adds an icon, adds a text label, sets the tooltip and accessibility label, then appends to the chip container. The only difference between the three copies is which data object they pull from.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, lines 352–361 — builds the "All Books" chip
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, lines 363–372 — builds the "All Active" chip
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, lines 376–385 — builds a chip for each custom mode inside a loop

**Steps to fix:**
1. Extract the shared chip-building logic into a new function named `appendVisibilityChip(option)` near `renderVisibilityChips`. It should accept a visibility option object (with `icon` and `label`), build the chip, and append it to `listPanelState.bookVisibilityChips`.
2. Replace the first copy (lines 352–361) with: `appendVisibilityChip(getBookVisibilityOption(BOOK_VISIBILITY_MODES.ALL_BOOKS));`
3. Replace the second copy (lines 363–372) with: `appendVisibilityChip(getBookVisibilityOption(BOOK_VISIBILITY_MODES.ALL_ACTIVE));`
4. Replace the third copy (lines 376–385) with: `appendVisibilityChip(option);` inside the existing `for` loop.

---

### [2] DRY-01 — Duplicated code block

**What:** The loop that walks every entry inside a book and marks each entry as "not filtered" is written out three times in `applySearchFilter`. Each copy is identical — it iterates `Object.values(runtime.cache[b].entries)` and calls `setQueryFiltered(..., false)` on every entry's root element.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, lines 183–185 — inside the "book name matches" branch
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, lines 199–201 — inside the "not scanning entries" branch
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, lines 205–207 — inside the "empty query" branch

**Steps to fix:**
1. Extract the shared loop into a new function named `clearAllBookEntryFilters(bookName)` near `applySearchFilter`. It should loop `Object.values(runtime.cache[bookName].entries)` and call `setQueryFiltered(runtime.cache[bookName].dom.entry[entry.uid]?.root, false)` for each entry.
2. Replace the first copy (lines 183–185) with: `clearAllBookEntryFilters(b);`
3. Replace the second copy (lines 199–201) with: `clearAllBookEntryFilters(b);`
4. Replace the third copy (lines 205–207) with: `clearAllBookEntryFilters(b);`

---

### [3] DRY-02 — Magic value

**What:** The CSS class name `'stwid--state-active'` appears 5 times. It represents the "open/active" visual state for dropdown menus and should be a named constant so a typo in one place cannot silently break only that spot.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 55 — embedded in the `querySelectorAll` selector
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 392 — `classList.remove`
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 503 — `classList.contains`
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 507 — `classList.add`
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 519 — `classList.contains`

**Steps to fix:**
1. At the top of the file (after the existing `const` declarations), add: `const CSS_STATE_ACTIVE = 'stwid--state-active';`
2. Replace each standalone occurrence of `'stwid--state-active'` with `CSS_STATE_ACTIVE`.
3. Update the selector at line 55 to use a template literal: `` `.stwid--multiselectDropdownMenu.${CSS_STATE_ACTIVE}` ``

---

### [4] DRY-02 — Magic value

**What:** The CSS class name `'stwid--multiselectDropdownButton'` appears 3 times. It identifies the trigger button for a dropdown and should be a named constant to avoid the class name drifting out of sync between the element that gets the class and the queries that look for it.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 63 — embedded in a `querySelector` call
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 393 — embedded in a `querySelector` call
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 448 — passed to `classList.add`

**Steps to fix:**
1. At the top of the file (after the existing `const` declarations), add: `const CSS_MULTISELECT_DROPDOWN_BUTTON = 'stwid--multiselectDropdownButton';`
2. Replace each occurrence of the raw string with `CSS_MULTISELECT_DROPDOWN_BUTTON`. For the selector strings at lines 63 and 393, use a template literal: `` `.${CSS_MULTISELECT_DROPDOWN_BUTTON}` ``

---

### [5] DRY-02 — Magic value

**What:** The CSS class name `'stwid--visibilityChip'` appears 3 times, once for each of the three chip-building blocks in `renderVisibilityChips`. Extracting it as a constant would make it easier to rename later and removes a source of copy-paste error.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 354
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 365
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 378

**Steps to fix:**
1. At the top of the file (after the existing `const` declarations), add: `const CSS_VISIBILITY_CHIP = 'stwid--visibilityChip';`
2. Replace each occurrence of `'stwid--visibilityChip'` with `CSS_VISIBILITY_CHIP`. (Note: if finding [1] is implemented first, only the new `appendVisibilityChip` function will need the constant.)

---

### [6] NAME-01 — Shape-based name

**What:** `inp` (line 223) describes the element as "an input" — its HTML type — rather than what it is for. Reading the name alone tells you nothing about what this input controls.

**Where:** `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 223

**Steps to fix:**
1. Rename `inp` to `searchEntriesCheckbox` everywhere it appears in this file (lines 223, 224, 225, 229). `inp` is a local variable, so no cross-file search is needed.

---

### [7] NAME-01 — Shape-based name

**What:** `b` (the loop variable at lines 176 and 402) is a single-letter abbreviation that conveys no meaning. Reading the loop body is required to learn that `b` is a book name string.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 176 (loop variable in `applySearchFilter`)
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 402 (loop variable in `applyActiveFilter`)

**Steps to fix:**
1. In `applySearchFilter` (lines 176–208), rename `b` to `bookName` everywhere within that block.
2. In `applyActiveFilter` (lines 402–405), rename `b` to `bookName` everywhere within that block.
3. These are local loop variables; no cross-file search is needed.

---

### [8] NAME-01 — Shape-based name

**What:** `e` (the loop variable at lines 183, 189, 199, and 205) is a single-letter abbreviation. It is only knowable as "an entry" by reading the loop body.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 183
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 189
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 199
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 205

**Steps to fix:**
1. In each of the four loops (lines 183–185, 189–193, 199–201, 205–207), rename `e` to `entry` everywhere within that block.
2. These are local loop variables; no cross-file search is needed. (Note: if finding [2] is implemented first, some of these loops will be replaced by a helper call, reducing the number of occurrences to fix.)

---

### [9] NAME-01 — Shape-based name

**What:** `list` (line 115, the parameter of `setupFilter`) describes the value as "a list" — its visual role — rather than what it specifically is. A caller reading `setupFilter(list)` cannot tell what DOM element is expected.

**Where:** `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 115

**Steps to fix:**
1. Rename the parameter `list` to `bookListContainer` in `setupFilter`'s signature (line 115).
2. Replace the one usage of `list` inside the function (line 529: `list.append(filter);`) with `bookListContainer`.
3. Search for all call sites of `setupFilter(...)` across the project and confirm the rename is consistent (the parameter rename is local, but the call sites pass this value and may have their own naming to check).

---

### [10] NAME-01 — Shape-based name

**What:** `menuWrap` (line 442) uses "wrap" — a structural shape word — rather than describing what the wrapper is for. "Wrap" tells you it's a container but not what it contains or why it exists.

**Where:** `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, line 442

**Steps to fix:**
1. Rename `menuWrap` to `visibilityDropdownContainer` everywhere it appears in the surrounding block (lines 442–515).
2. This is a local variable; no cross-file search is needed.

---

### [11] SIZE-01 — Large function

**What:** `setupFilter` is 416 lines long (lines 115–531). It is doing far too much: it builds the search input, the "search entries" checkbox, the entire icon tab bar with six tabs, the visibility dropdown with all its option buttons, the document-click close handler, and calls three external mount functions. These are separate concerns bundled together.

**Where:** `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, lines 115–531

**Steps to fix:**
1. Extract the search input and "search entries" checkbox construction (lines 158–233) into a new function named `buildSearchRow(searchRow, listPanelState, runtime, updateFolderActiveToggles)`. It should return the wired-up `search` element and `searchEntriesCheckbox`.
2. Extract the icon tab bar construction (lines 234–307) into a new function named `buildIconTabBar(runtime)`. It should build the tab buttons and tab content panels, mount the external content, and return the `iconTab` element.
3. Extract the visibility dropdown construction (lines 430–526) into a new function named `buildVisibilityDropdownSection(listPanelState, runtime, applyActiveFilter)`. It should return the assembled `visibilityContainer` element and the `docClickHandler` to register.
4. In `setupFilter`, replace the extracted blocks with calls to these three new functions, assembling the results into the filter bar.

---

### [12] SIZE-01 — Large function

**What:** `createFilterBarSlice` is 479 lines long (lines 68–547). Because `setupFilter` (finding [11]) is defined entirely inside it, the outer factory function absorbs all of that complexity in addition to its own logic. Even after `setupFilter` is broken up, the outer function will remain the single place where all the sub-modules are wired together, which may still benefit from further extraction.

**Where:** `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, lines 68–547

**Steps to fix:**
1. First apply finding [11] to break up `setupFilter`.
2. After that refactor, reassess whether any remaining top-level helper functions inside `createFilterBarSlice` (e.g. `getBookVisibilityFlags`, `getBookVisibilityScope`, `applyActiveFilter`, `renderVisibilityChips`) should be extracted into standalone module-level functions to reduce the body of `createFilterBarSlice` further.

---

### [13] NEST-01 — Deep nesting

**What:** Inside `applySearchFilter`, the block starting at line 176 reaches 5 levels of indentation. The reader must hold five conditions in mind at once to understand the innermost line: "we are iterating books, the query is non-empty, we are scanning entries, the book name matched, and now we're looping entries." That is too many nested contexts for a single block.

**Where:** `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`, lines 176–208 (deepest point: line 183)

**Nesting structure:**
```
for (const b of Object.keys(runtime.cache)) {     ← level 1
    if (query.length) {                            ← level 2
        if (shouldScanEntries) {                   ← level 3
            if (bookMatch) {                       ← level 4
                for (const e of ...) {             ← level 5  ← FLAG
```

**Steps to fix:**
1. Extract the body of the `if (shouldScanEntries)` block (lines 179–202) into a new function named `applyEntrySearchToBook(bookName, query, bookMatch)`. It should run the per-entry logic and call `setQueryFiltered` internally.
2. Replace the extracted block with a call to `applyEntrySearchToBook(b, query, bookMatch)`.
3. This reduces the maximum nesting inside `applySearchFilter` to 3 levels (for → if query → if shouldScanEntries call / else). (Note: if finding [2] is implemented first, the innermost "clear all entries" loops will already be extracted, which also helps flatten the nesting.)

---

## After Implementation
*Implemented: March 5, 2026*

### What changed

- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`
  - Added named CSS constants for repeated class names (`stwid--state-active`, `stwid--multiselectDropdownButton`, `stwid--visibilityChip`) and replaced raw string usage.
  - Extracted `buildSearchRow`, `buildIconTabBar`, and `buildVisibilityDropdownSection` out of `setupFilter` to reduce function size and separate concerns.
  - Refactored search filtering with `clearAllBookEntryFilters` and `applyEntrySearchToBook`, reducing repeated loops and deep nesting.
  - Extracted chip rendering into `appendVisibilityChip` to remove duplicated chip DOM construction.
  - Renamed unclear local names (`list` -> `bookListContainer`, `b` -> `bookName`, `inp` -> `searchEntriesCheckbox`, `menuWrap` -> `visibilityDropdownContainer`).
  - Reassessed further extraction for `createFilterBarSlice` and kept remaining helpers inside the factory because they depend on closure state (`listPanelState`, `runtime`, and callbacks) and are part of that slice's wiring ownership.

### Risks / What might break

- This touches the filter bar assembly flow, so tab content mounting could fail if any helper call order changes unexpectedly.
- This touches dropdown open/close behavior, so the visibility menu could stop closing correctly on outside click if event wiring regresses.
- This changes search-filter control flow, so entry visibility during short queries could behave differently if a branch was missed.

### Manual checks

- Open the drawer and confirm all six filter tabs still appear, switch correctly, and show their expected content.
- Open the Visibility dropdown, toggle options, click outside, and confirm the menu opens/closes correctly and the active chip labels update.
- Search for a book name only and confirm matching books stay visible while others hide.
- Enable `Entries` search, type at least 2 characters from an entry key/comment, and confirm matching entries stay visible and non-matching entries hide.
- Clear the search input and confirm all books/entries return to visible state.
