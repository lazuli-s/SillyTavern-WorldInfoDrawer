# CODE REVIEW FINDINGS: `src/listPanel.js`

## F01: Race: `setBookSortPreference()` can crash or reorder stale DOM after an awaited save
- Location:  
  `src/listPanel.js` — `setBookSortPreference()` → `sortEntriesIfNeeded()`

  Anchor snippet:
  ```js
  await state.saveWorldInfo(name, state.buildSavePayload(name), true);
  sortEntriesIfNeeded(name);
  ```

- What the issue is  
  `setBookSortPreference()` awaits an async save, then immediately calls `sortEntriesIfNeeded(name)` which assumes `state.cache[name]` and its DOM references (`dom.entryList`, `dom.entry[uid].root`) are still present and consistent.

- Why it matters  
  If `refreshList()` (or any other cache-clearing/reload path) runs while the save is in-flight, `state.cache` may be cleared and rebuilt. When the await resumes, `sortEntriesIfNeeded()` can throw (e.g., `Cannot read properties of undefined (reading 'entries')`) or reorder a DOM that no longer matches the book/entries that were just saved. That is a stability issue and can also desync UI state (selection highlight, scroll position, collapse state).

- Severity: High

- Fix risk: Medium  
  The fix will touch a frequently used preference path and needs to avoid changing when/if sorts are applied.

- Confidence: High  
  The post-`await` call uses unguarded cache/DOM access and `refreshList()` explicitly deletes cache keys synchronously.

- Repro idea:  
  1) Open a book with many entries.  
  2) Open the book menu and change sort preference.  
  3) While the save is happening, trigger a list reload (e.g., "Refresh" button, or any action that calls `refreshList()` such as some folder operations).  
  4) Watch for console errors and/or entry list order snapping to an unexpected ordering.

- Suggested direction  
  Ensure the post-save UI update only runs if the same book instance is still in cache and the entryList DOM is still valid.

- Proposed fix  
  Add a stable "generation/token" guard (or equivalent) around list reloads and post-save actions so stale async continuations do not touch cleared/rebuilt cache/DOM. At minimum, short-circuit `sortEntriesIfNeeded()` if the cache entry is missing or DOM nodes are not present.

- **Pros:**
  - The issue is clearly described with a concrete anchor snippet
  - Severity (High) and Confidence (High) ratings are appropriate
  - The suggested direction (generation/token guard) is technically sound and aligns with common async patterns
  - The "Why it's safe" reasoning is valid — only aborted stale paths are affected

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "The post-`await` call uses unguarded cache/DOM access" — **Validated**: `sortEntriesIfNeeded(name)` has no guard for `state.cache[name]` existence or DOM validity before accessing `state.cache[name].entries`, `state.cache[name].dom.entryList`, etc.
  - Claim: "`refreshList()` explicitly deletes cache keys synchronously" — **Validated**: `refreshList()` calls `clearCacheBooks(state.cache)` which clears cache synchronously before awaiting the debounced load.

- **Top risks:**
  - None identified — the evidence is strong and the prioritization is correct for a High-severity data-integrity issue

#### Technical Accuracy Audit

- **Direction:**  
  The proposed fix (generation/token guard) stays within the correct module boundary (`listPanel.js` orchestration) per ARCHITECTURE.md. It doesn't move responsibility across modules.

- **Behavioral change:**  
  Labeled as "Behavior Change Required" — the fix changes when `sortEntriesIfNeeded()` executes (it may skip execution if stale). This is correctly labeled as a behavioral change that needs explicit acknowledgment.

- **Ambiguity:**  
  The suggested direction is singular: add a generation/token guard. This is clear.

- **Checklist:**  
  Checklist items are actionable:
  1. "Identify every callsite that can invoke `refreshList()` while menu actions are awaiting" — specific, can be done via code search
  2. "Add a lightweight list 'refresh token'" — concrete implementation task
  3. "Capture the token before `await state.saveWorldInfo(...)`" — specific code location
  4. "After await, validate token and validate `state.cache[name]` + required DOM refs exist; abort if not" — specific logic
  5. "Add console.warn (prefixed) for aborted stale continuation" — specific logging task
  6. "Manually re-test sort preference change with simultaneous refresh triggers" — test step
  
  All steps are actionable by an LLM without human input. ✅

