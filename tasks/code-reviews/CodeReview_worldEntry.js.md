# CODE REVIEW FINDINGS: `src/worldEntry.js`

*Reviewed: February 17, 2026*

## Scope

- **File reviewed:** `src/worldEntry.js`
- **Helper files consulted:** `src/drawer.js`, `src/editorPanel.js`, `src/listPanel.state.js`, `src/listPanel.booksView.js`
- **Skills applied:** `st-js-best-practices`, `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** Entry row rendering (title/comment, keys, status/actions area), entry enable/disable toggle and strategy selector, entry click-to-open editor flow, entry move/copy/duplicate selection behavior, and entry state mapping.

---

## F01: Clicking status controls on the active row can re-open the editor and discard unsaved text

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When the entry is already open in the editor, clicking its row-level toggle controls can trigger a hidden "open editor again" action. That refresh can wipe text the user has typed but not saved yet.

- **Location:**
  `src/worldEntry.js` - `status` click handler and row click handler interaction

  Anchor:
  ```js
  status.addEventListener('click', (evt)=>{
      if (context.currentEditor?.name != name || context.currentEditor?.uid != e.uid) evt.stopPropagation();
  });
  ...
  entry.addEventListener('click', async()=>{
      await context.editorPanel.openEntryEditor(...);
  });
  ```

- **Detailed Finding:**
  The `status` container only stops click propagation when the row is *not* the active editor row. For the active row, status clicks bubble to `entry` and call `openEntryEditor` again. In `editorPanel.openEntryEditor`, editor DOM is re-rendered from `buildSavePayload(name)`, which uses cached entry data rather than unsaved in-DOM edits. This creates a direct unsaved-edit loss path on a common interaction: clicking enable/strategy controls on the currently edited row.

- **Why it matters:**
  Users can lose in-progress edits without warning while using normal row controls.

- **Severity:** High ❗❗
- **Confidence:** High 😀
- **Category:** Data Integrity

- **Reproducing the issue:**
  1. Open an entry in the editor.
  2. Type into the editor without saving.
  3. Click the same entry's enable toggle or strategy selector in the list row.
  4. Observe editor refresh and lost unsaved text.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Prevent status-control clicks from bubbling to the row click handler, regardless of whether the row is currently active.

- **Proposed fix:**
  **Behavior Change Required:** In `renderEntry()`, change the `status.addEventListener('click', ...)` handler to always call `evt.stopPropagation()`. Keep control-specific handlers (`isEnabled` click, `strat` change) intact so control behavior still runs.

- **Implementation Checklist:**
  [ ] Update the `status` click handler in `src/worldEntry.js` to stop propagation unconditionally.
  [ ] Verify row status controls still toggle entry state/strategy without re-triggering `openEntryEditor()`.

- **Fix risk:** Low 🟢
  The change is localized to event bubbling behavior and does not alter save payload logic.

- **Why it's safe to implement:**
  It only affects click propagation from status controls; normal row click-to-open behavior remains unchanged.

- **Pros:**
  - Prevents a direct unsaved-edit loss path.
  - Makes row-control behavior more predictable.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F02: Rapid toggle/strategy changes can race and persist stale state out of order

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If a user clicks controls quickly, multiple saves can run at the same time. A slower older save can finish last and overwrite the newer choice.

- **Location:**
  `src/worldEntry.js` - `isEnabled` click handler and `strat` change handler.

  Anchor:
  ```js
  isEnabled.addEventListener('click', async()=>{
      ...
      await context.saveWorldInfo(name, context.buildSavePayload(name), true);
  });
  ...
  strat.addEventListener('change', async()=>{
      ...
      await context.saveWorldInfo(name, context.buildSavePayload(name), true);
  });
  ```

- **Detailed Finding:**
  Both handlers launch async saves with no per-entry in-flight guard, no sequencing token, and no UI lock. Users can trigger back-to-back actions before prior saves complete. Because each call submits a full snapshot payload, out-of-order completion can make persisted state reflect an earlier interaction rather than the latest one.

- **Why it matters:**
  Users may see a control showing one value, then later find the value reverted after async completion/update events.

- **Severity:** Medium ❗
- **Confidence:** Medium 🤔
- **Category:** Race Condition

- **Reproducing the issue:**
  1. Quickly click the enable toggle twice (or rapidly change strategy values).
  2. During network latency, let both saves run concurrently.
  3. Observe occasional final state mismatch with the last user action.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Serialize row-control saves so only one write per entry is in-flight at a time.

- **Proposed fix:**
  Add an in-flight save guard per rendered row (or per `name+uid`) in `renderEntry()`. While saving:
  - disable `isEnabled` and `strat` controls,
  - ignore additional clicks/changes,
  - re-enable controls in `finally`.
  This ensures saves apply in interaction order.

- **Implementation Checklist:**
  [ ] Add a local `isSavingState` flag for each rendered entry row.
  [ ] In both handlers, return early when `isSavingState` is true.
  [ ] Set `isSavingState=true` before `saveWorldInfo(...)`, disable controls, then restore in `finally`.

- **Fix risk:** Medium 🟡
  Temporarily disabling controls can change very-fast interaction feel, but prevents stale writes.

- **Why it's safe to implement:**
  It only constrains overlapping row-control saves; it does not change entry model fields or editor rendering flow.

- **Pros:**
  - Prevents out-of-order persistence for rapid user actions.
  - Makes save behavior deterministic.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F03: Save failures leave optimistic UI/cache mutations without rollback

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The UI changes immediately before the save finishes. If save fails, the code does not undo the temporary change, so the screen can show incorrect state.

- **Location:**
  `src/worldEntry.js` - `isEnabled` and `strat` handlers mutate cache/UI before awaiting `saveWorldInfo`.

  Anchor:
  ```js
  context.cache[name].entries[e.uid].disable = nextDisabled;
  applyEnabledIcon(nextDisabled);
  await context.saveWorldInfo(...);
  ```

- **Detailed Finding:**
  Row handlers update `context.cache` and control visuals first, then await persistence. There is no `try/catch` to restore previous values when `saveWorldInfo` rejects. A failure leaves local cache/DOM in a state that was never persisted, and later refreshes can appear as "random reverts."

- **Why it matters:**
  Failed saves can create confusing UI state and user mistrust in whether changes were actually saved.

- **Severity:** Medium ❗
- **Confidence:** Medium 🤔
- **Category:** Data Integrity

- **Reproducing the issue:**
  1. Trigger a save failure (for example, temporary backend/network interruption).
  2. Toggle enable state or strategy from the row.
  3. Observe control appears changed locally despite failed persistence.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Keep optimistic updates, but add rollback logic so failure restores previous cache/UI state.

- **Proposed fix:**
  In each handler:
  - snapshot previous field values (`disable`, `constant`, `vectorized`) and visual state,
  - perform optimistic update,
  - wrap `saveWorldInfo(...)` in `try/catch`,
  - on failure, restore previous cache fields and control UI, then show `toastr.error(...)`.
  Depends on F02 being applied first to reduce concurrent rollback complexity.

- **Implementation Checklist:**
  [ ] Snapshot previous entry values before mutation in both handlers.
  [ ] Wrap each `saveWorldInfo(...)` call in `try/catch`.
  [ ] On catch, restore previous cache values and row-control UI (`applyEnabledIcon`, `strat.value`).
  [ ] Emit a user-visible error toast on save failure.

- **Fix risk:** Medium 🟡
  Rollback logic touches both cache and DOM control state; inconsistent rollback can introduce edge-case desync if incomplete.

- **Why it's safe to implement:**
  It does not change intended success behavior; it only adds explicit failure handling.

- **Pros:**
  - Prevents stale optimistic state after failed saves.
  - Gives clear user feedback when persistence fails.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F04: Missing template controls cause early return with a partially initialized, non-inserted row

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If required template controls are not found, the function exits too early. That can leave internal state saying an entry exists even though its row was never added to the list.

- **Location:**
  `src/worldEntry.js` - template cloning branches.

  Anchor:
  ```js
  const isEnabled = isEnabledTemplate?.cloneNode(true);
  if (!isEnabled) return entry;
  ...
  const strat = stratTemplate?.cloneNode(true);
  if (!strat) return entry;
  ```

- **Detailed Finding:**
  `renderEntry()` writes `world.dom.entry[e.uid]` before control-template checks. If `#entry_edit_template` controls are missing, the function returns early from inside the status block, before:
  - appending the row to `entryList`,
  - wiring row click/editor handlers,
  - creating actions container.
  Result: cache DOM map contains a partial row object while no row is rendered, causing downstream assumptions (`dom.entry[uid].root` exists in DOM) to break.

