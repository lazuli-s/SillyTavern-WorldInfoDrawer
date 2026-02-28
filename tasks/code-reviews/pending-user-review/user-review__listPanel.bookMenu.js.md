# CODE REVIEW FINDINGS: `src/listPanel.bookMenu.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/listPanel.bookMenu.js`
- **Helper files consulted:** (omit — not relevant for user review)

> The following findings were marked as **Implementation plan discarded 🔴** during the meta-review.
> They could not be implemented without your input. Please read each one and decide: proceed, modify, or drop it.

---

## F05: Duplicate book polling may miss fast updates

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When duplicating a book, the code waits for SillyTavern to create the copy by checking the book list every 250 milliseconds. However, this polling might miss the new book if SillyTavern updates the list faster than the first check, or if the update happens between checks.

- **Category:** Race Condition

- **Location:**
  `src/listPanel.bookMenu.js`, function `duplicateBook` (lines 122-148)

- **Detailed Finding:**
  The `duplicateBook` function uses a polling loop with `state.delay(250)` between checks. The logic:
  1. Gets initial list of book names
  2. Clicks the duplicate button in core UI
  3. Polls every 250ms for up to 8 seconds, waiting for a new name to appear

  The issue is that if `waitForWorldInfoUpdate` resolves quickly (e.g., within 50ms), the code still waits the full 250ms before checking. Conversely, if the update happens between the `await` and the `findNewName()` call, it could be missed. The 8-second timeout is also hard-coded with no retry or error handling.

- **Why it matters:**
  Under slow system conditions or when SillyTavern is busy, the duplicate operation might timeout and return `null` even though the book was successfully created, leading to confusing user feedback and failed follow-up operations.

- **Severity:** Low ⭕

- **Confidence:** Medium 🤔
  (Depends on runtime behavior of ST's update timing.)

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Use a more robust synchronization mechanism, such as awaiting a WORLDINFO_UPDATED event with the specific book name, or reducing the polling interval and adding proper timeout error handling.

- **Proposed fix:**
  🚩 Requires user input: Confirm whether the `waitForWorldInfoUpdate` function returns a promise that resolves when the specific book update occurs, or if it's a generic signal. If specific, await it directly instead of polling. If generic, consider using `eventSource.once(WORLDINFO_UPDATED, ...)` to detect the specific book creation.

- **Fix risk:** Medium 🟡

- **Why it's safe to implement:**
  The current fallback polling can remain as a backup. Adding event-based detection improves reliability without removing existing safeguards.

- **Pros:**
  More reliable duplicate detection, better user feedback on failure, eliminates race condition between poll intervals.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `duplicateBook` uses polling with 250ms delay (lines 122-148 in source)
  - `state.waitForWorldInfoUpdate` exists and is used as a signal
  - The proposed fix has a 🚩 "Requires user input" flag

- **Top risks:**
  Speculative claims — the proposed fix direction is uncertain ("Requires user input").

#### Technical Accuracy Audit

> *Quoted claim:* "Use a more robust synchronization mechanism, such as awaiting a WORLDINFO_UPDATED event with the specific book name"

- **Why it may be wrong/speculative:**
  The proposed fix direction is explicitly marked as requiring user input to confirm `waitForWorldInfoUpdate` behavior. The implementation checklist suggests investigating the function's return value, but this is not a confirmed path. The event-based detection approach may not work if `waitForWorldInfoUpdate` doesn't provide the necessary book-specific resolution.

- **Validation:**
  Requires user input 🚩 — need to verify if `waitForWorldInfoUpdate` can resolve with book name or if event-based detection is viable.

- **What needs to be done/inspected to validate:**
  Check `src/wiUpdateHandler.js` to confirm `waitForWorldInfoUpdate` return value and behavior. Determine if `WORLDINFO_UPDATED` event payload includes the book name needed for detection.

#### Fix Quality Audit

- **Direction:** Uncertain — the proposed fix requires investigation before implementation.
- **Behavioral change:** Unknown — depends on which approach is viable.
- **Ambiguity:** Multiple possible approaches (direct await vs event-based) — needs clarification.
- **Checklist:** Steps are investigative rather than implementable.
- **Dependency integrity:** N/A
- **Fix risk calibration:** Rated Medium but uncertainty makes actual risk unknown.
- **"Why it's safe" validity:** Cannot validate — safety depends on unconfirmed approach.

- **Verdict:** Implementation plan discarded 🔴
  Justification: The "Requires user input" flag and uncertain investigation steps mean this cannot be implemented without first resolving the open question about `waitForWorldInfoUpdate` behavior. The implementer needs to first investigate and confirm the viable approach before proceeding.

---
