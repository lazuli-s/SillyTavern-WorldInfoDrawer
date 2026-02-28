# CODE REVIEW FINDINGS: `src/listPanel.booksView.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/listPanel.booksView.js`
- **Helper files consulted:** `src/sortHelpers.js` (for `cloneMetadata` implementation)
- **Skills applied:** `st-js-best-practices`, `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** Book list rendering and insertion order; Book active toggle (global active status); Book collapse/expand behavior; Book drag/drop between folders and root; Book-level sort choice resolution; Entry creation inside a selected book

---

## F01: Race Condition in Active Toggle Handler

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The checkbox that controls whether a book is active can be clicked multiple times in rapid succession, potentially causing the book's active state to become out of sync with what the checkbox shows.

- **Category:** Race Condition

- **Location:**
  `src/listPanel.booksView.js`, lines 58-68 (within `renderBook` function, active checkbox click handler)

- **Detailed Finding:**
  The active toggle checkbox uses `active.disabled = true` at the start of the async handler and `active.disabled = false` at the end. However, the `disabled` property doesn't prevent the click event from firing on rapid successive clicks — it only prevents user interaction. If a user clicks rapidly before the first async operation (`onWorldInfoChange`) completes, multiple handler invocations can be in-flight simultaneously. The code reads `active.checked` to determine the new state, but with overlapping executions, the checkbox state and the actual `selected_world_info` array can become inconsistent. The `runtime.onWorldInfoChange` call is async and may take time to complete, leaving a window for race conditions.

- **Why it matters:**
  The user could see the checkbox in one state while the book is actually in the opposite state. This creates confusion and could lead to books being unintentionally activated or deactivated.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔
  The race condition depends on rapid user interaction and timing, which is not confirmable from code alone.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add a guard flag or use the disabled state more defensively to prevent overlapping handler executions. Alternatively, disable the checkbox immediately on click and re-enable only after the async operation completes.

- **Proposed fix:**
  Add an `isProcessing` flag at the book level or check `active.disabled` at the very start of the handler before reading `active.checked`. Store the intended state in a local variable before any async operation.

- **Implementation Checklist:**
  - [ ] Add guard check at the start of the click handler to return early if already processing
  - [ ] Store the target checked state in a local variable before the async operation
  - [ ] Ensure the checkbox state is reverted if the async operation fails

- **Fix risk:** Low 🟢
  This is a localized change to the click handler with minimal side effects.

- **Why it's safe to implement:**
  The fix only affects the active toggle behavior and doesn't change the data flow or other book operations.

- **Pros:**
  Prevents state inconsistency; improves user experience with clear visual feedback during async operations.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F02: Optimistic UI Rollback May Discard User Edits

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When creating a new entry, the code shows the entry immediately and opens the editor before saving to the server. If the save fails, it removes the entry and closes the editor, which could accidentally delete any quick edits the user made.

- **Category:** Data Integrity

- **Location:**
  `src/listPanel.booksView.js`, lines 69-98 (within `renderBook` function, add button click handler)

- **Detailed Finding:**
  The entry creation flow uses an optimistic UI pattern: (1) create entry in cache, (2) render entry DOM, (3) click to open editor, (4) save to server. The rollback logic triggers if `saveWorldInfo` fails, removing the entry from cache and DOM and resetting the editor. However, if the user makes edits in the editor during the brief window between step 3 and step 4 completion, those edits are lost when the rollback executes. While the save operation is typically fast, network latency or server delays could create a noticeable window where user edits exist but haven't been persisted.

- **Why it matters:**
  User edits could be silently lost if the save fails after they've started typing in the editor. This violates the principle that user data should never be discarded without explicit user consent.

- **Severity:** Medium ❗

- **Confidence:** Low 😔
  The timing window is small (typically milliseconds), and the save operation is usually fast. The actual risk depends on network conditions and user behavior that cannot be verified from code alone.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Check if the editor is dirty (has unsaved changes) before performing rollback, and prompt the user or preserve the entry in a failed-save state instead of automatically removing it.

- **Proposed fix:**
  Before executing the rollback in the catch block, check if the editor has unsaved changes using the extension's dirty tracking (if available). If dirty, show a toast notification explaining the save failed and allow the user to retry or discard. Only auto-rollback if the editor is clean.

- **Implementation Checklist:**
  - [ ] Expose editor dirty state check from `editorPanel.js` if not already available
  - [ ] Modify rollback logic to check dirty state before removing entry
  - [ ] Add user-facing error message with retry option when save fails with dirty editor

- **Fix risk:** Medium 🟡
  Changes the error handling behavior and requires coordination with editor panel state management.

- **Why it's safe to implement:**
  The fix only affects the error handling path and preserves existing successful behavior. The change makes the failure case more user-friendly rather than silently discarding data.

- **Pros:**
  Prevents accidental data loss; provides clearer error feedback to users.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F03: Event Listeners on Dynamic DOM Elements Not Cleaned Up

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When book elements are created, multiple event listeners are attached to them. When books are removed (during reload or filtering), these listeners aren't explicitly removed, which could cause memory to leak over time.

- **Category:** Performance

- **Location:**
  `src/listPanel.booksView.js`, `renderBook` function — drag event listeners (lines 46-62), click handlers (lines 63-68, 93-97), and collapse toggle (lines 99-104)

- **Detailed Finding:**
  The `renderBook` function creates DOM elements and attaches multiple event listeners: `dragover`, `dragleave`, `drop` on the book root; `dragstart`, `dragend`, `click` on the title; `click` on the active checkbox; `click` on the add button; and `click` on the collapse toggle. When books are removed from the DOM (during `loadList` which calls `runtime.dom.books.innerHTML = ''`, or when folders are reset), these event listeners are not explicitly removed. While modern browsers garbage collect DOM elements and their listeners when elements are removed, the closure references to `name`, `book`, `runtime`, etc., may retain memory longer than necessary.

- **Why it matters:**
  Memory leaks can accumulate over long sessions, especially when users frequently reload the book list or switch between large lore collections. This can degrade performance and eventually cause the browser tab to become unresponsive.

- **Severity:** Low ⭕

- **Confidence:** Medium 🤔
  Modern browsers do clean up event listeners when DOM elements are removed, but the closure scope retention depends on runtime garbage collection behavior that varies by browser and usage patterns.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Store references to event handlers so they can be explicitly removed when books are destroyed, or use event delegation at the container level instead of individual element listeners.

- **Proposed fix:**
  Option A: Store handler references in the `world.dom` object and add a `destroyBook` function that removes all listeners before clearing the DOM.
  Option B: Use event delegation — attach listeners to the parent container (`runtime.dom.books`) and use `event.target` to determine which book was interacted with.

- **Implementation Checklist:**
  - [ ] Evaluate current memory usage patterns to confirm leak significance
  - [ ] Implement event delegation for book interactions OR add explicit cleanup function
  - [ ] Call cleanup function before clearing books in `loadList` and folder reset

- **Fix risk:** Low 🟢
  Event delegation is a well-established pattern with minimal risk. Explicit cleanup is also straightforward.

- **Why it's safe to implement:**
  Event delegation is the standard approach for dynamically created elements and reduces memory footprint. No behavioral changes for users.

- **Pros:**
  Reduces memory usage; improves long-session stability; simplifies event management.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F04: Yield Frequency May Be Insufficient for Large Datasets

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When loading many books, the code pauses briefly every 5 books to keep the interface responsive. For very large collections, this might not be frequent enough to prevent the interface from freezing.

- **Category:** Performance

- **Location:**
  `src/listPanel.booksView.js`, lines 130-176 (within `loadList` function)

- **Detailed Finding:**
  The `loadList` function yields to the UI thread every 5 books during initial loading (`if (i > 0 && i % 5 === 0)`) and every 2 books during folder rendering. For users with 100+ books, this means the UI could be blocked for 20+ book rendering operations between yields. Each book rendering involves DOM element creation, event listener attachment, and potentially entry sorting and rendering. While the yield pattern is correct, the frequency may not be optimal for very large datasets.

- **Why it matters:**
  Users with large lore collections may experience UI freezing or "unresponsive script" warnings during initial load, degrading the user experience.

- **Severity:** Low ⭕

- **Confidence:** Medium 🤔
  The actual impact depends on the number of books and entries per book, which varies by user. The code comment acknowledges this trade-off explicitly.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Reduce the yield threshold (yield more frequently) or make it adaptive based on measured render time. Alternatively, use `requestIdleCallback` for non-critical rendering.

- **Proposed fix:**
  Change the yield threshold from every 5 books to every 3 books during initial loading, or add a time-based check that yields if rendering takes longer than a threshold (e.g., 16ms for 60fps).

- **Implementation Checklist:**
  - [ ] Profile rendering time for typical book counts to establish baseline
  - [ ] Adjust yield thresholds based on profiling results
  - [ ] Consider implementing progressive rendering (render visible books first, then load others)

- **Fix risk:** Low 🟢
  Changing yield frequency is a tuning parameter with no functional impact.

- **Why it's safe to implement:**
  This only affects the timing of UI updates, not the final result or data consistency.

- **Pros:**
  Smoother UI experience for users with large collections; prevents "unresponsive script" warnings.

<!-- META-REVIEW: STEP 2 will be inserted here -->