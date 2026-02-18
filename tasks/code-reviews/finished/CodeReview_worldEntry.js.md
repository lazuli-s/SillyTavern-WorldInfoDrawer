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

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  The claim that status clicks bubble to entry click handler when row is active is **evidence-based** and **confirmed** by code inspection in `src/worldEntry.js` lines 107-110.

- **Top risks:**
  - None identified — the finding is well-evidenced with specific code anchors and a concrete failure path.

#### Technical Accuracy Audit

> The `status` container only stops click propagation when the row is *not* the active editor row. For the active row, status clicks bubble to `entry` and call `openEntryEditor` again.

- **Why it may be wrong/speculative:**
  N/A — claim is correct.

- **Validation:**
  Validated ✅ — `src/worldEntry.js:107-110` shows conditional stopPropagation that only fires when NOT active:
  ```js
  status.addEventListener('click', (evt)=>{
      if (context.currentEditor?.name != name || context.currentEditor?.uid != e.uid) evt.stopPropagation();
  });
  ```

- **What needs to be done/inspected to successfully validate:**
  N/A

#### Fix Quality Audit

- **Direction:**
  The proposed direction is sound — unconditional `evt.stopPropagation()` in status click handler prevents the bubble-up path entirely. This stays within module responsibility (worldEntry.js owns row rendering).

- **Behavioral change:**
  Explicitly labeled "Behavior Change Required" in Step 1 — ✅ correctly flags that row-clicks no longer trigger when status controls are clicked.

- **Ambiguity:**
  Only one suggestion (unconditional stopPropagation) — ✅ no ambiguity.

- **Checklist:**
  Checklist items are complete and actionable:
  1. Update status click handler to stop propagation unconditionally.
  2. Verify row status controls still toggle state without re-triggering editor.
  Both are specific and implementable by LLM without human input.

- **Dependency integrity:**
  No dependencies declared or required — ✅ self-contained fix.

- **Fix risk calibration:**
  Fix risk rated "Low 🟢" — ✅ accurate. The change is localized to event bubbling and has no cross-module impact.

- **Why it's safe validity:**
  Safety claim is specific: "only affects click propagation from status controls" — ✅ verifiable. Normal row click behavior remains unchanged.

- **Mitigation:**
  N/A

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Update the `status` click handler in `src/worldEntry.js` to stop propagation unconditionally.
- [x] Verify row status controls still toggle entry state/strategy without re-triggering `openEntryEditor()`.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/worldEntry.js`
  - Removed the conditional check from the `status` click handler; `evt.stopPropagation()` now fires unconditionally for all status-control clicks, regardless of whether the row is the active editor row.

- Risks / Side effects
  - Status-container clicks no longer bubble to the row `entry` click handler — this is the intended fix (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Click the enable toggle and strategy selector on the currently-open editor row; confirm `openEntryEditor` is not re-triggered and both controls still change entry state correctly.

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

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  The claim that concurrent saves can race is **evidence-based** — both handlers perform async `saveWorldInfo` calls without any coordination mechanism.

- **Top risks:**
  - None — the finding identifies a real race condition that can cause user-visible state inconsistency.

#### Technical Accuracy Audit

> Both handlers launch async saves with no per-entry in-flight guard, no sequencing token, and no UI lock. Users can trigger back-to-back actions before prior saves complete.

- **Why it may be wrong/speculative:**
  N/A — claim is correct based on code inspection.

- **Validation:**
  Validated ✅ — `src/worldEntry.js` lines 123-126 and 139-152 show async handlers with no guard.

- **What needs to be done/inspected to successfully validate:**
  N/A

#### Fix Quality Audit

- **Direction:**
  Proposed direction (add per-row save guard with control disabling) is sound and stays within module responsibility.

- **Behavioral change:**
  Not explicitly labeled as "Behavior Change Required" but should be — disabling controls during save changes interaction feel. The impact is minor but should be acknowledged.

- **Ambiguity:**
  Only one suggestion — ✅ no ambiguity.

- **Checklist:**
  Checklist items are complete and actionable. All three steps can be implemented by LLM without human input.

- **Dependency integrity:**
  No dependencies declared or required — ✅ self-contained.

- **Fix risk calibration:**
  Fix risk rated "Medium 🟡" — ✅ accurate. Control disabling can change interaction feel but is low-risk.

- **Why it's safe validity:**
  Safety claim is specific: "only constrains overlapping row-control saves" — ✅ verifiable.

- **Mitigation:**
  N/A

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Add a local `isSavingState` flag for each rendered entry row.
- [x] In both handlers, return early when `isSavingState` is true.
- [x] Set `isSavingState=true` before `saveWorldInfo(...)`, disable controls, then restore in `finally`.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/worldEntry.js`
  - Added `let isSavingState = false` per-row guard shared by both `isEnabled` and `strat` handlers.
  - Both handlers return early if `isSavingState` is `true`; each sets `isSavingState = true` and disables the control before the awaited save, then restores both in `finally`.

