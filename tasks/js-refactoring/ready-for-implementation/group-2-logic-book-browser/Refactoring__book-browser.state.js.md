# REFACTORING: book-browser.state.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-browser.state.js`
**Findings:** 6 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 3 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 0 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **6** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** This file repeats the same "read one field from the internal state object, then write it back with `null` as the fallback" pattern for many simple properties. That makes the state wrapper longer than it needs to be and makes future changes easy to miss in one place.

**Where:**
- `src/book-browser/book-browser.state.js`, lines 38-43 - `searchInput` getter/setter pair
- `src/book-browser/book-browser.state.js`, lines 44-49 - `searchEntriesInput` getter/setter pair
- `src/book-browser/book-browser.state.js`, lines 62-67 - `bookVisibilityMenu` getter/setter pair
- `src/book-browser/book-browser.state.js`, lines 68-73 - `bookVisibilityChips` getter/setter pair
- `src/book-browser/book-browser.state.js`, lines 74-79 - `loadListDebounced` getter/setter pair
- `src/book-browser/book-browser.state.js`, lines 80-85 - `folderImportInput` getter/setter pair
- `src/book-browser/book-browser.state.js`, lines 172-177 - `selectLast` getter/setter pair
- `src/book-browser/book-browser.state.js`, lines 178-183 - `selectFrom` getter/setter pair
- `src/book-browser/book-browser.state.js`, lines 184-189 - `selectMode` getter/setter pair
- `src/book-browser/book-browser.state.js`, lines 190-195 - `selectList` getter/setter pair
- `src/book-browser/book-browser.state.js`, lines 196-201 - `selectToast` getter/setter pair
- `src/book-browser/book-browser.state.js`, lines 202-207 - `dragBookName` getter/setter pair
- `src/book-browser/book-browser.state.js`, lines 208-213 - `folderMenuActions` getter/setter pair

**Steps to fix:**
- [ ] Extract the shared pattern into a helper such as `defineNullableStateAccessors(target, propertyNames)` near the top of the file.
- [ ] Use that helper to define the repeated getter/setter pairs instead of writing each pair by hand.
- [ ] Leave only the properties with special rules, such as `bookVisibilityMode` and `bookVisibilitySelections`, as custom accessors.

---

### [2] DRY-01 - Duplicated code block

**What:** The book collapse helpers and folder collapse helpers use the same steps in the same order: normalize the name, exit early if it is invalid, then read or write a boolean value in a state map. That is one pattern written twice for two storage buckets.

**Where:**
- `src/book-browser/book-browser.state.js`, lines 92-100 - `getCollapseState` and `setCollapseState`
- `src/book-browser/book-browser.state.js`, lines 105-113 - `getFolderCollapseState` and `setFolderCollapseState`

**Steps to fix:**
- [ ] Extract the shared pattern into a helper named `readNormalizedBooleanState(stateMap, name)` for reads.
- [ ] Extract the shared pattern into a helper named `writeNormalizedBooleanState(stateMap, name, isCollapsed)` for writes.
- [ ] Replace the book collapse helpers with calls to the new helpers.
- [ ] Replace the folder collapse helpers with calls to the new helpers.

---

### [3] DRY-01 - Duplicated code block

**What:** The same "save folder collapse state, and if saving fails show the same warning message" block appears in two exported functions. Repeating user-facing warning logic makes it harder to keep the behavior identical.

**Where:**
- `src/book-browser/book-browser.state.js`, lines 278-282 - save and warn inside `setFolderCollapsedAndPersist`
- `src/book-browser/book-browser.state.js`, lines 288-292 - save and warn inside `persistFolderCollapseStates`

**Steps to fix:**
- [ ] Extract the shared pattern into a helper named `saveFolderCollapseStatesWithWarning()`.
- [ ] Replace the block in `setFolderCollapsedAndPersist` with a call to `saveFolderCollapseStatesWithWarning()`.
- [ ] Replace the block in `persistFolderCollapseStates` with a call to `saveFolderCollapseStatesWithWarning()`.

---

### [4] DRY-02 - Magic value

**What:** The value `'allBooks'` appears 2 times. It represents the default book visibility mode and should be a named constant.

**Where:**
- `src/book-browser/book-browser.state.js`, line 18
- `src/book-browser/book-browser.state.js`, line 54

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const DEFAULT_BOOK_VISIBILITY_MODE = 'allBooks';`
- [ ] Replace each occurrence of the raw literal with `DEFAULT_BOOK_VISIBILITY_MODE`.

---

### [5] DRY-02 - Magic value

**What:** The value `'Folder collapse state could not be saved. Browser storage may be full.'` appears 2 times. It represents one specific warning message and should be a named constant.

**Where:**
- `src/book-browser/book-browser.state.js`, line 281
- `src/book-browser/book-browser.state.js`, line 291

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const FOLDER_COLLAPSE_SAVE_WARNING = 'Folder collapse state could not be saved. Browser storage may be full.';`
- [ ] Replace each occurrence of the raw literal with `FOLDER_COLLAPSE_SAVE_WARNING`.

---

### [6] NAME-01 - Shape-based name

**What:** `state` (line 15) describes the variable's shape rather than its purpose. Reading the name alone does not tell you that this object is the private storage for the Book Browser state container.

**Where:** `src/book-browser/book-browser.state.js`, line 15

**Steps to fix:**
- [ ] Rename `state` to `bookBrowserStateStore` everywhere it appears in this file.

---
