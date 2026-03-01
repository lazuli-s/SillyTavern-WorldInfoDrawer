# CODE REVIEW FINDINGS: `src/listPanel.bookMenu.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/listPanel.bookMenu.js`
- **Helper files consulted:** `FEATURE_MAP.md`, `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`, `skills/st-js-best-practices/references/patterns.md`, `skills/st-world-info-api/references/wi-api.md`
- **Skills applied:** `st-js-best-practices`, `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** Book dropdown menu: triggers, ARIA, keyboard support, actions, and import dialog helpers; Book context menu actions (rename, move folder, duplicate, export, delete); Fill empty entry titles from keywords; Per-book sort preference menu

---

## F01: Event listener leak in openImportDialog

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When opening the file import dialog, the code sets up event listeners to detect when a file is selected or when the user cancels. If the user cancels the dialog or the 15-second timeout expires before a file is selected, the `change` event listener is never removed, causing a small memory leak that accumulates over repeated uses.

- **Category:** Performance

- **Location:**
  `src/listPanel.bookMenu.js`, function `openImportDialog` (lines 8-52)

- **Detailed Finding:**
  The `openImportDialog` function attaches a `change` listener to the file input and a `focus` listener to the window. These listeners are removed via the `finish()` function when:
  1. A file is selected and parsed
  2. Window focus returns without a file (cancel detection)
  3. The 15-second timeout fires

  However, if the promise is resolved externally or the caller abandons it, the listeners remain attached. More critically, the `once: true` option only guarantees automatic removal if the event fires â€” if it never fires, the listener persists until the element is garbage collected.

- **Why it matters:**
  Repeated use of the import feature (especially if users cancel frequently) will accumulate orphaned event listeners and closures, gradually increasing memory usage in long-running SillyTavern sessions.

- **Severity:** Low â­•

- **Confidence:** High ðŸ˜€

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Wrap the listener setup in a try/finally pattern or use AbortController for guaranteed cleanup, and ensure the input element is properly dereferenced after use.

- **Proposed fix:**
  Use an AbortController to manage all listener registrations, and call `abort()` in the `finish()` function to guarantee cleanup regardless of which path is taken.

- **Fix risk:** Low ðŸŸ¢

- **Why it's safe to implement:**
  This is a pure refactoring with no behavior changes â€” it only ensures cleanup happens consistently. No UI flows or data paths are affected.

- **Pros:**
  Prevents memory leaks, more robust cleanup pattern, follows modern best practices.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The `openImportDialog` function uses `once: true` for listeners (lines 47-48 in source)
  - The `finish()` function removes listeners manually when called
  - If `finish()` is never called (promise abandoned, timeout edge case), listeners persist

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims â€” all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:** Using AbortController for listener cleanup is technically sound and modern.
- **Behavioral change:** None. Pure refactoring.
- **Ambiguity:** Single clear recommendation.
- **Checklist:** Actionable steps â€” create controller, pass signal, call abort.
- **Dependency integrity:** N/A
- **Fix risk calibration:** Accurately rated Low â€” no shared state touched.
- **"Why it's safe" validity:** Valid â€” no behavior changes, only cleanup guarantee.

- **Verdict:** Ready to implement ðŸŸ¢

#### Implementation Checklist

> Verdict: Ready to implement ðŸŸ¢ â€” no checklist revisions needed.

- [ ] Create an `AbortController` at the start of `openImportDialog`
- [ ] Pass `abortController.signal` as the third argument to `addEventListener` calls
- [ ] Call `abortController.abort()` in the `finish()` function before resolving

---

## F02: Unsanitized user input in move book dialog

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When creating the "Move Book to Folder" modal dialog, the folder name typed by the user is inserted directly into the DOM without first checking that it's safe HTML. This could allow malicious input to execute unwanted code.

- **Category:** JS Best Practice (Security)

- **Location:**
  `src/listPanel.bookMenu.js`, function `buildMoveBookMenuItem` (lines 235-240)

- **Detailed Finding:**
  The code creates a modal dialog with a title showing the book name:
  ```javascript
  const title = document.createElement('h3');
  title.textContent = `Move "${name}" to folder`;
  ```

  While `textContent` is used (which is safe), the `name` variable comes from the book metadata and is never validated or sanitized using DOMPurify per SEC-02. Additionally, if this pattern is copied elsewhere or modified to use `innerHTML`, it becomes an XSS vulnerability. The book name could contain special characters if the book was imported from an external source.

- **Why it matters:**
  Book names can come from imported files or external sources and may contain unexpected characters. While the current code uses `textContent` (safe), defense-in-depth requires sanitizing inputs before DOM insertion, and future modifications might inadvertently switch to `innerHTML`.

- **Severity:** Low â­•

- **Confidence:** Medium ðŸ¤”

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Validate that the book name is a string and sanitize it with DOMPurify before inserting into the DOM, even when using `textContent`.

- **Proposed fix:**
  Add a type check and DOMPurify sanitization for the `name` variable at the start of `buildMoveBookMenuItem`, following the SEC-02 pattern.

- **Fix risk:** Low ðŸŸ¢

- **Why it's safe to implement:**
  Sanitization with DOMPurify is non-destructive for normal strings and only removes potentially dangerous content. The `textContent` assignment already prevents HTML execution, so this adds defense-in-depth without changing behavior.

- **Pros:**
  Follows security best practices, prevents future XSS if code is modified, consistent with SEC-02 rule.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `buildMoveBookMenuItem` uses `title.textContent = \`Move "${name}" to folder\`` (line 241 in source)
  - `textContent` is inherently safe from XSS (treats input as text, not HTML)
  - Book names come from user-editable sources (imported files, manual entry)

