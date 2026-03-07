# REFACTORING: browser-tabs.visibility-tab.js
*Created: July 3, 2026*

**File:** `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`
**Findings:** 9 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 2 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 2 |
| Large functions | SIZE-01 | 2 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **9** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** Two functions do the same job (check whether the current visibility mode matches a specific mode). This is duplicated logic, which makes small changes harder because you have to remember to update both places.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, line 163 - `isAllBooksVisibility`
- `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, line 164 - `isAllActiveVisibility`

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `isVisibilityMode(mode)` near the top of `createVisibilitySlice`.
- [ ] Replace `isAllBooksVisibility` (line 163) with `const isAllBooksVisibility = () => isVisibilityMode(BOOK_VISIBILITY_MODES.ALL_BOOKS);`
- [ ] Replace `isAllActiveVisibility` (line 164) with `const isAllActiveVisibility = () => isVisibilityMode(BOOK_VISIBILITY_MODES.ALL_ACTIVE);`

---

### [2] DRY-01 - Duplicated code block

**What:** Two functions do the same two-step update (set the visibility mode and clear the selections). Duplicating this kind of state update makes it easy for the two functions to drift apart later.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, lines 199-202 - `setAllBooksVisibility`
- `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, lines 204-207 - `setAllActiveVisibility`

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `setVisibilityMode(mode)` near the other visibility helpers.
- [ ] Replace `setAllBooksVisibility` (lines 199-202) with a wrapper that calls `setVisibilityMode(BOOK_VISIBILITY_MODES.ALL_BOOKS)`.
- [ ] Replace `setAllActiveVisibility` (lines 204-207) with a wrapper that calls `setVisibilityMode(BOOK_VISIBILITY_MODES.ALL_ACTIVE)`.

---

### [3] DRY-02 - Magic value

**What:** The value `stwid--multiselectDropdownOption` appears 2 times. It represents the "visibility menu option" CSS class and should be a named constant.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, line 92
- `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, line 279

**Steps to fix:**
- [ ] At the top of the file (after existing constants), add: `const CSS_MULTISELECT_DROPDOWN_OPTION = 'stwid--multiselectDropdownOption';`
- [ ] Replace the raw class string on line 92 with `CSS_MULTISELECT_DROPDOWN_OPTION`.
- [ ] Replace the selector on line 279 with `` `.${CSS_MULTISELECT_DROPDOWN_OPTION}` ``.

---

### [4] DRY-02 - Magic value

**What:** The value `stwid--multiselectDropdownOptionCheckbox` appears 2 times. It represents the "menu option checkbox icon" CSS class and should be a named constant.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, line 102
- `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, line 291

**Steps to fix:**
- [ ] At the top of the file (after existing constants), add: `const CSS_MULTISELECT_DROPDOWN_OPTION_CHECKBOX = 'stwid--multiselectDropdownOptionCheckbox';`
- [ ] Replace the raw class string on line 102 with `CSS_MULTISELECT_DROPDOWN_OPTION_CHECKBOX`.
- [ ] Replace the selector on line 291 with `` `.${CSS_MULTISELECT_DROPDOWN_OPTION_CHECKBOX}` ``.

---

### [5] NAME-01 - Shape-based name

**What:** `trigger` (line 72) describes the variable's shape (a generic "trigger") rather than its purpose. A more specific name makes it clearer that this is the button used to open the visibility menu.

**Where:** `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, line 72

**Steps to fix:**
- [ ] Rename `trigger` to `visibilityMenuButton` everywhere it appears in this file.
- [ ] Verify the rename did not miss any occurrences inside event listener callbacks (for example, lines 127-136).

---

### [6] NAME-01 - Shape-based name

**What:** `menu` (line 84) describes the variable's shape (a generic "menu") rather than its purpose. A more specific name makes it clearer that this element is the book visibility dropdown menu.

**Where:** `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, line 84

**Steps to fix:**
- [ ] Rename `menu` to `bookVisibilityMenuEl` everywhere it appears in this file.
- [ ] Verify the rename includes property assignments and helper calls (for example, lines 86, 124-125, and 130-135).

---

### [7] SIZE-01 - Large function

**What:** `buildVisibilityDropdownSection` is 95 lines long (lines 57-151). It is doing too much: it creates DOM elements for the visibility UI and also wires event handlers and also builds the per-option buttons and also creates the "close on document click" behavior.

**Where:** `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, lines 57-151

**Steps to fix:**
- [ ] Extract the "build the trigger button" logic (lines 72-83) into a new function named `createVisibilityMenuButton()` that returns the button element.
- [ ] Extract the "build the dropdown menu options" logic (lines 88-123) into a new function named `buildVisibilityMenuOptions({ menuEl, applyActiveFilter, ... })`. It should add all option buttons to `menuEl`.
- [ ] Extract the "open/close menu behavior" logic (lines 127-137 and 143-148) into a new function named `createVisibilityMenuCloseHandlers({ menuEl, closeBookVisibilityMenu, closeOpenMultiselectDropdownMenus, triggerButton })` that returns the needed callbacks.
- [ ] Replace the extracted blocks in `buildVisibilityDropdownSection` with calls to the new functions.

---

### [8] SIZE-01 - Large function

**What:** `createVisibilitySlice` is 162 lines long (lines 162-323). It is doing too much: it defines visibility state helpers and also computes which books are visible and also renders the chip UI and also applies DOM filtering and also wires the visibility section into the page.

**Where:** `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, lines 162-323

**Steps to fix:**
- [ ] Extract the "compute visibility data" helpers (`getBookVisibilityFlags`, `getBookVisibilityScope`) (lines 167-194) into a new function named `createVisibilityScopeHelpers({ listPanelState, runtime, getSelectedWorldInfo })`.
- [ ] Extract the "UI rendering for chips" logic (`renderVisibilityChips`) (lines 236-260) into a new function named `createVisibilityChipsRenderer({ listPanelState, visibilityChipClass, createBookVisibilityIcon, getBookVisibilityOption })`.
- [ ] Extract the "apply filter to DOM and sync menu UI" logic (`applyActiveFilter`) (lines 269-300) into a new function named `createApplyActiveFilter({ listPanelState, runtime, ... })`.
- [ ] Keep `setupVisibilitySection` (lines 303-317) as a thin wrapper that only builds and mounts the UI, delegating behavior to the extracted helpers.

---

### [9] NEST-01 - Deep nesting

**What:** Inside `applyActiveFilter`, the block starting at line 278 reaches 4 levels of indentation. The innermost logic is hard to follow because the reader must hold 4 contexts in mind at the same time (function, if menu exists, loop over options, then decide active state).

**Where:** `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`, lines 278-295 (deepest point: line 282)

**Steps to fix:**
- [ ] Extract the inner "sync one option button state" logic (lines 280-294) into a new function named `syncVisibilityMenuOptionState({ optionEl, isAllBooks, isAllActive, selections, setMultiselectDropdownOptionCheckboxState })`. It should compute `isActive`, set `aria-pressed`, toggle the active CSS class, and update the checkbox icon.
- [ ] Replace the contents of the loop (lines 280-294) with a call to `syncVisibilityMenuOptionState(...)`.
- [ ] Keep the `for (...)` loop, but make it only responsible for iterating and calling the extracted helper.

---