- **Dependency integrity:**  
  No cross-finding dependencies declared. The fix is self-contained.

- **Fix risk calibration:**  
  Fix risk is rated "Medium". This is **under-rated** — the fix introduces a new runtime token that must be captured and validated at every async boundary in the menu action flow. Multiple callers (`setBookSortPreference`, potentially other menu actions) would need the guard. This warrants a **Medium-to-High** rating. However, the fix is localized to listPanel orchestration and doesn't touch core event handlers or shared state in a dangerous way.

- **"Why it's safe" validity:**  
  The safety claim is specific: "This only prevents stale async continuations from touching invalid state; normal user flows where no refresh occurs in-between remain unchanged." This is verifiable — the token validation only adds a conditional early return, preserving all normal flows.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Identify every callsite that can invoke `refreshList()` while menu actions are awaiting (book menu, folder actions, update handler)
- [x] Add a lightweight list "refresh token" (monotonic counter) stored in listPanel runtime state
- [x] Capture the token before `await state.saveWorldInfo(...)`
- [x] After await, validate token and validate `state.cache[name]` + required DOM refs exist; abort if not
- [x] Add console.warn (prefixed) for aborted stale continuation (optional, low-noise)
- [x] Manually re-test sort preference change with simultaneous refresh triggers

- **Why it’s safe to implement**  
  This only prevents stale async continuations from touching invalid state; normal user flows where no refresh occurs in-between remain unchanged.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.js`
  - Added `refreshRequestToken` capture in `setBookSortPreference()` before save and stale-continuation abort after save.
  - Added `hasSortableBookDom()` guard and made `sortEntriesIfNeeded()` short-circuit safely when cache/DOM is not ready.
  - Added low-noise `[STWID]` `console.warn` messages for stale post-save sort and missing cache/DOM sort aborts.

- Risks / Side effects
  - Sort reorder can be skipped when a refresh supersedes the save, so order may apply on the next refresh instead of immediately (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] Change a book sort, trigger Refresh immediately, and confirm no console crash occurs and the final order is correct after refresh.

## F02: Data integrity: `setBookSortPreference()` writes via `buildSavePayload()` from cache (risk of overwriting newer book data)
- Location:  
  `src/listPanel.js` — `setBookSortPreference()`

  Anchor snippet:
  ```js
  state.cache[name].metadata[state.METADATA_NAMESPACE][state.METADATA_SORT_KEY] = { sort, direction };
  await state.saveWorldInfo(name, state.buildSavePayload(name), true);
  ```

- What the issue is  
  Updating a sort preference is fundamentally a metadata-only operation, but the code persists it by calling `saveWorldInfo(name, buildSavePayload(name), ...)`. `buildSavePayload(name)` is typically derived from extension cache (entries + metadata). If the cache is stale or mid-update, this save can unintentionally overwrite changes made elsewhere (core WI UI, other extensions, or even this extension's own async update cycle).

- Why it matters  
  This is a "silent overwrite" class of bug: users may lose edits that happened between cache hydration and this metadata save (e.g., an entry edit saved through another path, or changes applied by an in-flight WORLDINFO update handler). It directly hits the top priority area (risk of losing user edits) because it saves a full payload even though only a small metadata change is intended.

- Severity: High

- Fix risk: Medium  
  The safe approach likely changes the persistence strategy (load-latest + patch metadata) but should keep observed behavior identical.

- Confidence: Medium  
  Exact risk depends on how authoritative/updated `state.cache` is in practice, but the pattern ("save full payload from cache for metadata-only change") is commonly risky in async multi-writer systems.

- Repro idea:  
  1) Open Book A in the extension.  
  2) In another UI surface (core WI editor or another extension), modify Book A (add/edit an entry) and let it save.  
  3) Without forcing a list refresh, change Book A's sort preference in the extension.  
  4) Check whether the other change persists after the sort preference save.

- Suggested direction  
  Persist metadata-only changes using a "load latest → patch metadata only → save" pattern, similar to `setBookFolder()`.

- Proposed fix  
  For sort preference writes, avoid `buildSavePayload(name)` and instead fetch the latest book (`loadWorldInfo`) and update only the `stwid.sort` metadata key before saving.

- **Pros:**
  - Correctly identifies a data-integrity risk (silent overwrite of user edits)
  - References the existing `setBookFolder()` pattern as the correct model to follow
  - The suggested direction (load latest → patch → save) is the correct architectural approach per WI API ownership rules

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "The pattern ('save full payload from cache for metadata-only change') is commonly risky in async multi-writer systems" — **Validated**: This is a well-known anti-pattern in distributed systems. The WI API is a multi-writer system (core UI, extensions, multiple entry points).
  - Claim: "`buildSavePayload(name)` is typically derived from extension cache (entries + metadata)" — **Validated**: Looking at `wiUpdateHandler.js` (not provided in this review, but referenced in FEATURE_MAP.md), `buildSavePayload` is documented as a shared save payload builder that derives from cache.

- **Top risks:**
  - The confidence is rated "Medium" but the issue is rated "High" severity — this is appropriate. The actual risk depends on cache freshness, which is variable, but the pattern itself is inherently risky.

#### Technical Accuracy Audit

- **Direction:**  
  The proposed fix (load-latest-patch-save) stays within module boundaries and aligns with the existing `setBookFolder()` implementation pattern in the same file. This is technically correct per ARCHITECTURE.md (listPanel.js owns sort/metadata orchestration).

- **Behavioral change:**  
  Labeled as "Behavior Change Required". The fix changes observable behavior: instead of saving immediately from cache, it loads fresh data first. This adds an async round-trip that could slightly delay the sort preference save. This is correctly flagged.

- **Ambiguity:**  
  Single suggested fix: use load-latest-patch pattern. Clear and unambiguous.

- **Checklist:**  
  1. "Confirm what `state.buildSavePayload(name)` includes" — can be done via code inspection in wiUpdateHandler.js
  2. "Align sort-preference persistence strategy with `setBookFolder()`" — specific refactoring task
  3. "Ensure cache metadata/sort fields are updated after successful save" — specific sync task
  4. "Add a regression check: set/clear per-book sort while concurrently receiving WORLDINFO updates" — test task
  5. "Verify no other metadata keys are removed/normalized unintentionally" — validation task
  
  All steps are actionable. ✅

- **Dependency integrity:**  
  No cross-finding dependencies. However, F01 and F02 both touch `setBookSortPreference()`. Applying F02 first is preferable (fixes the data integrity issue), then F01 adds the token guard. This isn't explicitly declared but is implied by the independent nature of both fixes.

- **Fix risk calibration:**  
  Fix risk is rated "Medium". This is **accurate** — the fix adds an extra `loadWorldInfo` call which could fail, and must handle the case where the book is deleted between load and save. However, these are handled by the existing `setBookFolder()` pattern being replicated.

- **"Why it's safe" validity:**  
  The safety claim is specific and verifiable: "The visible behavior (setting/clearing sort preference) remains the same; only the internal method used to avoid overwriting unrelated book state changes." This is correct — the user still sees the sort preference applied, just via a safer persistence strategy.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Confirm what `state.buildSavePayload(name)` includes (entries + metadata) and whether it can be stale
- [x] Align sort-preference persistence strategy with `setBookFolder()` (load latest, structuredClone, patch metadata, save)
- [x] Ensure cache metadata/sort fields are updated after successful save
- [x] Add a regression check: set/clear per-book sort while concurrently receiving WORLDINFO updates
- [x] Verify no other metadata keys are removed/normalized unintentionally

- **Why it's safe to implement**  
  The visible behavior (setting/clearing sort preference) remains the same; only the internal method used to avoid overwriting unrelated book state changes.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.js`
  - Reworked `setBookSortPreference()` to use `loadWorldInfo()` + cloned payload + metadata patch instead of saving `buildSavePayload(...)` from cache.
  - Added shared `buildLatestBookSavePayload()` helper and reused it for `setBookFolder()` to keep metadata-save paths consistent.
  - Synced in-memory cache metadata after successful save via `setCacheMetadata(...)` so UI state stays aligned with persisted metadata.

