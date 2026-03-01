# CODE REVIEW FINDINGS: `src/listPanel.booksView.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/listPanel.booksView.js`
- **Helper files consulted:** `src/sortHelpers.js` (for `cloneMetadata` implementation)
- **Skills applied:** `st-js-best-practices`, `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** Book list rendering and insertion order; Book active toggle (global active status); Book collapse/expand behavior; Book drag/drop between folders and root; Book-level sort choice resolution; Entry creation inside a selected book

---

## F01: Race Condition in Active Toggle Handler
*Finding removed - implementation plan discarded. See [user-review__listPanel.booksView.js.md](tasks/code-reviews/pending-user-review/user-review__listPanel.booksView.js.md)*

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

- **Severity:** Medium â—

- **Confidence:** Low ðŸ˜”
  The timing window is small (typically milliseconds), and the save operation is usually fast. The actual risk depends on network conditions and user behavior that cannot be verified from code alone.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Check if the editor is dirty (has unsaved changes) before performing rollback, and prompt the user or preserve the entry in a failed-save state instead of automatically removing it.

- **Proposed fix:**
  Before executing the rollback in the catch block, check if the editor has unsaved changes using the extension's dirty tracking (if available). If dirty, show a toast notification explaining the save failed and allow the user to retry or discard. Only auto-rollback if the editor is clean.

- **Fix risk:** Medium ðŸŸ¡
  Changes the error handling behavior and requires coordination with editor panel state management.

- **Why it's safe to implement:**
  The fix only affects the error handling path and preserves existing successful behavior. The change makes the failure case more user-friendly rather than silently discarding data.

- **Pros:**
  Prevents accidental data loss; provides clearer error feedback to users.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The code uses optimistic UI: creates entry, renders, opens editor, then saves (lines 93-116 in source).
  - The catch block removes the entry from cache and DOM, and calls `runtime.resetEditor()` (lines 117-129).
  - The timing window between editor open and save completion is indeed small but non-zero.

- **Top risks:**
  Speculative claims â€” the severity may be overstated given the extremely narrow timing window.

#### Technical Accuracy Audit

> *"if the user makes edits in the editor during the brief window between step 3 and step 4 completion, those edits are lost"*

- **Why it may be wrong/speculative:**
  The timing window is typically milliseconds (the save happens immediately after the editor opens). For user edits to be lost, the user would need to start typing within milliseconds of the entry creation, AND the save would need to fail. While technically possible with extreme network latency, this is an edge case of an edge case.

- **Validation:**
  Validated âœ… â€” the code path exists and could theoretically lose edits, but the probability is extremely low.

- **What needs to be done/inspected to validate:**
  N/A â€” the code path is confirmed, only probability is debatable.

#### Fix Quality Audit

- **Direction:**
  Technically sound â€” checking dirty state before rollback is a valid pattern for optimistic UIs.

- **Behavioral change:**
  Yes â€” changes error handling from auto-rollback to user-prompted decision. This should be labeled "Behavior Change Required".

- **Ambiguity:**
  The fix assumes dirty tracking exists in `editorPanel.js`. If not available, this finding cannot be implemented as described.

- **Checklist:**
  Item 1 ("Expose editor dirty state check") is vague â€” doesn't specify how to expose it or what API to use. Item 2 assumes the dirty check is available.

- **Dependency integrity:**
  Depends on `editorPanel.js` exposing dirty state â€” not confirmed available.

- **Fix risk calibration:**
  Correctly rated Medium â€” changes error handling and requires coordination with editor state.

- **"Why it's safe" validity:**
  Valid â€” only affects error path.

- **Verdict:** Implementation plan needs revision ðŸŸ¡
  The finding identifies a real (if low-probability) issue, but the checklist is vague about the dirty state dependency. Needs explicit confirmation of dirty state API availability or an alternative approach.

#### Implementation Checklist

> Verdict: Needs revision ðŸŸ¡ â€” checklist auto-revised.
> Meta-review Reason: Checklist assumes dirty state API exists without verification; needs explicit API check or fallback approach.
> Revisions applied: Added API verification step and fallback option if dirty state unavailable.

- [ ] Verify `editorPanel.js` exposes a dirty state check API; if not, implement one or use alternative approach (compare current editor content against saved entry)
- [ ] Modify rollback logic to check dirty state before removing entry; if dirty, show confirmation dialog instead of auto-rollback
- [ ] Add user-facing error message with retry option when save fails with dirty editor
- [ ] Ensure editor content is preserved (not cleared) when showing the confirmation dialog

---

## F03: Event Listeners on Dynamic DOM Elements Not Cleaned Up
*Finding removed - implementation plan discarded. See [user-review__listPanel.booksView.js.md](tasks/code-reviews/pending-user-review/user-review__listPanel.booksView.js.md)*

---
## F04: Yield Frequency May Be Insufficient for Large Datasets
*Finding removed - implementation plan discarded. See [user-review__listPanel.booksView.js.md](tasks/code-reviews/pending-user-review/user-review__listPanel.booksView.js.md)*

---