- **Why it matters:**
  A transient template availability issue can produce missing entries and inconsistent internal state.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** UI Correctness

- **Reproducing the issue:**
  1. Make `#entry_edit_template [name="entryKillSwitch"]` or `[name="entryStateSelector"]` unavailable.
  2. Trigger `renderEntry()` for an entry.
  3. Observe entry metadata created in `world.dom.entry`, but no usable row rendered in list.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Treat missing optional templates as degraded rendering, not a hard return from `renderEntry()`.

- **Proposed fix:**
  Replace both early `return entry` statements with guarded skips:
  - If template exists, build that control.
  - If missing, skip only that control and continue full row assembly and DOM insertion.
  Optionally log a warning once when template anchors are missing.

- **Implementation Checklist:**
  [ ] Remove early returns tied to `!isEnabled` and `!strat`.
  [ ] Guard control creation blocks so row construction continues when either template is missing.
  [ ] Ensure final insertion (`before...` / `entryList.append`) and click handlers always run.

- **Fix risk:** Low 🟢
  The change is local and improves resilience without altering normal template-present behavior.

- **Why it's safe to implement:**
  It affects only failure-mode handling when control templates are missing.

- **Pros:**
  - Prevents partial/invisible entry rows.
  - Keeps cache/DOM state consistent under template drift.

<!-- META-REVIEW: STEP 2 will be inserted here -->