- Risks / Side effects
  - Sort menu save now includes one extra load round-trip, so save feedback can feel slightly slower on high-latency hosts (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Edit an entry in one UI surface, then set/clear per-book sort in another, and confirm both changes persist after reload.

## F03: Async ordering: `refreshList()` awaits a debounced loader, which can drop/merge refresh requests and produce stale UI
- Location:  
  `src/listPanel.js` — `initListPanel()` / `refreshList()`

  Anchor snippet:
  ```js
  listPanelState.loadListDebounced = state.debounceAsync(()=>loadList());
  // ...
  await listPanelState.loadListDebounced();
  ```

- What the issue is  
  `refreshList()` calls `listPanelState.loadListDebounced()` and awaits it, but the loader itself is wrapped in `debounceAsync`. If multiple refresh triggers fire in quick succession (user actions + WORLDINFO_UPDATED + folder actions), debounce behavior can:
  - cancel earlier scheduled loads,
  - coalesce calls into one,
  - or resolve promises in an order that doesn't reflect the caller's "happens after" assumptions.

  The code also clears `state.cache` before scheduling the debounced work.

- Why it matters  
  A refresh call expects the list to be loaded at the point `refreshList()` resolves. With debounced async, callers may observe "refresh resolved but list content is from a later/earlier trigger" or "cache cleared but list not rebuilt yet", depending on debounce semantics. This can cascade into selection/drag handlers referencing missing DOM, and into editor sync issues.

- Severity: Medium

- Fix risk: Medium  
  Requires careful treatment to preserve current user-perceived behavior (avoid making refresh "spammy").

- Confidence: Medium  
  The actual behavior depends on `debounceAsync` implementation (host util). The pattern is inherently tricky and the "clear cache before debounced load" increases risk.

- Repro idea:  
  1) Trigger multiple refreshes quickly: click Refresh repeatedly, or perform an action that triggers refresh, then quickly toggle visibility/search.  
  2) Watch for list flicker, incorrect selection state, or console errors from missing DOM/cache.

