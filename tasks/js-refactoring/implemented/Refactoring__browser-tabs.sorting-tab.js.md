# REFACTORING: browser-tabs.sorting-tab.js
*Created: July 3, 2026*

**File:** `src/book-browser/browser-tabs/browser-tabs.sorting-tab.js`
**Findings:** 5 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 2 |
| Magic values | DRY-02 | 0 |
| Shape-based naming | NAME-01 | 2 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **5** |

---

## Findings

### [1] DRY-01 -- Duplicated code block

**What:** The file builds a "thin container" label with a help icon in two places using the same step-by-step DOM creation. This duplication makes future UI tweaks easy to miss in one of the copies.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.sorting-tab.js`, lines 14-22 -- builds the "Global Sorting" label + hint icon
- `src/book-browser/browser-tabs/browser-tabs.sorting-tab.js`, lines 48-56 -- builds the "Per-book Sorting" label + hint icon

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `createThinContainerLabel(labelText, hintTitle)` near the top of the file.
- [x] Make `createThinContainerLabel(...)` return the `<span>` label element with the appended hint icon.
- [x] Replace lines 14-22 with a call to `createThinContainerLabel('Global Sorting', '...')`.
- [x] Replace lines 48-56 with a call to `createThinContainerLabel('Per-book Sorting', '...')`.

---

### [2] DRY-01 -- Duplicated code block

**What:** The file repeats the same "loop through all cached books and request a re-sort" logic in two event handlers. Keeping it duplicated means any future changes to how books are re-sorted must be made in multiple places.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.sorting-tab.js`, lines 35-38 -- re-sorts all cached books after the global sort select changes
- `src/book-browser/browser-tabs/browser-tabs.sorting-tab.js`, lines 87-90 -- re-sorts all cached books after toggling per-book sorting

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `sortAllCachedBooks()` inside `createSortingTabContent` (so it can reuse `cache` and `getListPanelApi` from the closure).
- [x] In `sortAllCachedBooks()`, keep the existing logic: get the API, then loop over `Object.keys(cache)` and call `sortEntriesIfNeeded(...)`.
- [x] Replace the copy at lines 35-38 with a call to `sortAllCachedBooks()`.
- [x] Replace the copy at lines 87-90 with a call to `sortAllCachedBooks()`.

---

### [3] NAME-01 -- Shape-based name

**What:** `sortSel` (line 27) is an abbreviated, shape-based name ("select"). Reading the name alone does not make it clear that this is the global sorting dropdown.

**Where:** `src/book-browser/browser-tabs/browser-tabs.sorting-tab.js`, line 27

**Steps to fix:**
- [x] Rename `sortSel` to `globalSortSelect` everywhere it appears in this file.
- [x] Verify the rename covers the `appendSortOptions(...)` call (line 41) and the change handler (lines 31-40).

---

### [4] NAME-01 -- Shape-based name

**What:** `name` (lines 36 and 88) is a generic name that does not say what is being named. In this context it appears to be a lorebook or book name used as a key into the cache and passed into `sortEntriesIfNeeded(...)`.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.sorting-tab.js`, line 36
- `src/book-browser/browser-tabs/browser-tabs.sorting-tab.js`, line 88

**Steps to fix:**
- [x] Rename `name` to `bookName` in the loop at lines 36-38.
- [x] Rename `name` to `bookName` in the loop at lines 88-90.
- [x] If `sortEntriesIfNeeded(...)` expects a specific kind of name (book name vs lorebook name), consider using a more specific rename like `lorebookName`.

---

### [5] SIZE-01 -- Large function

**What:** `createSortingTabContent` is 112 lines long (lines 7-118). It is doing too much: it builds the global sorting UI and also builds the per-book sorting UI and also wires multiple event handlers.

**Where:** `src/book-browser/browser-tabs/browser-tabs.sorting-tab.js`, lines 7-118

**Steps to fix:**
- [x] Extract "build global sorting section" (roughly lines 11-43) into a new function named `createGlobalSortingSection({ cache, getListPanelApi })`. This function should create the wrapper, label, select, and handlers for global sorting.
- [x] Extract "build per-book sorting section" (roughly lines 45-114) into a new function named `createPerBookSortingSection({ cache, getListPanelApi })`. This function should create the wrapper, toggle button, clear button, and handlers.
- [x] In `createSortingTabContent`, replace the extracted blocks with calls to the new functions and append their returned DOM nodes into `sortingRow`.
- [x] After extraction, re-check that `createSortingTabContent` remains mostly "glue code" (build row, append sections, return row).

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`src/book-browser/browser-tabs/browser-tabs.sorting-tab.js`
- Extracted the repeated label-and-help-icon DOM building into one shared helper.
- Split the large sorting tab builder into separate global-sorting and per-book-sorting section builders.
- Renamed vague variables so the dropdown and cache loop names describe what they control.

### Risks / What might break

- If another part of the file expected the old inline DOM creation order, the extracted helpers could change that behavior.
- The shared re-sort helper now handles both sorting actions, so a mistake there would affect both controls instead of only one.
- Future edits that add sorting controls need to use the new helper functions or the duplication could come back.

### Manual checks

- Reload the browser tab, open the Sorting tab, and confirm both section labels and help icons still appear with the same text.
- Change Global Sorting and confirm entries re-sort across visible lorebooks without errors.
- Toggle Per-book Sorting on and off and confirm the button state updates and book entries re-sort each time.
- Click Clear All Preferences and confirm the button disables during the action and becomes usable again afterward.
