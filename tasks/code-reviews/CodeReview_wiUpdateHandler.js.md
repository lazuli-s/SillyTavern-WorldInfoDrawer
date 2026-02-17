# CODE REVIEW FINDINGS: `src/wiUpdateHandler.js`

*Reviewed: February 17, 2026*

## Scope

- **File reviewed:** `src/wiUpdateHandler.js`
- **Helper files consulted:** `index.js`, `src/drawer.js`, `src/listPanel.js`, `src/listPanel.selectionDnD.js`, `src/utils.js`
- **Skills applied:** `st-js-best-practices`, `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** Incremental cache updates after World Info changes, update wait/token coordination for async UI actions, duplicate-entry refresh queue handling, and fill-empty-titles helper behavior.

---

## F01: Failed update cycles can leave waiters hanging indefinitely

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If one update crashes midway, the code can leave internal "done" signals unresolved. Other features that are waiting for updates can then wait forever and appear stuck.

- **Location:**
  `src/wiUpdateHandler.js` - `updateWIChange()`, deferred lifecycle setup/finalization.

  Anchor:
  ```js
  updateWIChangeFinished = createDeferred();
  ...
  updateWIChangeStarted = createDeferred();
  updateWIChangeFinished.resolve();
  ```

- **Detailed Finding:**
  `updateWIChange()` creates and resolves synchronization deferreds (`updateWIChangeStarted` / `updateWIChangeFinished`) but does not protect resolution with `try/finally`. Any thrown error before the last two lines leaves `updateWIChangeFinished.promise` pending forever for that token cycle. Callers using `waitForWorldInfoUpdate()` without timeout (for example the create-book flow in `src/drawer.js`) can block indefinitely because they await a finish signal that never resolves.

- **Why it matters:**
  A single runtime exception in update reconciliation can deadlock follow-up UI flows that depend on update completion.

- **Severity:** High ❗❗
- **Confidence:** Medium 🤔
- **Category:** Race Condition

- **Reproducing the issue:**
  N/A

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make deferred finalization exception-safe so each started cycle always reaches a settled finish state, even when reconciliation fails.

- **Proposed fix:**
  In `updateWIChange()`:
  - Keep the current start-token behavior.
  - Wrap the reconciliation body in `try/finally`.
  - In `finally`, always reset `updateWIChangeStarted` and resolve `updateWIChangeFinished`.
  - Optionally add `catch` logging before rethrow so failures are visible without masking errors.

- **Fix risk:** Medium 🟡
  Changing synchronization primitives can affect timing-sensitive flows if done incorrectly, but scope is limited to one function.

- **Why it's safe to implement:**
  It does not change entry/book merge logic; it only guarantees completion signaling for existing update cycles.

- **Pros:**
  - Prevents indefinite waits after update exceptions.
  - Makes async coordination behavior deterministic under failure.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `updateWIChange()` creates deferreds at start (lines 55-58) and resolves them at end (line 184) without try/finally protection
  - `waitForWorldInfoUpdate()` loops on token comparison and awaits promises that may never resolve

- **Top risks:**
  - Missing evidence / Risk of the issue actually causing real impact

#### Technical Accuracy Audit

> *Any thrown error before the last two lines leaves `updateWIChangeFinished.promise` pending forever*

- **Why it may be wrong/speculative:**
  The claim is partially speculative - it assumes an error can occur in the reconciliation logic that would prevent reaching line 184. While possible, the exact failure modes aren't enumerated.

- **Validation:**
  Validated ✅ — Code inspection confirms no try/finally wrapping the reconciliation body. If an error occurs in lines 59-183, `updateWIChangeFinished.resolve()` on line 184 is never reached.

- **What needs to be done/inspected to successfully validate:**
  Not applicable - claim is validated.

#### Fix Quality Audit

- **Direction:**
  The proposed fix correctly addresses the issue by adding try/finally protection. It stays within the module boundary per ARCHITECTURE.md.

- **Behavioral change:**
  No behavioral change - the fix only ensures the finish signal always fires even under error conditions. Explicitly labeled as such: N/A

- **Ambiguity:**
  Single solution - wrapping reconciliation in try/finally.

- **Checklist:**
  All checklist items are actionable:
  - "Wrap reconciliation logic in try/finally" - specific action
  - "Move deferred creation and resolution into finally" - specific
  - "Ensure same deferred is resolved" - specific

- **Dependency integrity:**
  No cross-finding dependencies declared.

- **Fix risk calibration:**
  Medium 🟡 rating is appropriate - while the fix is localized, it touches synchronization primitives that other code depends on.

- **Why it's safe to implement:**
  Claim is specific: "does not change entry/book merge logic" - this is verifiable by code inspection of the reconciliation function. Valid.

- **Mitigation:**
  Not applicable.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Wrap `updateWIChange()` reconciliation logic in `try/finally`.
- [x] Move `updateWIChangeStarted = createDeferred()` and `updateWIChangeFinished.resolve()` into `finally`.
- [x] Ensure the deferred created at cycle start is always the same deferred resolved in `finally`.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/wiUpdateHandler.js`
  - Wrapped `updateWIChange()` reconciliation flow in `try/finally` so completion signaling always runs.
  - Replaced the shared finish deferred assignment with a per-cycle deferred (`cycleFinished`) captured at cycle start.
  - Reset `updateWIChangeStarted` and resolved that same captured deferred inside `finally`.