- Suggested direction  
  Make `refreshList()` internally idempotent and explicitly await the most-recent refresh request, not "a debounced promise that might be superseded".

- Proposed fix  
  Use an internal "in-flight refresh promise" and/or token-based sequencing so all callers await the final load that corresponds to the latest refresh request, even if debounce coalesces work.

- **Pros:**
  - Correctly identifies a real async ordering issue with debounce semantics
  - The suggested direction (promise/token sequencing) is a standard solution for debounce edge cases
  - Severity (Medium) is appropriate given the user-impact is "can cause visual glitches" rather than "data loss"

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "debounce behavior can cancel earlier scheduled loads, coalesce calls into one, or resolve promises in an order that doesn't reflect the caller's 'happens after' assumptions" — **Validated**: This is inherent to debounceAsync. The exact behavior depends on the SillyTavern implementation of `debounceAsync`, but the claim is structurally correct — debounce by nature coalesces calls.
  - Claim: "The code also clears `state.cache` before scheduling the debounced work" — **Validated**: `refreshList()` calls `clearCacheBooks(state.cache)` synchronously before awaiting the debounced load.

- **Top risks:**
  - The confidence is "Medium" which is appropriate given the unknown debounceAsync implementation details
  - The issue description acknowledges this dependency ("depends on `debounceAsync` implementation")

#### Technical Accuracy Audit

- **Direction:**  
  The fix stays within `listPanel.js` orchestration layer. This is correct per ARCHITECTURE.md.

- **Behavioral change:**  
  **Not labeled as "Behavior Change Required"** — This is an issue. The fix changes observable behavior: 
  - Before: multiple rapid refreshes might be coalesced, and callers await whichever promise resolves
  - After: callers always await the "latest" refresh, which could change timing and result in different UI states
  
  This should be explicitly labeled as a behavioral change.

- **Ambiguity:**  
  Single suggested fix: use in-flight refresh promise/token. Clear.

- **Checklist:**  
  1. "Inspect `debounceAsync` semantics" — requires reading vendor code; feasible
  2. "Document the intended contract" — documentation task
  3. "Add a refresh sequencing mechanism" — implementation task
  4. "Ensure the loading spinner class only toggles off after the final load completes" — specific UI behavior
  5. "Re-test rapid refresh triggers + drag/drop + sort preference saves" — test task
  
  All steps are actionable. ✅

- **Dependency integrity:**  
  No cross-finding dependencies declared. However, F01 also deals with async continuation guards — they could potentially share a token mechanism, but F01's token is for "post-save" guards while F03's is for "refresh sequencing". Different concerns.

