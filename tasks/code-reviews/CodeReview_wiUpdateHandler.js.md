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

- **Implementation Checklist:**
  [ ] Wrap `updateWIChange()` reconciliation logic in `try/finally`.
  [ ] Move `updateWIChangeStarted = createDeferred()` and `updateWIChangeFinished.resolve()` into `finally`.
  [ ] Ensure the deferred created at cycle start is always the same deferred resolved in `finally`.

- **Fix risk:** Medium 🟡
  Changing synchronization primitives can affect timing-sensitive flows if done incorrectly, but scope is limited to one function.

- **Why it's safe to implement:**
  It does not change entry/book merge logic; it only guarantees completion signaling for existing update cycles.

- **Pros:**
  - Prevents indefinite waits after update exceptions.
  - Makes async coordination behavior deterministic under failure.

<!-- META-REVIEW: STEP 2 will be inserted here -->

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

- **Implementation Checklist:**
  [ ] Delete the direct `updateWIChange(name, data)` call after `saveWorldInfo(...)` in `fillEmptyTitlesWithKeywords()`.
  [ ] Keep `saveWorldInfo(name, data, true)` unchanged so ST emits the standard WI update event.

- **Fix risk:** Low 🟢
  Behavior remains contract-aligned with ST event flow; it removes duplicate work rather than changing data semantics.

- **Why it's safe to implement:**
  Persistence and canonical update event emission still happen through `saveWorldInfo`.

- **Pros:**
  - Eliminates redundant reconciliation cycles.
  - Reduces avoidable UI churn after bulk title fill.

<!-- META-REVIEW: STEP 2 will be inserted here -->

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

- **Implementation Checklist:**
  [ ] Replace inline `eventSource.on(...)` callbacks with named handler variables.
  [ ] Add `cleanup()` in `src/wiUpdateHandler.js` that removes both listeners.
  [ ] Export `cleanup` on the returned handler API object.
  [ ] Call `wiHandlerApi.cleanup?.()` from the extension teardown path in `src/drawer.js`.

- **Fix risk:** Medium 🟡
  If cleanup wiring is missed in callers, listeners may still leak; otherwise behavior is straightforward.

- **Why it's safe to implement:**
  It only affects listener lifecycle management and does not change update reconciliation logic.

- **Pros:**
  - Prevents duplicate handlers on re-init.
  - Aligns with documented ST extension listener hygiene.

<!-- META-REVIEW: STEP 2 will be inserted here -->

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

- **Implementation Checklist:**
  [ ] Remove `event_types` and `eventSource` from top-level imports.
  [ ] Resolve event bus + event enum from `SillyTavern.getContext()` in `initWIUpdateHandler()`.
  [ ] Replace listener registration/removal to use the context-derived references.

- **Fix risk:** Low 🟢
  This is a small compatibility refactor on event hookup lines only.

- **Why it's safe to implement:**
  No change to update logic or WI payload handling; only API access path changes.

- **Pros:**
  - Better compatibility with upstream ST internals churn.
  - Aligns with official extension guidance and local best-practice rules.

<!-- META-REVIEW: STEP 2 will be inserted here -->
