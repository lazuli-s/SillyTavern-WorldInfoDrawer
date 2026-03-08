# REFACTORING: book-list.extension-integrations.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-list/book-list.extension-integrations.js`
**Findings:** 4 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 0 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 0 |
| Large functions | SIZE-01 | 2 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **4** |

---

## Findings

### [1] DRY-02 - Magic value

**What:** The value `'Configure STLO Priority & Budget'` appears 2 times. It represents the visible STLO button label used for both the hover text and the screen-reader label, and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-list.extension-integrations.js`, line 74
- `src/book-browser/book-list/book-list.extension-integrations.js`, line 75

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const STLO_CONFIGURE_LABEL = 'Configure STLO Priority & Budget';`
- [ ] Replace each occurrence of the raw literal with `STLO_CONFIGURE_LABEL`.

---

### [2] SIZE-01 - Large function

**What:** `createExtensionIntegrationsSlice` is 79 lines long (lines 5-83). It is doing too much: it creates one integration action directly and also defines the full branching logic for all optional integration menu items.

**Where:** `src/book-browser/book-list/book-list.extension-integrations.js`, lines 5-83

**Steps to fix:**
- [ ] Extract the External Editor menu-item builder (lines 29-55) into a new function named `createExternalEditorMenuItem()`. It should build and return the External Editor action item.
- [ ] Extract the STLO menu-item builder (lines 56-79) into a new function named `createStloMenuItem()`. It should build and return the STLO action item with its attributes and click behavior.
- [ ] Replace the extracted blocks in `createExtensionIntegrationsSlice` with calls to the new functions.

---

### [3] SIZE-01 - Large function

**What:** `appendIntegrationMenuItems` is 56 lines long (lines 25-80). It is doing too much: it decides which integrations are available and also contains the full creation logic for each menu item.

**Where:** `src/book-browser/book-list/book-list.extension-integrations.js`, lines 25-80

**Steps to fix:**
- [ ] Extract the availability check plus append step for Bulk Edit (lines 26-28) into a new function named `appendBulkEditMenuItem()`. It should append the Bulk Edit item only when that integration is installed.
- [ ] Extract the availability check plus append step for External Editor (lines 29-55) into a new function named `appendExternalEditorMenuItem()`. It should append the External Editor item only when that integration is installed.
- [ ] Extract the availability check plus append step for STLO (lines 56-79) into a new function named `appendStloMenuItem()`. It should append the STLO item only when that integration is installed.
- [ ] Replace the extracted blocks in `appendIntegrationMenuItems` with calls to the new functions.

---

### [4] NEST-01 - Deep nesting

**What:** Inside `appendIntegrationMenuItems`, the block starting at line 29 reaches 5 levels of indentation. The innermost logic is hard to follow because the reader must hold 5 contexts in memory at the same time.

**Where:** `src/book-browser/book-list/book-list.extension-integrations.js`, lines 29-50 (deepest point: line 45)

**Steps to fix:**
- [ ] Extract the inner External Editor click handler block (lines 34-52) into a new function named `handleExternalEditorClick(name, closeMenu)`. It should send the request, show the error message when needed, and close the menu afterward.
- [ ] Replace the inner block with a call to `handleExternalEditorClick(...)`.

---
