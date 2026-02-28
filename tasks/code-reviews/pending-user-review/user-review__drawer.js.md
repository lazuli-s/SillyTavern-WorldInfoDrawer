# CODE REVIEW FINDINGS: `src/drawer.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/drawer.js`
- **Helper files consulted:** (omit - not relevant for user review)

> The following findings were marked as **Implementation plan discarded** during the meta-review.
> They could not be implemented without your input. Please read each one and decide: proceed, modify, or drop it.

---
## F04: Selection Visibility Check Race Condition in Delete Handler

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When the user presses Delete to remove selected entries, the code first checks if the entries are visible on screen. However, this check happens at one moment, and the actual deletion happens later. If the user quickly changes filters between the check and the deletion, the wrong entries might get deleted.

- **Category:** Race Condition

- **Location:**
  `src/drawer.js`, `onDrawerKeydown` function, Delete case, lines ~105-135:
  ```javascript
  const isSelectionVisible = ()=>{
      const bookRoot = cache[selectFrom]?.dom?.root;
      if (!bookRoot) return false;
      if (bookRoot.classList.contains('stwid--filter-visibility') ||
          bookRoot.classList.contains('stwid--filter-query')) return false;
      return selectedUids.every((uid)=>{
          const entryRoot = cache[selectFrom]?.dom?.entry?.[uid]?.root;
          return entryRoot && !entryRoot.classList.contains('stwid--filter-query');
      });
  };
  if (!isSelectionVisible()) {
      const count = selectedUids.length;
      const noun = count === 1 ? 'entry is' : 'entries are';
      const confirmed = await Popup.show.confirm(...);
      if (!confirmed) return;
  }
  const srcBook = await loadWorldInfo(selectFrom);
  // ... deletion loop
  ```

- **Detailed Finding:**
  The `isSelectionVisible()` function checks DOM classes synchronously, but between this check and the actual deletion (after `await loadWorldInfo()` and potential user confirmation), the filter state could change. A user could:
  1. Have entries selected
  2. Press Delete (visibility check shows entries visible)
  3. User or another async process changes filters, hiding entries
  4. User confirms deletion (if confirmation was shown)
  5. Entries are deleted despite now being hidden

  The snapshot of `selectFrom` and `selectedUids` is good, but the visibility check result becomes stale after any `await`.

- **Why it matters:**
  Users might accidentally delete entries they didn't intend to delete if filter states change during the delete flow. This is a data integrity issue.

- **Severity:** Medium â—

- **Confidence:** Medium ðŸ¤”

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Re-check visibility immediately before performing the deletion, or move the visibility check after loading the book data.

- **Proposed fix:**
  Move the `isSelectionVisible()` call to after `loadWorldInfo()` returns and immediately before the deletion loop. If visibility changed, show a new confirmation dialog explaining that the entries are now hidden.

- **Fix risk:** Low ðŸŸ¢
  - Changes order of operations but not the overall flow
  - Adds one more check, doesn't remove existing safety

- **Why it's safe to implement:**
  The fix adds a safety check without changing the deletion logic itself. The confirmation dialog behavior remains the same.

- **Pros:**
  - Prevents accidental deletion of entries that became hidden during the async flow
  - Better user experience with accurate visibility information
  - More robust against race conditions

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  There is an async boundary after visibility evaluation (`await Popup.show.confirm(...)` and `await loadWorldInfo(selectFrom)` in `src/drawer.js` lines 148-158). Selection is snapshotted at lines 130-131 and deletion iterates that snapshot at lines 160-165.

- **Top risks:**
  Missing evidence and wrong prioritization: the finding claims wrong-entry deletion, but code snapshots the exact target set before async work.

#### Technical Accuracy Audit

  > "If the user quickly changes filters between the check and the deletion, the wrong entries might get deleted."

- **Why it may be wrong/speculative:**
  Deletion uses `selectedUids` captured at keypress (`const selectedUids = [...(selectionState.selectList ?? [])];`). Filter changes do not alter that captured UID list.

- **Validation:**
  Validated âœ… â€” "wrong entries" is not supported by the current deletion path.

- **What needs to be done/inspected to validate:**
  If this is a UX expectation issue (not a correctness issue), document intended behavior for "selection captured at keypress vs re-evaluate before commit."

  > "This is a data integrity issue."

- **Why it may be wrong/speculative:**
  The data write path is deterministic to snapshotted IDs; no alternative write target is introduced by filter changes in this function.

- **Validation:**
  Requires user input ðŸš© â€” confirm product expectation for whether visibility changes during async delete should force a second confirmation.

- **What needs to be done/inspected to validate:**
  Decide intended UX contract for delete semantics under mid-flow filter changes.

#### Fix Quality Audit

- **Direction:**
  Proposed direction is not currently justified as a bug fix; it is a behavior policy change.

- **Behavioral change:**
  Yes. It changes when/why confirmation appears, but this is not labeled as a behavior change.