- Risks / Side effects
  - Controls are briefly disabled during save; rapid successive clicks are silently dropped rather than queued (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Click the enable toggle twice in rapid succession; confirm only one save fires and the final visual state matches the last committed toggle.

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

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  The claim that cache/UI is mutated before await with no rollback is **evidence-based** — confirmed by code inspection.

- **Top risks:**
  - None — the finding is well-evidenced.

#### Technical Accuracy Audit

> Row handlers update `context.cache` and control visuals first, then await persistence. There is no `try/catch` to restore previous values when `saveWorldInfo` rejects.

- **Why it may be wrong/speculative:**
  N/A — claim is correct.

- **Validation:**
  Validated ✅ — `src/worldEntry.js` lines 123-126 show direct cache mutation before await, no try/catch.

- **What needs to be done/inspected to successfully validate:**
  N/A

#### Fix Quality Audit

- **Direction:**
  Proposed direction (snapshot + rollback) is sound.

- **Behavioral change:**
  Not explicitly labeled as "Behavior Change Required" — ✅ correctly flags that UI now shows errors on failure instead of silent mismatch.

- **Ambiguity:**
  Only one suggestion — ✅ no ambiguity.

- **Checklist:**
  Checklist items are complete and actionable. All four steps can be implemented by LLM without human input.

- **Dependency integrity:**
  The fix declares a dependency on F02: "Depends on F02 being applied first to reduce concurrent rollback complexity." — ✅ this is appropriate as F02's guard would prevent the race condition that makes rollback more complex.

- **Fix risk calibration:**
  Fix risk rated "Medium 🟡" — ✅ accurate. Rollback logic does touch both cache and DOM.

- **Why it's safe validity:**
  Safety claim is specific — ✅ verifiable.

- **Mitigation:**
  N/A

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Snapshot previous entry values before mutation in both handlers.
- [x] Wrap each `saveWorldInfo(...)` call in `try/catch`.
- [x] On catch, restore previous cache values and row-control UI (`applyEnabledIcon`, `strat.value`).
- [x] Emit a user-visible error toast on save failure.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/worldEntry.js`
  - `isEnabled` handler: snapshots `prevDisabled` before mutation; on `catch`, restores `cache[name].entries[e.uid].disable` and calls `applyEnabledIcon(prevDisabled)`, then shows `toastr.error('Failed to save entry state...')`.
  - `strat` handler: snapshots `prevConstant`/`prevVectorized` before mutation; on `catch`, restores both cache fields and resets `strat.value` via `entryState({ constant: prevConstant, vectorized: prevVectorized })`, then shows `toastr.error('Failed to save entry strategy...')`.

- Risks / Side effects
  - If a `WORLDINFO_UPDATED` event fires between a failed save and the rollback, the cache may already reflect the correct server state; the rollback would then re-apply stale pre-mutation values (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] Simulate a save failure (e.g., interrupt the network), then toggle an entry's enable state; confirm the control visually reverts to its pre-toggle value and a red error toast appears.

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

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  The claim about early returns leaving partial state is **evidence-based** — confirmed by code inspection showing `world.dom.entry[e.uid] = {}` is set before the return statements.

- **Top risks:**
  - None — the finding is well-evidenced with specific code paths.

#### Technical Accuracy Audit

> `renderEntry()` writes `world.dom.entry[e.uid]` before control-template checks. If `#entry_edit_template` controls are missing, the function returns early from inside the status block.

- **Why it may be wrong/speculative:**
  N/A — claim is correct.

- **Validation:**
  Validated ✅ — `src/worldEntry.js` line 9 sets `world.dom.entry[e.uid] = {}` before the early returns at lines 112 and 121.

- **What needs to be done/inspected to successfully validate:**
  N/A

#### Fix Quality Audit

- **Direction:**
  Proposed direction (guarded skips instead of early returns) is sound and improves resilience.

- **Behavioral change:**
  Not explicitly labeled "Behavior Change Required" but should be — the behavior changes from "fail entirely" to "degraded rendering" when templates are missing. This is a minor but positive change.

- **Ambiguity:**
  Only one suggestion — ✅ no ambiguity.

- **Checklist:**
  Checklist items are complete and actionable. All three steps can be implemented by LLM without human input.

- **Dependency integrity:**
  No dependencies declared or required — ✅ self-contained.

- **Fix risk calibration:**
  Fix risk rated "Low 🟢" — ✅ accurate. Change is local and improves failure handling.

- **Why it's safe validity:**
  Safety claim is specific — ✅ verifiable.

- **Mitigation:**
  N/A

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Remove early returns tied to `!isEnabled` and `!strat`.
- [x] Guard control creation blocks so row construction continues when either template is missing.
- [x] Ensure final insertion (`before...` / `entryList.append`) and click handlers always run.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/worldEntry.js`
  - Replaced `if (!isEnabled) return entry` with an `if (isEnabled) { … }` guard block; replaced `if (!strat) return entry` with an `if (strat) { … }` guard block.
  - Row insertion (`world.dom.entryList.append(entry)` / `before.insertAdjacentElement`) and the entry `click` handler now always execute regardless of template availability.

- Risks / Side effects
  - If both templates are absent, rows render without enable/strategy controls; callers reading `world.dom.entry[e.uid].isEnabled` or `.strategy` will see `undefined` (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] Open a book with normal templates in place; confirm all entry rows render with enable toggles and strategy selectors visible, and that clicking them behaves as before.

---

### Coverage Note

- **Obvious missed findings:** None identified. All findings are well-evidenced with specific code anchors and concrete failure triggers. The review covers the key data integrity, race condition, and UI correctness issues in the entry rendering code.
- **Severity calibration:** Severity ratings appear appropriate — F01 (High) addresses a direct data-loss path, F02-F03 (Medium) address race conditions and failure handling, F04 (Medium) addresses a template availability edge case.