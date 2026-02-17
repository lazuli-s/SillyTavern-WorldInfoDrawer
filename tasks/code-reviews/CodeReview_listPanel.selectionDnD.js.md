# CODE REVIEW FINDINGS: `src/listPanel.selectionDnD.js`

## F01: Drag-drop uses live selection list after async loads, enabling wrong-entry moves
- Location:
  `src/listPanel.selectionDnD.js` → `moveOrCopySelectedEntriesToBook`
  ```js
  const srcBook = await runtime.loadWorldInfo(listPanelState.selectFrom);
  const dstBook = await runtime.loadWorldInfo(targetBookName);

  for (const uid of listPanelState.selectList) {
  ```
- What the issue is  
  The function awaits two async loads and then iterates `listPanelState.selectList` directly. If the user changes selection, the list refreshes, or selection memory resets during those awaits, the loop will act on a different set of entries than the ones that were originally dragged.
- Why it matters  
  Drag/drop can move or copy the wrong entries (or none at all) without any visible error, which can silently corrupt book contents or appear as a lost drag operation.
- Severity: Medium
- Fix risk: Low
- Confidence: Medium
- Repro idea:  
  Start a multi-entry drag, drop onto another book, then quickly change selection (click another entry) before the drop completes. Observe moved entries not matching the original drag set.
- Suggested direction  
  Capture a snapshot of the selected entry IDs (and source book) before any awaits, and use that snapshot for the entire operation.
- Proposed fix  
  Clone `selectList`/`selectFrom` into local variables before `loadWorldInfo()` awaits, and abort if the snapshot is empty or stale.
- Why it's safe to implement  
  The drag/drop behavior remains identical for valid selections; it only stabilizes which entries are operated on.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The code does iterate `listPanelState.selectList` after await calls
  - The function does await `loadWorldInfo` twice before using the selection

- **Top risks:**
  - None identified - this is a legitimate race condition with clear evidence

#### Technical Accuracy Audit

- **Validation:** Validated ✅
  - The early check for `listPanelState.selectList?.length` happens before awaits, but the selection could change between that check and the loop execution
  - This IS a valid race condition - Medium confidence is appropriate

- **What needs to be done/inspected to successfully validate:** N/A - claim is validated

#### Fix Quality Audit

- **Direction:** Is the proposed direction technically sound? **Yes** - snapshot capture stays within the same module and follows the established pattern used elsewhere in the codebase (e.g., drawer.js delete handler).

- **Behavioral change:** **No** - the behavior is unchanged for valid selections; only stabilizes which entries are operated on.

- **Ambiguity:** **No** - single suggestion provided.

- **Checklist:** **Complete and actionable** - all three steps are specific and can be implemented without human input:
  1. Snapshot `selectFrom` and `selectList` at the top - specifies exact variables
  2. Use the snapshot values throughout the function - clear instruction
  3. If snapshot is empty, call `selectEnd()` and exit early - specific action

- **Dependency integrity:** **None** - no cross-finding dependencies declared.

- **Fix risk calibration:** **Accurate** - Low risk rating is correct; simple variable capture with no shared state changes.

- **"Why it's safe" validity:** **Specific and verifiable** - "it only stabilizes which entries are operated on" accurately describes the change.

- **Mitigation:** None required.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Snapshot `selectFrom` and `selectList` at the top of `moveOrCopySelectedEntriesToBook`
- [ ] Use the snapshot values throughout the function
- [ ] If snapshot is empty, call `selectEnd()` and exit early

## F02: Missing null guards on `loadWorldInfo` results can crash drag-drop
- Location:
  `src/listPanel.selectionDnD.js` → `moveOrCopySelectedEntriesToBook`
  ```js
  const srcBook = await runtime.loadWorldInfo(listPanelState.selectFrom);
  const dstBook = await runtime.loadWorldInfo(targetBookName);

  const srcEntry = srcBook.entries[uid];
  ```
- What the issue is  
  The code assumes both `srcBook` and `dstBook` are non-null. If the source or target book was deleted/renamed during drag, or `loadWorldInfo` fails, `srcBook.entries` throws and the entire drag flow terminates without cleanup.
- Why it matters  
  A mid-operation failure leaves selection state and drag UI in a stuck or inconsistent state, and can prevent future drag actions until a full refresh.
- Severity: Low
- Fix risk: Low
- Confidence: Medium
- Repro idea:  
  Start dragging entries, delete or rename the source book in another UI flow, then drop onto a target book. Observe the console error and the lingering drag selection UI.
- Suggested direction  
  Guard the results of `loadWorldInfo`, bail out gracefully, and clear selection/drag state if either book fails to load.
- Proposed fix  
  Check `srcBook`/`dstBook` after the awaits; if either is falsy, call `selectEnd()` and optionally toast a warning.
- Why it's safe to implement  
  It preserves existing behavior on success and only adds graceful failure handling.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The code accesses `srcBook.entries[uid]` without checking if `srcBook` is null
  - According to WI API docs, `loadWorldInfo` returns `data | null` when book doesn't exist

- **Top risks:**
  - None identified - this is a valid null-safety issue with clear evidence

#### Technical Accuracy Audit

- **Validation:** Validated ✅
  - WI API reference confirms: `loadWorldInfo` returns `data | null`
  - If book is deleted/renamed during drag, `srcBook` would be null and `.entries` would throw