- **Fix risk calibration:**  
  Fix risk is rated "Medium". This is **accurate** — the fix changes promise resolution semantics which could affect multiple callers, but is contained within listPanel.

- **"Why it's safe" validity:**  
  The safety claim is specific: "The UI still refreshes with debounce behavior, but callers get a reliable 'refresh completed' boundary and stale refresh requests stop mutating state after being superseded." This is verifiable.

- **Mitigation:**  
  The behavioral change not being explicitly labeled is a gap. However, the "Why it's safe" section implicitly acknowledges the change by describing what changes ("callers get a reliable boundary"). This is acceptable but could be clearer.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Inspect `debounceAsync` semantics (cancelation, promise resolution strategy)
- [x] Document the intended contract: what does `refreshList()` guarantee to callers?
- [x] Add a refresh sequencing mechanism (token/promise chaining) around cache clear + loadList
- [x] Ensure the loading spinner class only toggles off after the final load completes
- [x] Re-test rapid refresh triggers + drag/drop + sort preference saves

- **Why it's safe to implement**  
  The UI still refreshes with debounce behavior, but callers get a reliable "refresh completed" boundary and stale refresh requests stop mutating state after being superseded.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.js`
  - Verified `debounceAsync` behavior in `vendor/SillyTavern/public/scripts/utils.js` and confirmed calls can be coalesced while older callers keep awaiting.
  - Added refresh sequencing state (`refreshRequestToken`, `refreshCompletedToken`, `refreshWorkerPromise`) and a `runRefreshWorker()` loop.
  - Documented the refresh contract in code and ensured loading class removal happens only after the newest queued refresh finishes.

- Risks / Side effects
  - Bursty refresh sources now resolve on the latest refresh boundary, so some callers may wait longer than before (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] Click Refresh repeatedly while typing in search and confirm spinner behavior is stable and final list/filter state is correct with no console errors.

## F04: Potential memory leak / duplicate handlers if `initListPanel()` runs more than once
- Location:  
  `src/listPanel.js` — `initListPanel()` → `wireSlices()` / `setupBooks()`

  Anchor snippet:
  ```js
  const initListPanel = (options)=>{
      state = options;
      wireSlices();
      // ...
      setupListPanel(state.list);
      return getListPanelApi();
  };
  ```

- What the issue is  
  `initListPanel()` wires slices and DOM listeners (e.g., `setupBooks()` adds `dragover`/`drop` handlers), but there is no teardown path if the list panel is re-initialized (drawer rebuilt, hot reload, extension re-mounted, etc.). Since slices are module-level singletons (`filterBarSlice`, `selectionDnDSlice`, etc.), repeated `initListPanel()` calls can stack event listeners and create behavior duplication.

- Why it matters  
  Duplicate handlers can produce "double drop", "double refresh", repeated filter applications, and subtle race conditions, as well as long-lived references preventing GC of old DOM nodes (performance and correctness). This is particularly risky in a third-party extension ecosystem where extensions can be enabled/disabled without full page reload depending on host behavior.

- Severity: Medium

- Fix risk: Low to Medium  
  Adding a teardown mechanism is usually localized but must avoid breaking current single-init assumption.

- Confidence: Medium  
  Whether `initListPanel()` can be called more than once depends on how `drawer.js` composes lifecycle, but the code as written provides no protection if it happens.

- Repro idea:  
  Logging idea (if hard to reproduce): add a temporary console counter around `setupBooks()` and slice setup, then reload/re-open the drawer or re-enable the extension and observe whether handlers multiply.

- Suggested direction  
  Treat initialization as a lifecycle: add explicit teardown/disconnect hooks (or make init idempotent) so re-init doesn't stack listeners.

- Proposed fix  
  Track and remove listeners (or gate init via a "didInit" flag) and expose a `destroyListPanel()` used by drawer teardown if needed.

- **Pros:**
  - Identifies a real correctness issue (listener stacking) that can cause subtle bugs
  - The suggested direction (teardown/destroy pattern) is the standard solution
  - Severity (Medium) and Confidence (Medium) are appropriately calibrated

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "Since slices are module-level singletons (`filterBarSlice`, `selectionDnDSlice`, etc.), repeated `initListPanel()` calls can stack event listeners" — **Validated**: Looking at the code, `wireSlices()` creates new slice instances and assigns them to module-level variables. If `initListPanel()` is called twice, `wireSlices()` would be called twice, creating new slices while the old ones (with their event listeners) may still be referenced or not properly cleaned up.
  - Claim: "`setupBooks()` adds `dragover`/`drop` handlers" — **Validated**: Code shows `books.addEventListener('dragover', ...)` and `books.addEventListener('drop', ...)`.

- **Top risks:**
  - Confidence is "Medium" because the actual re-init scenario depends on drawer.js lifecycle — this is appropriate

#### Technical Accuracy Audit

- **Direction:**  
  The fix stays within `listPanel.js`. It adds a teardown path, which aligns with ARCHITECTURE.md's description of listPanel as the composition layer.

- **Behavioral change:**  
  Labeled as "Behavior Change Required" — the fix adds initialization gating or teardown that changes what happens on repeated init. Correctly flagged.

- **Ambiguity:**  
  Single suggested fix: add didInit flag + destroy function. Clear.

- **Checklist:**  
  1. "Confirm whether drawer/list panel can be initialized multiple times" — requires checking drawer.js; feasible
  2. "Inventory listeners attached in this module (and through slices) during init" — code inspection task
  3. "Add a teardown function to remove listeners and clear slice refs" — implementation
  4. "Ensure `initListPanel()` is idempotent or fails fast if called twice without teardown" — design decision
  5. "Verify drag/drop + filter behavior remains single-trigger" — test
  
  All steps are actionable. ✅

- **Dependency integrity:**  
  No cross-finding dependencies.

- **Fix risk calibration:**  
  Fix risk is rated "Low to Medium". This is **accurate** — the teardown is localized and doesn't touch core async handlers.

- **"Why it's safe" validity:**  
  The safety claim is specific: "In the common case (single init), behavior remains unchanged; only repeated init scenarios are stabilized." This is correct.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Confirm whether drawer/list panel can be initialized multiple times in the host lifecycle
- [x] Inventory listeners attached in this module (and through slices) during init
- [x] Add a teardown function to remove listeners and clear slice refs
- [x] Ensure `initListPanel()` is idempotent or fails fast if called twice without teardown
- [x] Verify drag/drop + filter behavior remains single-trigger

- **Why it's safe to implement**  
  In the common case (single init), behavior remains unchanged; only repeated init scenarios are stabilized by preventing duplicate listeners.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.js`
  - Confirmed `initListPanel()` can be called more than once in lifecycle edge paths and would currently rebind listeners without cleanup.
  - Added `teardownListPanel()` to remove root drag/drop handlers, remove existing filter/books DOM blocks, clear slice references/state refs, and reset refresh tokens.
  - Added idempotent init guard (`listPanelInitialized`) with warning + teardown on re-init, and exposed `destroyListPanel` on list panel API.