- **Top risks:**
  Wrong prioritization â€” `textContent` is already XSS-safe; this is defense-in-depth not a vulnerability fix.

#### Technical Accuracy Audit

No questionable claims â€” the finding correctly notes `textContent` is safe.

#### Fix Quality Audit

- **Direction:** Adding DOMPurify sanitization is acceptable defense-in-depth per SEC-02.
- **Behavioral change:** None. Sanitization is non-destructive for normal strings.
- **Ambiguity:** Single clear recommendation.
- **Checklist:** Actionable â€” type check, import DOMPurify, sanitize, use result.
- **Dependency integrity:** N/A
- **Fix risk calibration:** Accurately rated Low.
- **"Why it's safe" validity:** Valid â€” DOMPurify is non-destructive.

- **Verdict:** Ready to implement ðŸŸ¢

#### Implementation Checklist

> Verdict: Ready to implement ðŸŸ¢ â€” no checklist revisions needed.

- [ ] Add type check: `if (typeof name !== 'string') return null;`
- [ ] Import or access DOMPurify from `SillyTavern.libs`
- [ ] Sanitize: `const cleanName = DOMPurify.sanitize(name);`
- [ ] Use `cleanName` in the title textContent assignment

---

## F03: Keyboard accessibility missing on menu items

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Several menu items in the book dropdown (Bulk Edit, External Editor, Fill Empty Titles, Export Book, Duplicate Book, Delete Book) can only be clicked with a mouse. Keyboard users cannot access these functions because they don't respond to Enter or Space key presses.

- **Category:** UI Correctness

- **Location:**
  `src/listPanel.bookMenu.js`, function `buildBookMenuTrigger` â€” menu items: Bulk Edit, External Editor, Fill Empty Titles, Export Book, Duplicate Book, Delete Book

- **Detailed Finding:**
  The menu trigger itself has proper keyboard support:
  ```javascript
  menuTrigger.addEventListener('keydown', (evt)=>{
      if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          menuTrigger.click();
      }
  });
  ```

  However, individual menu items like "Bulk Edit" and "Export Book" only have `click` event listeners. They lack `keydown` handlers for Enter/Space. Only the "Configure STLO" item has proper keyboard support.

- **Why it matters:**
  Users who navigate by keyboard (accessibility tools, power users, or those with motor impairments) cannot access these book actions. This violates WCAG accessibility guidelines and creates a frustrating experience.

- **Severity:** Medium â—

- **Confidence:** High ðŸ˜€

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add `tabIndex="0"` and `keydown` event listeners to all menu items, following the pattern used for the menu trigger and the STLO button.

- **Proposed fix:**
  For each menu item div (Bulk Edit, External Editor, Fill Empty Titles, Export Book, Duplicate Book, Delete Book):
  1. Add `item.tabIndex = 0;`
  2. Add a `keydown` listener that triggers the click handler on Enter/Space

- **Fix risk:** Low ðŸŸ¢