- **What needs to be done/inspected to successfully validate:** N/A - claim is validated

#### Fix Quality Audit

- **Direction:** Is the proposed direction technically sound? **Yes** - null guards are a standard defensive programming practice.

- **Behavioral change:** **No** - adds graceful failure handling only; success path unchanged.

- **Ambiguity:** **No** - single suggestion provided.

- **Checklist:** **Complete and actionable** - all steps are specific:
  1. Add null checks after `loadWorldInfo` - specific location
  2. Abort and call `selectEnd()` when a book is missing - specific action
  3. Optionally surface a user warning/toast - clear optional step

- **Dependency integrity:** **None** - no cross-finding dependencies.

- **Fix risk calibration:** **Accurate** - Low risk rating is correct; simple null checks.

- **"Why it's safe" validity:** **Specific and verifiable** - "preserves existing behavior on success" is accurate.

- **Mitigation:** None required.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Add null checks after `loadWorldInfo`
- [ ] Abort and call `selectEnd()` when a book is missing
- [ ] Optionally surface a user warning/toast

## F03: Move operation can create duplicates on partial delete failures
- Location:
  `src/listPanel.selectionDnD.js` → `moveOrCopySelectedEntriesToBook`
  ```js
  const deleted = await runtime.deleteWorldInfoEntry(srcBook, uid, { silent:true });
  if (deleted) {
      runtime.deleteWIOriginalDataValue(srcBook, uid);
      hasSrcChanges = true;
  }
  ...
  if (hasDstChanges) {
      await runtime.saveWorldInfo(targetBookName, dstBook, true);
  }
  ```
- What the issue is  
  The function always saves the destination book once any copy occurs, but it does not handle partial failures when deleting from the source book. If any delete fails (or returns false), the destination is still saved, leaving duplicates across books without a warning or rollback.
- Why it matters  
  A "move" can silently become a "copy" for failed deletes, causing extra entries and confusing users who expected a clean move.
- Severity: Medium
- Fix risk: Medium
- Confidence: Medium
- Repro idea:  
  Force `deleteWorldInfoEntry` to fail for one entry (e.g., by mocking or triggering a conflicting save) and move multiple entries. Observe duplicates remain in the source book.
- Suggested direction  
  Track delete failures and either abort the destination save or inform the user that the move only partially succeeded.
- Proposed fix  
  Accumulate failed deletes and decide whether to (a) skip saving the destination, or (b) save but show a warning and keep source/destination in sync explicitly.
- Why it's safe to implement  
  The normal success path stays the same; it only adds safeguards for partial failure scenarios.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The code doesn't track delete failures
  - Destination is saved even if source deletes fail (the code saves `hasDstChanges` independently of delete success)

- **Top risks:**
  - Internal inconsistency: checklist has ambiguous step that requires decision-making

#### Technical Accuracy Audit

- **Validation:** Validated ✅
  - Code analysis confirms: `hasDstChanges` is set when ANY copy occurs, regardless of delete success
  - Delete failure tracking is indeed missing

- **What needs to be done/inspected to successfully validate:** N/A - claim is validated

#### Fix Quality Audit

- **Direction:** Is the proposed direction technically sound? **Yes** - tracking failures is the correct approach.

- **Behavioral change:** **Yes, but not labeled** - adding warning/reconciliation IS a behavioral change. The "Why it's safe" claim is accurate for success path but doesn't address the behavioral change of adding user feedback.

- **Ambiguity:** **Yes - multiple options provided** - Step 1 proposes two alternatives: (a) skip saving destination, or (b) save but show a warning. Per meta-review rules, there must be ONLY one least-behavioral-change option.

- **Checklist:** **Incomplete** - "Decide on a policy (abort save or warn and reconcile)" requires a decision that should be made in the review, not left to implementation. The fix should pick ONE approach.

- **Dependency integrity:** **None** - no cross-finding dependencies.

- **Fix risk calibration:** **Accurate** - Medium risk is appropriate since it modifies the save flow.

- **"Why it's safe" validity:** **Partially valid** - "normal success path stays same" is accurate, but doesn't address the behavioral change of adding warnings.

- **Mitigation:** Need to pick single approach: **Skip saving destination on any delete failure** (simplest, least behavioral change - if any delete fails, don't create partial move).

- **Verdict:** Implementation plan needs revision 🟡

#### Detailed Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Ambiguous policy step - the checklist must pick a single approach, not leave it as "decide on a policy".
> Revisions applied: Picked the simpler approach (skip destination save on delete failure) as the sole recommendation. Also added explicit tracking of delete results per-entry.

- [ ] Track delete failures while iterating (add a `deleteFailed` flag set when `deleted === false`)
- [ ] If any delete fails, skip saving the destination book entirely (do not set `hasDstChanges = true` or do not save if `deleteFailed` is true)
- [ ] If move failed, call `selectEnd()` and optionally surface a warning toast indicating the move was aborted due to delete failure
- [ ] Ensure source book is not saved if deletes failed (don't set `hasSrcChanges = true` when delete failed)

---

### Coverage Note

- **Obvious missed findings:** None identified - all three findings are legitimate issues covering the main risk areas in the drag/drop flow (race conditions, null safety, data integrity).
- **Severity calibration:** Findings are appropriately rated - F01/F03 are Medium (real impact on user data), F02 is Low (edge case crash).