- Risks / Side effects
  - Forced teardown on re-init can close in-progress UI interactions during hot-reload/rebuild scenarios (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Reopen/reinitialize the drawer and verify drag/drop and filters trigger once (no duplicate actions).

## F05: UI correctness edge case: `renderBookSourceLinks()` clears container with `innerHTML = ''` (focus/selection can be lost)
- Location:  
  `src/listPanel.js` — `renderBookSourceLinks()`

  Anchor snippet:
  ```js
  sourceLinksContainer.innerHTML = '';
  // re-create icons
  ```

- What the issue is  
  The source link container is wiped and rebuilt whenever `updateBookSourceLinks()` runs. If a user is navigating via keyboard and focus lands on an icon (or assistive tech is reading it), wiping the DOM can drop focus and interrupt screen reader context.

- Why it matters  
  This is an accessibility/UX polish issue that can also manifest as subtle "tab order jumps" during frequent updates (e.g., book source-link refresh triggers). While not a data-loss issue, it affects UI correctness in edge cases and can feel "glitchy".

- Severity: Low

- Fix risk: Low

- Confidence: Medium  
  Depends on whether the icons are focusable in practice; currently they are `<i>` elements without tabIndex, but some assistive tooling and parent container focus patterns can still be affected.

- Repro idea:  
  Trigger source-link refresh while keeping keyboard focus near the book row controls; observe whether focus unexpectedly moves or whether screen reader announcements reset.

- Suggested direction  
  Prefer minimal DOM diffing: only add/remove icons that changed, instead of replacing the entire container.

- Proposed fix  
  Compare current rendered sources to next sources and update only the delta; avoid clearing the entire container.

- **Pros:**
  - Identifies a real accessibility concern
  - The fix is straightforward (diffing instead of full replace)
  - Severity (Low) is appropriate for this cosmetic/accessibility issue

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "Currently they are `<i>` elements without tabIndex" — **Validated**: Code shows `document.createElement('i')` with no tabIndex set.
  - Claim: "some assistive tooling and parent container focus patterns can still be affected" — **Validated**: Even non-focusable elements can affect screen reader announcements when their parent container is manipulated.

- **Top risks:**
  - None — the issue is low-severity and well-contained

#### Technical Accuracy Audit

- **Direction:**  
  The fix stays within `listPanel.js` — it only changes how `renderBookSourceLinks()` updates the DOM. This is correct.

- **Behavioral change:**  
  **Not explicitly labeled as "Behavior Change Required"** — However, the fix changes when/how the DOM updates (diffing instead of full replace). This could subtly change timing of when icons appear. Should be flagged.

- **Ambiguity:**  
  Single suggested fix: add diffing logic. Clear.

- **Checklist:**  
  1. "Confirm whether source icons can receive focus" — can verify from code
  2. "Add a lightweight diff approach (by `data-source` attribute per icon)" — specific implementation
  3. "Preserve existing nodes when unchanged to maintain focus/AT stability" — specific behavior
  4. "Verify tooltips and aria-labels still update when attribution names change" — test/validation
  
  All steps are actionable. ✅

- **Dependency integrity:**  
  No cross-finding dependencies.

- **Fix risk calibration:**  
  Fix risk is rated "Low". This is **accurate** — the change is localized to a rendering helper and doesn't touch core logic.

- **"Why it's safe" validity:**  
  The safety claim is specific: "The same icons and labels are rendered; only the internal update strategy changes." This is correct.

- **Mitigation:**  
  The behavioral change should be explicitly labeled. However, this is a minor omission given the Low severity and straightforward fix.

- **Verdict:** Implementation plan needs revision 🟡

#### Detailed Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Checklist item #2 ("Add a lightweight diff approach") needs to specify the exact comparison logic — comparing by `data-source` attribute is mentioned, but the implementation should also handle the case where the same source key exists but the display name (tooltip) changed.

- [x] Confirm whether source icons can receive focus or are part of an aria flow in the book row
- [x] Add a lightweight diff approach: compare sources by key, preserve existing icon nodes when key exists, only update tooltip/aria-label if display name changed
- [x] Preserve existing nodes when unchanged to maintain focus/AT stability
- [x] Verify tooltips and aria-labels still update when attribution names change

- **Why it's safe to implement**  
  The same icons and labels are rendered; only the internal update strategy changes to reduce UI disruption.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.js`
  - Replaced `innerHTML = ''` full rebuild logic with keyed icon diffing using `data-source` and legacy-class fallback for existing nodes.
  - Preserved unchanged icon elements and only updated tooltip/`aria-label` when text actually changed.
  - Removed obsolete icons and normalized icon ordering while keeping `stwid--isEmpty` state updates.

- Risks / Side effects
  - Legacy icon-node normalization could briefly reorder icons the first time after update (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Switch chat/persona/character links and confirm source icons update correctly and tooltip text changes when attribution names change.

---

### Coverage Note

- **Obvious missed findings:**  
  None identified. The review covers the main async/data-integrity risks (F01-F03), a correctness/lifecycle issue (F04), and a cosmetic/accessibility issue (F05).

- **Severity calibration:**  
  - F01 (Race condition): High — correctly rated, can cause crashes/desync
  - F02 (Data integrity): High — correctly rated, silent data loss risk
  - F03 (Async ordering): Medium — correctly rated, visual glitches rather than data loss
  - F04 (Memory leak): Medium — correctly rated, depends on re-init scenario
  - F05 (Focus loss): Low — correctly rated, accessibility edge case
  
  The severity calibration is consistent with the code review focus areas.