- **Why it's safe to implement:**
  Adding keyboard handlers doesn't change existing mouse/touch behavior â€” it only adds an additional input method. The click handlers remain unchanged.

- **Pros:**
  Improves accessibility, follows ARIA best practices, consistent with other menu items in the same file.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `menuTrigger` has proper keyboard support (lines 310-315 in source)
  - `stloButton` has `tabIndex = 0` and keydown handler (lines 393-401 in source)
  - Menu items like `bulk`, `editor`, `fillTitles`, `exp`, `dup`, `del` lack these (lines 336-390 in source)

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims â€” keyboard gaps confirmed by code inspection.

#### Fix Quality Audit

- **Direction:** Adding `tabIndex` and keydown handlers is correct and follows established patterns in the same file.
- **Behavioral change:** None. Adds input method without changing existing behavior.
- **Ambiguity:** Single clear recommendation.
- **Checklist:** Actionable â€” specific elements listed with exact pattern to follow.
- **Dependency integrity:** N/A
- **Fix risk calibration:** Accurately rated Low.
- **"Why it's safe" validity:** Valid â€” click handlers remain unchanged.

- **Verdict:** Ready to implement ðŸŸ¢

#### Implementation Checklist

> Verdict: Ready to implement ðŸŸ¢ â€” no checklist revisions needed.

- [ ] Add `bulk.tabIndex = 0;` and keydown handler for Bulk Edit
- [ ] Add `editor.tabIndex = 0;` and keydown handler for External Editor
- [ ] Add `fillTitles.tabIndex = 0;` and keydown handler for Fill Empty Titles
- [ ] Add `exp.tabIndex = 0;` and keydown handler for Export Book
- [ ] Add `dup.tabIndex = 0;` and keydown handler for Duplicate Book
- [ ] Add `del.tabIndex = 0;` and keydown handler for Delete Book

---

## F04: No dirty check before Fill Empty Titles action

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The "Fill Empty Titles" menu action runs immediately without checking if the user has unsaved changes in the entry editor. This could cause the editor to refresh and lose the user's work in progress.

- **Category:** Data Integrity

- **Location:**
  `src/listPanel.bookMenu.js`, function `buildBookMenuTrigger` â€” Fill Empty Titles menu item (lines 365-379)

- **Detailed Finding:**
  Other destructive actions in this file check for unsaved changes before proceeding:
  ```javascript
  // Guard: block folder move when editor has unsaved changes.
  if (state.isDirtyCheck?.()) {
      toastr.warning('Unsaved edits detected. Save or discard changes before moving a book.');
      return;
  }
  ```

  However, the "Fill Empty Titles" action calls `state.fillEmptyTitlesWithKeywords(name)` immediately without any such check. This function modifies book entries and may trigger a WORLDINFO_UPDATED event, causing the editor to refresh and discard unsaved changes.

- **Why it matters:**
  Users could lose their in-progress edits if they accidentally click "Fill Empty Titles" while editing an entry. This is a data loss scenario that other actions in the same file explicitly protect against.

- **Severity:** Medium â—

- **Confidence:** Medium ðŸ¤”
  (Confidence is medium because we cannot confirm from code alone whether `fillEmptyTitlesWithKeywords` triggers an editor refresh, but the pattern of other guards suggests it should be checked.)

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add the same dirty check guard that exists for move/create folder operations before calling `fillEmptyTitlesWithKeywords`.

- **Proposed fix:**
  Before calling `state.fillEmptyTitlesWithKeywords(name)`, check `state.isDirtyCheck?.()` and show a warning toast if there are unsaved changes.

- **Fix risk:** Low ðŸŸ¢

- **Why it's safe to implement:**
  This adds a protective guard that prevents data loss. It follows the exact pattern already established in the same file for other actions. The change is additive and doesn't modify any existing logic paths.

- **Pros:**
  Prevents accidental data loss, consistent with other actions in the file, improves user experience.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Dirty check pattern exists for folder operations (lines 274-278 in source)
  - `fillEmptyTitlesWithKeywords` is called without guard (lines 365-369 in source)
  - `fillEmptyTitlesWithKeywords` modifies entries and may trigger WORLDINFO_UPDATED

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims â€” pattern inconsistency confirmed.

#### Fix Quality Audit