- **Ambiguity:**
  Multiple alternatives are given ("re-check" or "move check"), without one minimal-change recommendation.

- **Checklist:**
  Mechanically actionable, but grounded in an unconfirmed behavior requirement.

- **Dependency integrity:**
  N/A.

- **Fix risk calibration:**
  Low is under-rated; this touches async confirmation flow and user-facing delete behavior.

- **"Why it's safe" validity:**
  Not valid as written because user-visible behavior does change.

- **Mitigation:**
  Do not implement until the delete UX contract is confirmed; if approved, document it explicitly as a behavior-change item.

- **Verdict:** Implementation plan discarded ðŸ”´
  The current evidence does not support a correctness defect, and implementation requires explicit UX/product intent.

---

## F05: Potential Stale Reference to `selectionState`

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The code gets a reference to the selection state object at startup and keeps using it forever. If the list panel is recreated or reset, this reference might point to old data that no longer matches what's on screen.

- **Category:** Data Integrity

- **Location:**
  `src/drawer.js`, lines ~260-261 and ~270-273:
  ```javascript
  selectionState = listPanelApi.getSelectionState();
  // ... later used in onDrawerKeydown:
  const selectFrom = selectionState.selectFrom;
  const selectedUids = [...(selectionState.selectList ?? [])];
  ```

- **Detailed Finding:**
  `selectionState` is obtained once during drawer initialization via `listPanelApi.getSelectionState()`. The keyboard handler `onDrawerKeydown` uses this reference to get the current selection. However, if `listPanelApi` is recreated or its internal state is reset (e.g., during a full list refresh), the `selectionState` reference could become stale or point to a detached state object.

  The code does set up `setWorldEntryContext` with getters/setters for selection properties, suggesting there was awareness of reference management, but `onDrawerKeydown` directly accesses the `selectionState` object instead of going through the context or re-querying from `listPanelApi`.

- **Why it matters:**
  If the selection state becomes stale, the Delete key could operate on entries that are no longer selected, or fail to operate on newly selected entries. This could lead to accidental deletions or confusing UX where Delete appears broken.

- **Severity:** Medium â—

- **Confidence:** Low ðŸ˜”

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Access selection state through `listPanelApi.getSelectionState()` in the keyboard handler instead of caching the reference, or verify the reference is still valid before use.

- **Proposed fix:**
  Replace direct `selectionState` access in `onDrawerKeydown` with a fresh call to `listPanelApi.getSelectionState()`. Since `listPanelApi` is available in scope, this ensures we always have the current state.

- **Fix risk:** Low ðŸŸ¢
  - Simple reference change, no logic modification
  - `listPanelApi` is already available in the closure

- **Why it's safe to implement:**
  The fix only changes how the state is accessed, not what is done with it. All existing validation logic remains unchanged.

- **Pros:**
  - Eliminates risk of stale state references
  - More robust against list panel lifecycle changes
  - Consistent with defensive programming practices

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  `selectionState` is assigned once in `src/drawer.js` line 595. `getSelectionState()` (from `src/listPanel.selectionDnD.js` lines 150-181) returns getters/setters that proxy `listPanelState`, and `listPanelState` itself is a module-level singleton (`src/listPanel.state.js` lines 14-34).

- **Top risks:**
  Speculative claim without a concrete failure path; proposed fix may add churn without changing behavior.

#### Technical Accuracy Audit

  > "the `selectionState` reference could become stale or point to a detached state object."

- **Why it may be wrong/speculative:**
  The stored object is an accessor wrapper over `listPanelState`; it reads live values on each access. No replacement of `listPanelState` object was shown.

- **Validation:**
  Validated âœ… â€” stale-reference claim is not demonstrated by current implementation.

- **What needs to be done/inspected to validate:**
  Provide a concrete reproduction path where `listPanelApi` or `listPanelState` is replaced while drawer keydown handler remains active.

  > "fresh `listPanelApi.getSelectionState()` calls ensure current state."

- **Why it may be wrong/speculative:**
  Re-calling returns another wrapper over the same backing state; it does not fix a demonstrated defect.

- **Validation:**
  Requires user input ðŸš© â€” implementation should only proceed if a reproducible stale-state scenario is provided.

- **What needs to be done/inspected to validate:**
  Capture exact reproduction steps (UI flow + expected/actual delete behavior) before coding.

#### Fix Quality Audit

- **Direction:**
  Direction is not technically justified by current evidence.

- **Behavioral change:**
  Likely none, which further indicates the proposed fix does not address a verified bug.

- **Ambiguity:**
  Recommendation includes optional cleanup without establishing necessity.

- **Checklist:**
  Checklist is specific but targets an unverified problem.

- **Dependency integrity:**
  N/A.

- **Fix risk calibration:**
  Risk may be low, but benefit is unproven.

- **"Why it's safe" validity:**
  Safety claim is not sufficient justification when defect evidence is missing.

- **Verdict:** Implementation plan discarded ðŸ”´
  The core claim is unsubstantiated in code, and no reproducible failure path has been provided.

---
