# CODE REVIEW FINDINGS: `src/listPanel.coreBridge.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/listPanel.coreBridge.js`
- **Helper files consulted:** none
- **Skills applied:** st-js-best-practices, st-world-info-api
- **FEATURE_MAP stated responsibilities:** Core WI DOM delegation helpers (`waitForDom`, `setSelectedBookInCoreUi`, `clickCoreUiAction`) and selector map ownership

---

## F01: Race Condition in Value Verification Timing

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The code that checks if a book was successfully selected runs AFTER it has already told SillyTavern to change the selection. This means if the change fails, the code has already sent the signal and can't take it back, potentially leaving the interface showing the wrong book selected.

- **Category:** Race Condition

- **Location:**
  `src/listPanel.coreBridge.js`, function `setSelectedBookInCoreUi`, lines 44-52

  ```javascript
  select.value = option.value;
  select.dispatchEvent(new Event('change', { bubbles:true }));

  // Wait for the selection to be reflected in the DOM/state.
  // We can't rely on fixed delays because ST may update asynchronously.
  // As a minimal robust check, wait until the select reports the new value
  // and at least one mutation occurs in the WI area (common after change).
  if (select.value !== option.value) return false;
  ```

- **Detailed Finding:**
  The function `setSelectedBookInCoreUi` sets the select value, dispatches a `change` event, and THEN checks if `select.value === option.value`. This ordering is problematic because:

  1. The `change` event is dispatched unconditionally before verifying the value was actually accepted
  2. If SillyTavern's event handler rejects or modifies the selection (e.g., due to validation, async loading state, or race with another update), the event has already been fired
  3. The check `if (select.value !== option.value) return false;` happens too late to prevent the side effects of the dispatched event
  4. The subsequent logic proceeds based on `previousValue === option.value` check, but this doesn't account for cases where the value was changed and then rejected/rolled back by ST

  The comment acknowledges that "Some host states do not emit WORLDINFO_UPDATED for selection switches" but doesn't address the case where the selection change itself is rejected or modified by the host.

- **Why it matters:**
  This can lead to UI inconsistency where the extension believes a book is selected (because it dispatched the change event) but SillyTavern has a different book selected. Subsequent operations like rename, duplicate, or delete could then operate on the wrong book, causing data loss or user confusion.

- **Severity:** Medium ❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Restructure the function to verify the value was actually set before dispatching the change event, or add a post-dispatch verification that triggers appropriate error handling/recovery if the value doesn't match.

- **Proposed fix:**
  Move the value verification to immediately after setting `select.value` but before dispatching the `change` event. Additionally, add a post-dispatch verification with a short retry/wait loop to confirm the change was accepted by ST.

  ```javascript
  const previousValue = select.value;
  select.value = option.value;
  
  // Verify the value was actually set before dispatching event
  if (select.value !== option.value) {
      return false;
  }
  
  // If selection didn't actually change, no need to dispatch
  if (previousValue === option.value) {
      return true;
  }
  
  select.dispatchEvent(new Event('change', { bubbles:true }));
  
  // Post-dispatch: wait briefly for ST to process and verify value stuck
  await delay(50);
  if (select.value !== option.value) {
      // Value was rejected/rolled back by ST
      return false;
  }
  ```

- **Implementation Checklist:**
  - [ ] Reorder value verification to happen before dispatching change event
  - [ ] Add short delay and re-verification after dispatch to catch ST rejections
  - [ ] Ensure early return on `previousValue === option.value` happens before dispatch
  - [ ] Update function documentation to clarify return value semantics (true = selection confirmed, false = selection failed or was rejected)

- **Fix risk:** Low 🟢
  The fix only changes the timing of verification and adds a short delay. It doesn't change the external API or behavior for successful cases. The worst case is slightly slower selection changes (50ms additional delay).

- **Why it's safe to implement:**
  - The change is localized to one function
  - No external APIs are modified
  - The behavior change only affects error cases (where selection fails)
  - Successful selection flows will work the same, just with minor timing adjustment

- **Pros:**
  - Prevents UI inconsistency between extension and ST
  - Provides reliable feedback when selection fails
  - Makes the function's success/failure indication accurate

---

*No other findings.*