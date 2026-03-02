# CODE REVIEW FINDINGS: `src/wiUpdateHandler.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/wiUpdateHandler.js`
- **Helper files consulted:** `src/utils.js`, `src/drawer.js`, `src/listPanel.coreBridge.js`, `src/listPanel.bookMenu.js`
- **Skills applied:** `st-js-best-practices` / `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** "WORLDINFO update engine (cache sync, waits, duplicate-refresh queue)"

---

## F01: wait loop can spin indefinitely during an in-progress update

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The function that waits for the "next update" can get stuck in a very fast loop if it is called while an update is already running, which can freeze the UI.

- **Category:** Race Condition

- **Location:**
  `src/wiUpdateHandler.js`, `waitForWorldInfoUpdate()`:
  - `while (updateWIChangeToken === tokenAtCall) {`
  - `const startPromise = updateWIChangeStarted.promise;`
  - `await startPromise;`

- **Detailed Finding:**
  `waitForWorldInfoUpdate()` captures `tokenAtCall`, then loops until `updateWIChangeToken` changes. If the function is called while `updateWIChange` is already running, `updateWIChangeStarted.promise` has already been resolved for that cycle. Awaiting an already-resolved promise in this `while` loop re-enters immediately, so the loop can spin without ever waiting on a new unresolved signal. Because the token only increments when a later cycle starts, this creates a hot microtask loop that can starve other async work. This is reachable from duplicate/book flows that call `waitForWorldInfoUpdate()` while update activity is already in flight.

- **Why it matters:**
  Users can hit hangs or severe lag during duplicate/create/selection flows, and waits can become unreliable under rapid interactions.

- **Severity:** High

- **Confidence:** High
  The loop behavior is deterministic when `updateWIChangeStarted.promise` is already resolved and `updateWIChangeToken` has not advanced.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make the wait logic explicitly handle "cycle already running" so it always awaits an unresolved promise instead of repeatedly awaiting a resolved one.

- **Proposed fix:**
  Track cycle state in `wiUpdateHandler.js` (for example `isWIUpdateInProgress` set true at `updateWIChange` start and false in `finally`). In `waitForWorldInfoUpdate()`, when `tokenAtCall` is unchanged and a cycle is in progress, await `updateWIChangeFinished.promise` first; otherwise await `updateWIChangeStarted.promise`. Keep the strict "token must be newer than call time" rule.

- **Implementation Checklist:**
  - [ ] Add an in-progress flag (or equivalent state) updated at the start and end of `updateWIChange`
  - [ ] Update `waitForWorldInfoUpdate()` to avoid awaiting an already-resolved start signal in a tight loop
  - [ ] Preserve current semantics: only resolve for an update cycle that starts after the call
  - [ ] Keep `waitForWorldInfoUpdateWithTimeout()` behavior unchanged for callers

- **Fix risk:** Medium
  This touches synchronization behavior used by several flows (`duplicate`, `create`, core-bridge waits), so ordering assumptions must stay consistent.

- **Why it's safe to implement:**
  The change is confined to wait/token coordination in `wiUpdateHandler.js` and does not alter WI data mutation, save payload shape, or entry rendering logic.

- **Pros:**
  - Removes a UI-freeze class of bug
  - Makes async waits deterministic under concurrent interactions
  - Improves stability of duplicate/create flows that rely on update sequencing

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `waitForWorldInfoUpdate()` loop behavior when `updateWIChangeStarted.promise` is already resolved
  - Token comparison `while (updateWIChangeToken === tokenAtCall)` creates tight loop when promise resolves but token unchanged
  - Reproducible from `queueEditorDuplicateRefresh()` and other flows that call wait during active update

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:**
  Technically sound. The fix stays within `wiUpdateHandler.js` as the owner of wait/token coordination.

- **Behavioral change:**
  Changes the timing of when `waitForWorldInfoUpdate()` resolves — it will now properly wait for a cycle that starts AFTER the call when one is already running. This is the intended behavior per the function's JSDoc comment, so this is a bug fix, not a behavioral change.

- **Ambiguity:**
  Single clear recommendation: track cycle state and choose which promise to await.

- **Checklist:**
  Items are actionable. No manual verification steps. No caller updates needed.

- **Dependency integrity:**
  No cross-finding dependencies.

- **Fix risk calibration:**
  Correctly rated Medium — touches synchronization used by multiple flows.

- **"Why it's safe" validity:**
  Valid. The change is confined to wait coordination and doesn't alter data mutation, save payloads, or rendering.

- **Verdict:** Ready to implement 🟢
  All claims are evidenced, fix direction is sound, risk is appropriately calibrated.

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Add an in-progress flag (or equivalent state) updated at the start and end of `updateWIChange`
- [x] Update `waitForWorldInfoUpdate()` to avoid awaiting an already-resolved start signal in a tight loop
- [x] Preserve current semantics: only resolve for an update cycle that starts after the call
- [x] Keep `waitForWorldInfoUpdateWithTimeout()` behavior unchanged for callers

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/wiUpdateHandler.js`
  - Added `isWIUpdateInProgress` state and update-cycle start/end toggles inside `updateWIChange`.
  - Updated `waitForWorldInfoUpdate()` to await `updateWIChangeFinished.promise` when a cycle is already running, preventing a hot loop on an already-resolved start promise.
  - Preserved strict token semantics so waits only resolve for cycles that start after the call, and left timeout wrapper behavior unchanged.

- Risks / Side effects
  - Waiters can now remain pending longer if updates never fire, which may expose pre-existing caller assumptions about immediate resolution timing. (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Trigger duplicate/create flows rapidly; confirm the UI stays responsive and each operation completes without long hangs.

---

## F02: missing null guard in "fill empty titles" path

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If the selected book disappears before the action runs, this function can crash instead of safely stopping.

- **Category:** UI Correctness

- **Location:**
  `src/wiUpdateHandler.js`, `fillEmptyTitlesWithKeywords()`:
  - `const data = await loadWorldInfo(name);`
  - `for (const entry of Object.values(data.entries)) {`

- **Detailed Finding:**
  `loadWorldInfo(name)` can return `null` when the book cannot be loaded (for example, renamed/deleted concurrently). The function immediately dereferences `data.entries` without validating `data`. If `null` is returned, `Object.values(data.entries)` throws and aborts the action. This is a classic stale-state race in an async UI path.

- **Why it matters:**
  A user-triggered action can fail with a runtime error and leave the UI in a confusing state, especially when multiple book operations happen quickly.

- **Severity:** Medium

- **Confidence:** High
  The failure path is directly visible from `loadWorldInfo` nullable behavior and unchecked dereference.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Treat missing/invalid load results as a no-op and return early.

- **Proposed fix:**
  In `fillEmptyTitlesWithKeywords`, add a guard after `loadWorldInfo(name)` to ensure `data` is an object and `data.entries` is an object before iterating. If invalid, return without saving.

- **Implementation Checklist:**
  - [ ] Validate `data` exists and has an object-like `entries` field before `Object.values(...)`
  - [ ] Return early when the book cannot be loaded
  - [ ] Keep existing "save only when updates exist" behavior unchanged

- **Fix risk:** Low
  This is a defensive early-return guard in one function and should not change normal successful behavior.

- **Why it's safe to implement:**
  It only affects error/edge paths where data is missing; standard title-fill logic and save semantics remain the same.

- **Pros:**
  - Prevents avoidable runtime crashes
  - Makes the action resilient to concurrent rename/delete operations
  - Improves user trust in bulk-title helper behavior

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `loadWorldInfo(name)` can return `null` when book cannot be loaded
  - `data.entries` is dereferenced without null check at line `for (const entry of Object.values(data.entries))`
  - This is a classic stale-state race in async UI paths

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code and `st-world-info-api` docs (which document `loadWorldInfo` as nullable).

#### Fix Quality Audit

- **Direction:**
  Technically sound. Simple defensive guard in the correct function.

- **Behavioral change:**
  No behavioral change for success paths. Failed loads now return early instead of throwing — this is a crash-to-no-op fix.

- **Ambiguity:**
  Single clear recommendation: add null guard and return early.

- **Checklist:**
  Items are actionable. No manual verification steps. No caller updates needed.

- **Dependency integrity:**
  No cross-finding dependencies.

- **Fix risk calibration:**
  Correctly rated Low — defensive early-return in one function.

- **"Why it's safe" validity:**
  Valid. Only affects error/edge paths where data is missing.

- **Verdict:** Ready to implement 🟢
  All claims are evidenced, fix direction is sound, risk is appropriately calibrated.

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Validate `data` exists and has an object-like `entries` field before `Object.values(...)`
- [x] Return early when the book cannot be loaded
- [x] Keep existing "save only when updates exist" behavior unchanged

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/wiUpdateHandler.js`
  - Added a defensive guard in `fillEmptyTitlesWithKeywords()` to return early when `loadWorldInfo(name)` returns null/invalid data or missing `entries`.
  - Kept existing behavior that saves only when title updates were actually made.

- Risks / Side effects
  - If upstream data is unexpectedly malformed, the action now exits silently instead of throwing, which may hide the root cause from end users. (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Run "fill empty titles" on a valid book and confirm empty-title entries are still filled and saved exactly as before.

---

*End of first-pass review findings*
