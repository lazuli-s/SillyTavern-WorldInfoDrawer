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
- Immplementation Checklist:
  [ ] Snapshot `selectFrom` and `selectList` at the top of `moveOrCopySelectedEntriesToBook`
  [ ] Use the snapshot values throughout the function
  [ ] If snapshot is empty, call `selectEnd()` and exit early
- Why it’s safe to implement  
  The drag/drop behavior remains identical for valid selections; it only stabilizes which entries are operated on.

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
- Immplementation Checklist:
  [ ] Add null checks after `loadWorldInfo`
  [ ] Abort and call `selectEnd()` when a book is missing
  [ ] Optionally surface a user warning/toast
- Why it’s safe to implement  
  It preserves existing behavior on success and only adds graceful failure handling.

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
  A “move” can silently become a “copy” for failed deletes, causing extra entries and confusing users who expected a clean move.
- Severity: Medium
- Fix risk: Medium
- Confidence: Medium
- Repro idea:  
  Force `deleteWorldInfoEntry` to fail for one entry (e.g., by mocking or triggering a conflicting save) and move multiple entries. Observe duplicates remain in the source book.
- Suggested direction  
  Track delete failures and either abort the destination save or inform the user that the move only partially succeeded.
- Proposed fix  
  Accumulate failed deletes and decide whether to (a) skip saving the destination, or (b) save but show a warning and keep source/destination in sync explicitly.
- Immplementation Checklist:
  [ ] Track delete failures while iterating
  [ ] Decide on a policy (abort save or warn and reconcile)
  [ ] Surface feedback if a move is only partially successful
- Why it’s safe to implement  
  The normal success path stays the same; it only adds safeguards for partial failure scenarios.