- Risks / Side effects
  - Update-cycle completion now resolves even when reconciliation throws, so downstream waits continue instead of hanging (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Temporarily force an error during `updateWIChange()` (for example with a test throw), then create or edit a book and confirm follow-up UI actions do not wait forever.

---

## F02: `fillEmptyTitlesWithKeywords()` forces a duplicate update pass for the same save

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  After saving the book once, the code refreshes the same data twice. That adds extra work and can make the UI do unnecessary redraws.

- **Location:**
  `src/wiUpdateHandler.js` - `fillEmptyTitlesWithKeywords()`

  Anchor:
  ```js
  await saveWorldInfo(name, data, true);
  updateWIChange(name, data);
  ```

- **Detailed Finding:**
  `saveWorldInfo(name, data, true)` already emits `WORLDINFO_UPDATED` (documented WI API contract), and this module subscribes to that event via `updateWIChangeDebounced`. Immediately calling `updateWIChange(name, data)` afterwards causes a second reconciliation cycle for the same payload. This duplicates DOM/cache reconciliation and sort checks, and can produce avoidable churn in wait-token sequencing.

- **Why it matters:**
  Redundant update passes increase UI work on a user action that can already touch many entries.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** Performance

- **Reproducing the issue:**
  1. Run "Fill empty titles from keywords" on a book with empty-title entries.
  2. Observe two `[UPDATE-WI]` passes for the same book in console logs (manual call + event-driven call).

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Use one update trigger path only; prefer the canonical event-driven path from `saveWorldInfo`.

- **Proposed fix:**
  Remove the direct `updateWIChange(name, data)` call in `fillEmptyTitlesWithKeywords()` and rely on the `WORLDINFO_UPDATED` subscription to run reconciliation once.

- **Fix risk:** Low 🟢
  Behavior remains contract-aligned with ST event flow; it removes duplicate work rather than changing data semantics.

- **Why it's safe to implement:**
  Persistence and canonical update event emission still happen through `saveWorldInfo`.

- **Pros:**
  - Eliminates redundant reconciliation cycles.
  - Reduces avoidable UI churn after bulk title fill.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `saveWorldInfo` emits `WORLDINFO_UPDATED` event (WI API contract)
  - Module subscribes to this event via line 240: `eventSource.on(event_types.WORLDINFO_UPDATED, (name, world)=>updateWIChangeDebounced(...))`
  - Direct call to `updateWIChange(name, data)` on line 236 follows immediately after save

- **Top risks:**
  - None identified for this finding

#### Technical Accuracy Audit

> *`saveWorldInfo(name, data, true)` already emits `WORLDINFO_UPDATED` (documented WI API contract), and this module subscribes to that event via `updateWIChangeDebounced`. Immediately calling `updateWIChange(name, data)` afterwards causes a second reconciliation cycle for the same payload.*

- **Why it may be wrong/speculative:**
  Not speculative - the WI API documentation in `wi-api.md` confirms `saveWorldInfo` emits `WORLDINFO_UPDATED`, and the code shows both the event subscription and direct call.

- **Validation:**
  Validated ✅ — Code inspection confirms:
  1. Line 240: event subscription to `WORLDINFO_UPDATED`
  2. Line 236: direct `updateWIChange(name, data)` call after save

- **What needs to be done/inspected to successfully validate:**
  Not applicable - claim is validated.

#### Fix Quality Audit

- **Direction:**
  The fix correctly removes the redundant call and relies on event-driven reconciliation. Stays within module boundary.

- **Behavioral change:**
  The fix changes event ordering - now only one reconciliation happens (event-driven) instead of two. This is a behavioral change but explicitly labeled as such in the audit requirements. The change reduces work rather than altering user-visible behavior.

- **Ambiguity:**
  Single solution - remove the direct call.

- **Checklist:**
  Both items are specific and actionable:
  - "Delete the direct updateWIChange call" - exact action
  - "Keep saveWorldInfo unchanged" - specific preservation

- **Dependency integrity:**
  No cross-finding dependencies.

- **Fix risk calibration:**
  Low 🟡 rating is appropriate - simply removing a function call with no side effects.

- **Why it's safe to implement:**
  Claim is specific and verifiable: "Persistence and canonical update event emission still happen through saveWorldInfo" - the event emission is guaranteed by WI API contract.

- **Mitigation:**
  Not applicable.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Delete the direct `updateWIChange(name, data)` call after `saveWorldInfo(...)` in `fillEmptyTitlesWithKeywords()`.
- [x] Keep `saveWorldInfo(name, data, true)` unchanged so ST emits the standard WI update event.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/wiUpdateHandler.js`
  - Removed the direct manual `updateWIChange(name, data)` call after `saveWorldInfo(...)`.
  - Kept `saveWorldInfo(name, data, true)` unchanged so the normal `WORLDINFO_UPDATED` event remains the single trigger path.

- Risks / Side effects
  - Reconciliation now depends only on the event-driven path after save, so timing follows ST event dispatch order (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Run "Fill empty titles from keywords" on a book with empty titles and confirm titles update once with no duplicate `[UPDATE-WI]` pass for the same save.

---

## F03: Event bus listeners are registered without a teardown path

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The file starts listening to global events, but it never unregisters those listeners. If this module is initialized again, the same handlers can run multiple times.

- **Location:**
  `src/wiUpdateHandler.js` - module tail event subscriptions.

  Anchor:
  ```js
  eventSource.on(event_types.WORLDINFO_UPDATED, ...);
  eventSource.on(event_types.WORLDINFO_SETTINGS_UPDATED, ...);
  ```

- **Detailed Finding:**
  `initWIUpdateHandler()` subscribes to two global event bus events and returns no cleanup API for removing them. This violates the listener lifecycle guidance in `st-js-best-practices` (PERF-02). In re-init scenarios (extension reload flows, repeated bootstrap during development), handlers can accumulate and trigger duplicate update work per event.

- **Why it matters:**
  Leaked listeners create repeated work, harder debugging, and long-session performance drift.

- **Severity:** Medium ❗
- **Confidence:** Medium 🤔
- **Category:** Performance

- **Reproducing the issue:**
  N/A

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make listener ownership explicit by exposing a cleanup function and calling it from existing extension teardown paths.

- **Proposed fix:**
  In `initWIUpdateHandler()`:
  - Assign named handler functions for `WORLDINFO_UPDATED` and `WORLDINFO_SETTINGS_UPDATED`.
  - Add a `cleanup()` function that calls `eventSource.removeListener(...)` for both handlers.
  - Return `cleanup` in the public API.
  In `src/drawer.js` (current teardown block), invoke `wiHandlerApi.cleanup?.()` alongside existing cleanup calls.

- **Fix risk:** Medium 🟡
  If cleanup wiring is missed in callers, listeners may still leak; otherwise behavior is straightforward.

- **Why it's safe to implement:**
  It only affects listener lifecycle management and does not change update reconciliation logic.

- **Pros:**
  - Prevents duplicate handlers on re-init.
  - Aligns with documented ST extension listener hygiene.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `initWIUpdateHandler()` subscribes to two events (lines 240-241)
  - The returned API object contains no cleanup method
  - PERF-02 in best practices explicitly requires listener cleanup

- **Top risks:**
  - None identified for this finding

#### Technical Accuracy Audit

> *`initWIUpdateHandler()` subscribes to two global event bus events and returns no cleanup API for removing them.*

- **Why it may be wrong/speculative:**
  Not speculative - code inspection confirms both subscriptions with no cleanup returned.

- **Validation:**
  Validated ✅ — Lines 240-241 show event subscriptions; returned object (lines 244-256) contains no cleanup/removal method.

- **What needs to be done/inspected to successfully validate:**
  Not applicable - claim is validated.

#### Fix Quality Audit

- **Direction:**
  The fix correctly adds named handlers and exposes cleanup. Requires cross-file changes in drawer.js - labeled appropriately.

- **Behavioral change:**
  No behavioral change to update logic - only adds lifecycle management.

- **Ambiguity:**
  Single solution with clear steps.

- **Checklist:**
  All four items are specific and actionable:
  - Replace inline callbacks with named handlers - specific
  - Add cleanup function - specific
  - Export cleanup - specific
  - Call cleanup from drawer.js - specific with file named

- **Dependency integrity:**
  The fix declares cross-file dependency: drawer.js must call the cleanup. This is explicitly mentioned in the proposed fix.

- **Fix risk calibration:**
  Medium 🟡 rating is appropriate - while the fix is straightforward, if drawer.js wiring is missed, listeners still leak.

- **Why it's safe to implement:**
  Claim is specific: "only affects listener lifecycle management" - verifiable.

- **Mitigation:**
  Not applicable.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Replace inline `eventSource.on(...)` callbacks with named handler variables.
- [x] Add `cleanup()` in `src/wiUpdateHandler.js` that removes both listeners.
- [x] Export `cleanup` on the returned handler API object.
- [x] Call `wiHandlerApi.cleanup?.()` from the extension teardown path in `src/drawer.js`.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/wiUpdateHandler.js`, `src/drawer.js`
  - Replaced inline world-info event subscriptions with named handlers.
  - Added `cleanup()` in `wiUpdateHandler` to remove both global event listeners.
  - Returned `cleanup` from `initWIUpdateHandler()` and wired `wiHandlerApi.cleanup?.()` into the existing drawer teardown block.

- Risks / Side effects
  - If teardown paths are not reached in a host reload scenario, listeners may still persist until full page unload (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] Reload/reinitialize the extension flow, then trigger a World Info save and settings change; confirm each handler runs once (no duplicate logs or duplicate list refresh behavior).

---

## F04: Direct `script.js` imports bypass the stable context API

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  This file imports core runtime internals directly instead of using the official context interface. That makes upgrades more fragile because internal file exports can change.

- **Location:**
  `src/wiUpdateHandler.js:1`

  Anchor:
  ```js
  import { event_types, eventSource } from '../../../../../script.js';
  ```

- **Detailed Finding:**
  `st-js-best-practices` COMPAT-01 recommends using `SillyTavern.getContext()` for shared runtime objects like `eventSource` and event enums. Importing directly from `script.js` couples this extension to internal module export layout. `st-context.js` already exposes `eventSource` and `eventTypes`/`event_types`, making context usage the compatibility layer.

- **Why it matters:**
  Upstream SillyTavern refactors can break this extension at load time even when stable context APIs remain unchanged.

- **Severity:** Low ⭕
- **Confidence:** High 😀
- **Category:** JS Best Practice

- **Reproducing the issue:**
  N/A

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Read event bus references from `SillyTavern.getContext()` and keep direct imports only where context does not provide an equivalent.

- **Proposed fix:**
  Remove `event_types`/`eventSource` import from `script.js`. Inside module init, read:
  - `const ctx = SillyTavern.getContext();`
  - `const eventBus = ctx.eventSource;`
  - `const events = ctx.eventTypes ?? ctx.event_types;`
  Then update listener registration/removal calls to use `eventBus` and `events`.

- **Fix risk:** Low 🟢
  This is a small compatibility refactor on event hookup lines only.

- **Why it's safe to implement:**
  No change to update logic or WI payload handling; only API access path changes.

- **Pros:**
  - Better compatibility with upstream ST internals churn.
  - Aligns with official extension guidance and local best-practice rules.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Line 1 imports directly from `script.js`: `import { event_types, eventSource } from '../../../../../script.js';`
  - COMPAT-01 recommends `SillyTavern.getContext()` for shared runtime objects
  - `st-context.js` exposes `eventSource` and `eventTypes`/`event_types`

- **Top risks:**
  - None identified for this finding

#### Technical Accuracy Audit

> *Importing directly from `script.js` couples this extension to internal module export layout.*

- **Why it may be wrong/speculative:**
  Not speculative - the import statement is directly visible in the code.

- **Validation:**
  Validated ✅ — Line 1 shows direct import from script.js.

- **What needs to be done/inspected to successfully validate:**
  Not applicable - claim is validated.

#### Fix Quality Audit

- **Direction:**
  The fix correctly migrates to context API usage. Small change scope limited to import/usage lines.

- **Behavioral change:**
  No behavioral change - only API access path changes.

- **Ambiguity:**
  Single solution.

- **Checklist:**
  All three items are specific and actionable:
  - Remove top-level imports - specific
  - Resolve from getContext() - specific
  - Replace usage - specific

- **Dependency integrity:**
  No cross-finding dependencies.

- **Fix risk calibration:**
  Low 🟢 rating is appropriate - trivial refactor with no side effects.

- **Why it's safe to implement:**
  Claim is specific: "no change to update logic" - verifiable by code inspection.

- **Mitigation:**
  Not applicable.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Remove `event_types` and `eventSource` from top-level imports.
- [x] Resolve event bus + event enum from `SillyTavern.getContext()` in `initWIUpdateHandler()`.
- [x] Replace listener registration/removal to use the context-derived references.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/wiUpdateHandler.js`
  - Removed direct `script.js` imports for event bus and event enum.
  - Resolved `eventSource` and `eventTypes`/`event_types` from `SillyTavern.getContext()` inside module init.
  - Updated listener registration and cleanup paths to use context-derived event references.

- Risks / Side effects
  - On hosts where context shape is unexpectedly missing event fields, listeners will not attach (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] Open the drawer, save a lorebook entry, and change WI settings; confirm update and settings handlers still run on your current SillyTavern version.

---

### Coverage Note

- **Obvious missed findings:** None identified.
- **Severity calibration:** F01 (High, Medium confidence) appropriately flags a real data-integrity risk. F02-F04 (Medium/Low) appropriately target performance and compatibility improvements.