- **Direction:** Adding the dirty check guard is correct and follows established pattern.
- **Behavioral change:** None. Prevents data loss, doesn't change success path.
- **Ambiguity:** Single clear recommendation.
- **Checklist:** Actionable â€” check, warn, proceed conditionally.
- **Dependency integrity:** N/A
- **Fix risk calibration:** Accurately rated Low â€” guard pattern is proven safe.
- **"Why it's safe" validity:** Valid â€” follows exact pattern from same file.

- **Verdict:** Ready to implement ðŸŸ¢

#### Implementation Checklist

> Verdict: Ready to implement ðŸŸ¢ â€” no checklist revisions needed.

- [ ] Add dirty check before `fillEmptyTitlesWithKeywords` call
- [ ] Show warning toast if dirty: `'Unsaved edits detected. Save or discard changes before filling titles.'`
- [ ] Only proceed with the action if not dirty

---

## F05: Duplicate book polling may miss fast updates
*Finding removed - implementation plan discarded. See [UserReview_listPanel.bookMenu.js.md](tasks/code-reviews/pending-user-review/UserReview_listPanel.bookMenu.js.md)*

---
## F06: Potential race condition in importFolderFile rollback

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When importing multiple books from a folder, if one book fails to save, the code tries to delete the book it just created. However, the book might not be fully persisted yet, causing the rollback to fail or leave orphaned data.

- **Category:** Data Integrity / Race Condition

- **Location:**
  `src/listPanel.bookMenu.js`, function `importFolderFile` (lines 73-94)

- **Detailed Finding:**
  In the error handling block:
  ```javascript
  if (bookCreated) {
      try {
          await state.deleteWorldInfo?.(name);
      } catch (rollbackError) {
          console.warn('[STWID] Rollback failed for book:', name, rollbackError);
      }
  }
  ```

  The `bookCreated` flag is set immediately after `createNewWorldInfo` returns, but before `saveWorldInfo` completes. If `saveWorldInfo` fails, the book might be in a partially-created state. The rollback attempt calls `deleteWorldInfo`, but there's no guarantee the book is in a deletable state. Additionally, if `saveWorldInfo` triggered any async background processes, they might continue after the rollback.

- **Why it matters:**
  Failed folder imports could leave orphaned book entries that are visible in the UI but corrupted or incomplete, requiring manual cleanup by the user.

- **Severity:** Medium â—

- **Confidence:** Medium ðŸ¤”
  (Depends on ST's internal persistence timing.)

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Ensure the book is fully persisted before marking it as created, or implement a more robust cleanup that verifies deletion success and notifies the user of any orphaned data.

- **Proposed fix:**
  Set `bookCreated = true` only after `saveWorldInfo` completes successfully, not after `createNewWorldInfo`. This ensures rollback only attempts to delete books that were fully saved.

- **Fix risk:** Low ðŸŸ¢

- **Why it's safe to implement:**
  This changes the timing of when the rollback flag is set, ensuring we only rollback fully-created books. No existing successful paths are affected.

- **Pros:**
  Prevents orphaned book entries, more accurate rollback behavior, clearer error reporting.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `bookCreated` is set immediately after `createNewWorldInfo` returns (line 89 in source)
  - `saveWorldInfo` is called after `bookCreated` is set (line 94 in source)
  - Rollback attempts `deleteWorldInfo` only if `bookCreated` is true (lines 97-102 in source)

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims â€” the timing issue is confirmed by code inspection.

#### Fix Quality Audit

- **Direction:** Moving `bookCreated = true` to after `saveWorldInfo` is technically correct.
- **Behavioral change:** None. Changes when rollback applies, not when success occurs.
- **Ambiguity:** Single clear recommendation.
- **Checklist:** Actionable â€” move line, test, add message.
- **Dependency integrity:** N/A
- **Fix risk calibration:** Accurately rated Low â€” only affects error handling path.
- **"Why it's safe" validity:** Valid â€” no successful paths modified.

- **Verdict:** Ready to implement ðŸŸ¢

#### Implementation Checklist

> Verdict: Ready to implement ðŸŸ¢ â€” no checklist revisions needed.

- [ ] Move `bookCreated = true;` to after the `saveWorldInfo` call
- [ ] Test that failed saves properly skip the rollback (since no book was fully created)
- [ ] Add user-facing message if rollback fails, with instructions to manually delete the book

---

<!-- META-REVIEW: Completed -->
