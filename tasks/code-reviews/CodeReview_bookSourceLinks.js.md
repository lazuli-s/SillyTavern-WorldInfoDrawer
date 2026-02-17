# CODE REVIEW FINDINGS: `src/bookSourceLinks.js`

*Reviewed: February 15, 2026*

## Scope

- **File reviewed:** `src/bookSourceLinks.js`
- **Helper files consulted:** none
- **Skills applied:** `st-js-best-practices` / `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** Book source-link detection (character/chat/persona), attribution metadata (character/persona names), refresh triggers; reapply list visibility filters after source-link refresh; subscribe to context-change events and lorebook-selector DOM changes

---

## F01: `cleanup()` does not unsubscribe `eventSource` listeners (leak / duplicate refresh on re-init)

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When this feature is initialized, it subscribes to several SillyTavern events. If the feature is later re-initialized (for example due to extension reload, hot reload, or re-adding the drawer), those old subscriptions are not removed. This causes the same “refresh source links” work to run multiple times for every event, which can slow down the UI and create confusing behavior.

- **Location:**
  `src/bookSourceLinks.js` — `initBookSourceLinks(...)`
  ```js
  eventSource.on(eventType, ()=>refreshBookSourceLinks(eventType));
  ...
  return { cleanup: ()=>{ document.removeEventListener('change', onSourceSelectorChange); } };
  ```

- **Detailed Finding:**
  `initBookSourceLinks` registers:
  - five `eventSource.on(...)` handlers for `CHAT_CHANGED`, `GROUP_UPDATED`, `CHARACTER_EDITED`, `CHARACTER_PAGE_LOADED`, `SETTINGS_UPDATED`
  - one `document.addEventListener('change', onSourceSelectorChange)`

  However, the returned `cleanup()` only removes the `document` listener and does not remove the `eventSource` listeners. Per `st-js-best-practices` PERF-02 (“Clean up event listeners”), this is a memory/performance footgun: each additional initialization adds more listeners, and they will all fire forever.

  This also interacts with `refreshBookSourceLinks` doing work like building the full `linksByBook` map and calling into `listPanelApi.updateAllBookSourceLinks` and `applyActiveFilter`, multiplying that cost with each leaked listener.

- **Why it matters:**
  - Progressive performance degradation over time (extra work on every chat/character/settings event).
  - Hard-to-debug “why is this running twice?” behavior.
  - Increased risk of accidental re-entrancy/race issues when multiple refreshes run back-to-back.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** Performance

- **Reproducing the issue:**
  1. Load/initialize the extension UI.
  2. Re-initialize the drawer/extension module without a full page refresh (e.g., dev hot reload / re-registering the UI).
  3. Switch chats or edit a character.
  4. Observe repeated `console.debug(SOURCE_ICON_LOG_PREFIX, ...)` logs and/or repeated UI refresh work.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Keep references to the exact handler functions used with `eventSource.on`, then remove them in `cleanup()` using `eventSource.removeListener`.

- **Proposed fix:**
  - In `initBookSourceLinks`, define a stable handler function per event (or one shared handler that accepts the event type via closure).
  - Store `{ eventType, handler }` pairs in an array (e.g., `const eventSubscriptions = []`).
  - When registering, push the pairs and call `eventSource.on(eventType, handler)`.
  - In `cleanup()`, iterate that array and call `eventSource.removeListener(eventType, handler)` for each, then clear the array.

- **Implementation Checklist:**
  - [x] Introduce a local `eventSubscriptions` array in `initBookSourceLinks`.
  - [x] Replace inline `()=>refreshBookSourceLinks(eventType)` with named handler functions stored in `eventSubscriptions`.
  - [x] Extend `cleanup()` to remove each `eventSource` listener via `removeListener`.
  - [x] Leave the `document` listener removal in place.

- **Fix risk:** Low 🟢
  The change is localized to teardown behavior; it should not affect normal runtime behavior when initialized once.

- **Why it's safe to implement:**
  Does not change how links are computed or applied; only prevents duplicated work on subsequent initializations.

- **Pros:**
  Prevents listener leaks, duplicated refreshes, and long-session performance degradation.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The file registers 5 `eventSource.on(...)` handlers using inline arrow functions.
  - `cleanup()` only removes the `document` `"change"` listener and does not call `eventSource.removeListener(...)`.
  - `refreshBookSourceLinks()` is non-trivial (rebuild map, update list panel, reapply filter), so duplicated listeners multiply that work.

- **Top risks:**
  - The review assumes a re-init lifecycle exists (hot reload / module re-run). Even if re-init is rare in production, leaks still matter for dev workflows and any future re-mount behavior.
  - If the implementation uses *new* functions when removing listeners (instead of the exact same references used in `.on(...)`), removal will silently fail.

#### Technical Accuracy Audit

> *Quoted claim:* “those old subscriptions are not removed… causes the same refresh work to run multiple times”

- **Why it may be wrong/speculative:**
  The only speculative part is *whether* re-init happens in real sessions. The code-level claim (no unsubscribe) is not speculative.

- **Validation:** Validated ✅
  - Confirmed in `src/bookSourceLinks.js`: listeners are added in a loop with `eventSource.on(eventType, ()=>refreshBookSourceLinks(eventType))`, and `cleanup()` does not remove them.

#### Fix Quality Audit

- **Direction:**
  Sound and within module responsibility (`bookSourceLinks.js` owns its subscriptions and teardown).

- **Behavioral change:**
  None intended for single-init runtime; it only affects behavior under re-init/teardown scenarios.

- **Ambiguity:**
  Single clear approach (store handler refs and remove them). Good.

- **Proportionality:**
  Proportionate for Medium/High.

- **Checklist:**
  Actionable and LLM-executable.

- **Dependency integrity:**
  No cross-finding dependency required.

- **Fix risk calibration:**
  “Low” is acceptable; it touches only teardown wiring, but it is still easy to get wrong if handler references aren’t preserved.

- **"Why it's safe" validity:**
  Specific and verifiable (doesn’t touch computation, only prevents duplicates).

- **Verdict:** Ready to implement 🟢


### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/bookSourceLinks.js`
  - Added `eventSubscriptions` storage and stable per-event handler references during event bus registration.
  - Extended `cleanup()` to remove all registered `eventSource` listeners and clear subscription state.
  - Kept existing document change-listener teardown in place.

- Risks / Side effects
  - If another module depends on leaked duplicate listeners, that accidental behavior will stop (probability: ?)
      - **?? MANUAL CHECK**: [ ] Reopen/reinitialize the drawer extension, then switch chats/characters and confirm source-link refresh logs/events fire once per action (not duplicates).
---

## F02: `getBookSourceLinks()` fallback returns a different object shape than normal entries

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Sometimes this function returns a “short” object that is missing fields. Other parts of the UI may expect those fields to exist, which can cause missing labels/tooltips or even errors if the UI tries to read properties that aren’t there.

- **Location:**
  `src/bookSourceLinks.js` — return API
  ```js
  const EMPTY_BOOK_SOURCE_LINKS = Object.freeze({ character: false, chat: false, persona: false });

  return {
      getBookSourceLinks: (name)=>lorebookSourceLinks[name] ?? EMPTY_BOOK_SOURCE_LINKS,
  };
  ```

- **Detailed Finding:**
  `buildLorebookSourceLinks()` creates entries with the shape:
  ```ts
  {
    character: boolean,
    chat: boolean,
    persona: boolean,
    characterNames: string[],
    personaName: string,
  }
  ```
  But `getBookSourceLinks(name)` can return `EMPTY_BOOK_SOURCE_LINKS`, which lacks `characterNames` and `personaName`. This violates the function’s implied contract: callers must now handle two shapes.

  This is a data-integrity/correctness issue at module boundaries: any downstream code that does something like `links.characterNames.length` will throw when the fallback object is returned.

- **Why it matters:**
  - Potential runtime exceptions when rendering source-link attribution (tooltips/aria labels).
  - Silent UI regressions where names/tooltips disappear for some rows.
  - Increased “defensive coding” burden across the codebase.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** UI Correctness

- **Reproducing the issue:**
  N/A (depends on how `getBookSourceLinks` is consumed). The mismatch is observable from code alone.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Ensure the fallback object has the same shape as all normal entries, with empty arrays/strings for attribution fields.

- **Proposed fix:**
  - Replace `EMPTY_BOOK_SOURCE_LINKS` with a “full-shape” frozen object, e.g.:
    - `characterNames: []`
    - `personaName: ''`
  - Ensure `buildLorebookSourceLinks` spreads from this full-shape object (still OK) and `getBookSourceLinks` falls back to it.

- **Implementation Checklist:**
  - [x] Update `EMPTY_BOOK_SOURCE_LINKS` to include `characterNames: []` and `personaName: '`.
  - [x] Confirm `buildLorebookSourceLinks` still initializes each book entry with the correct default arrays/strings.
  - [x] Keep `Object.freeze` to prevent accidental mutation of the shared default.

- **Fix risk:** Low 🟢
  This only adds missing properties; it does not remove or rename anything.

- **Why it's safe to implement:**
  Any existing callers already handling the “full” shape continue to work; callers that accidentally relied on the missing fields being absent are unlikely and would be non-sensical.

- **Pros:**
  Safer API contract, fewer downstream null checks, fewer UI edge-case bugs.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `getBookSourceLinks()` can return `EMPTY_BOOK_SOURCE_LINKS`, which lacks `characterNames`/`personaName`.
  - `buildLorebookSourceLinks()` produces a richer per-book shape including those fields.

- **Top risks:**
  - The impact claim (“will throw when fallback is returned”) is overstated unless there is a known caller that dereferences `characterNames` without guards.
  - Severity may be miscalibrated if the only current callers normalize/guard missing fields.

#### Technical Accuracy Audit

> *Quoted claim:* “any downstream code that does something like `links.characterNames.length` will throw when the fallback object is returned.”

- **Why it may be wrong/speculative:**
  The codebase can defensively normalize `links` (optional chaining + `Array.isArray`) before use, which prevents throws even if the fallback is “short”.

- **Validation:** Validated ✅ (shape mismatch) / Needs extensive analysis ❌ (impact)
  - Shape mismatch: validated by inspecting `src/bookSourceLinks.js`.
  - “Will throw” impact: not universally true; in `src/listPanel.js` the code uses optional chaining + `Array.isArray(links?.characterNames)` and `typeof links?.personaName === 'string'`, so it will *not* throw from this path.

- **What needs to be done/inspected to successfully validate:**
  - Search for other consumers of `getBookSourceLinks()` that do direct `.characterNames.length` or `.personaName.trim()` access without guards.

#### Fix Quality Audit

- **Direction:**
  Sound; it tightens the module’s public contract without moving responsibility.

- **Behavioral change:**
  None meaningful; only makes missing fields present with empty defaults.

- **Ambiguity:**
  Single clear recommendation.

- **Proportionality:**
  Fix is small; severity likely should be downgraded (probably Low) but the fix is still worthwhile.

- **Checklist:**
  Actionable.

- **Fix risk calibration:**
  “Low” is correct.

- **"Why it's safe" validity:**
  Mostly valid; the “callers relying on fields missing” statement is speculative but low likelihood.

- **Verdict:** Implementation plan needs revision 🟡
  The fix is fine, but the finding’s impact/severity rationale should be corrected to match actual caller behavior (no-throw due to normalization), and the validation step should explicitly confirm other call sites.


### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/bookSourceLinks.js`
  - Expanded `EMPTY_BOOK_SOURCE_LINKS` to the full shape (`character/chat/persona/characterNames/personaName`) and kept it frozen.
  - Preserved per-book initialization with fresh arrays/strings so mutable fields are not shared across books.
  - Validated current call sites (`src/listPanel.js`, `src/listPanel.filterBar.js`) already normalize fields; this change hardens the API contract without behavior regressions.

- Risks / Side effects
  - Fallback object now contains extra empty fields, which should only improve caller safety (probability: ?)
      - **?? MANUAL CHECK**: [ ] Open the book list with mixed source-linked and unlinked books and confirm source icons/tooltips render without missing text or errors.
---

## F03: Signature computation uses full `JSON.stringify(nextLinks)` (unnecessary churn + ordering sensitivity)

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  To decide whether anything changed, the code converts the entire “links for every book” object into a giant text string and compares it to the previous one. This can be slow and can also think something changed when only the order of items changed, even if the actual meaning stayed the same.

- **Location:**
  `src/bookSourceLinks.js` — `refreshBookSourceLinks`
  ```js
  const signature = JSON.stringify(nextLinks);
  if (signature === lorebookSourceLinksSignature) return false;
  ```

- **Detailed Finding:**
  `refreshBookSourceLinks` re-builds `linksByBook` and then computes `JSON.stringify(nextLinks)` to detect changes. Issues:
  1. **Performance churn:** This serializes the full object, including an entry for every lorebook name (`world_names`), even though most refreshes likely touch only a small subset.
  2. **Ordering sensitivity:** `characterNames` is derived from a `Set` (`characterNameSet`) and spread to an array (`[...characterNameSet]`). If insertion order changes (e.g., group members enumeration order changes, or character matching yields a different insertion sequence), `JSON.stringify` will treat it as a change even when the set contents are identical.
  3. **Coupling to representation:** Any future addition of non-semantic fields to the link objects will start triggering refreshes.

  This finding is also adjacent to earlier repo-wide findings about `JSON.stringify` comparisons being used in hot paths (see tracker patterns); while this file may not be the hottest path, it is still triggered by frequent events like `SETTINGS_UPDATED`.

- **Why it matters:**
  - Unnecessary work on frequent events can add input latency or contribute to UI jank.
  - Can cause extra list-panel refresh/update work even when nothing meaningful changed.

- **Severity:** Low ⭕
- **Confidence:** Medium 🤔
  Whether this is user-visible depends on `world_names` size and how often these events fire in real sessions.

- **Category:** Performance

- **Reproducing the issue:**
  N/A (performance characteristics depend on collection size and event frequency).

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Keep change-detection, but compute a stable, minimal signature that ignores non-semantic ordering.

- **Proposed fix:**
  - Replace `JSON.stringify(nextLinks)` with a stable signature builder that:
    - Iterates books in a stable order (e.g., `Object.keys(nextLinks).sort()`).
    - For each book, includes only the fields that affect rendering (`character`, `chat`, `persona`, `personaName`, and a sorted `characterNames`).
  - Build the signature as a simple concatenated string (or array joined with delimiters) to avoid deep serialization overhead.

- **Implementation Checklist:**
  - [x] Add a helper inside `initBookSourceLinks` like `buildSourceLinksSignature(linksByBook)`.
  - [x] In that helper, sort book keys and sort `characterNames` before including them.
  - [x] Update `refreshBookSourceLinks` to call the helper instead of `JSON.stringify`.
  - [x] Keep the current early-return behavior unchanged (only signature computation changes).

- **Fix risk:** Medium 🟡
  If the signature omits a field that actually affects UI, the UI may fail to update when it should. This is avoidable by explicitly including all render-relevant fields.

- **Why it's safe to implement:**
  Only affects the “should we refresh?” decision; it does not change how links are computed, only when `updateAllBookSourceLinks` runs.

- **Pros:**
  More stable refresh behavior, fewer redundant updates, reduced CPU work on frequent events.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The code uses `JSON.stringify(nextLinks)` on every refresh attempt and compares it to a prior signature.
  - `characterNames` is populated from a `Set` via `[...characterNameSet]`, which preserves insertion order (not automatically sorted).

- **Top risks:**
  - “Unnecessary churn” is plausible but not evidenced (no measurement; event frequency and `world_names` size varies widely).
  - The proposed signature refactor is more complex than necessary for a Low-severity finding and can introduce stale-UI bugs if a field is missed.

#### Technical Accuracy Audit

> *Quoted claim:* “`JSON.stringify` will treat it as a change even when the set contents are identical.”

- **Why it may be wrong/speculative:**
  This is only true if insertion order changes between refreshes. In this file, `linksByBook` keys are inserted by iterating `world_names`, which is likely stable; the most likely instability is `characterNames` insertion order (group member ordering / character matching ordering).

- **Validation:** Needs extensive analysis ❌
  - The code path that would reorder `characterNames` across identical semantic inputs depends on upstream ordering guarantees (`groups`, `members`, `characters` arrays). Without runtime evidence or known ordering instability, this remains plausible but unproven.

- **What needs to be done/inspected to successfully validate:**
  - Confirm whether `groups.find(...).members` ordering is stable across the events that trigger refresh.
  - Confirm whether `characters.find(...)` selection can vary (e.g., name/avatar collisions).
  - Instrument a session with a large number of books and frequent events to see if signature changes occur without meaningful UI changes.

#### Fix Quality Audit

- **Direction:**
  Generally sound, but the proposal is over-scoped for the actual instability source.

- **Behavioral change:**
  Potentially yes: change-detection logic affects when UI updates. This is a subtle behavior change and should be treated carefully.

- **Ambiguity:**
  Single approach, but not minimal.

- **Proportionality:**
  For a Low/Medium-confidence finding, a smaller stabilization is preferable (e.g., sort `characterNames` before signing; keep existing JSON stringify).

- **Checklist:**
  Actionable, but should explicitly state “include all render-relevant fields” and define them (to avoid omissions).

- **Fix risk calibration:**
  Medium is correct (change-detection bugs can lead to stale icons/tooltip attribution).

- **"Why it's safe" validity:**
  Partially valid but underplays the risk of stale UI if the signature is incomplete.

- **Verdict:** Implementation plan needs revision 🟡
  Revise toward a minimal change (canonicalize `characterNames` ordering and/or canonicalize only the unstable parts) and add a crisp definition of “render-relevant fields” if a custom signature is kept.


### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/bookSourceLinks.js`
  - Added `buildSourceLinksSignature(linksByBook)` to compute a canonical signature from sorted book keys and sorted character-name lists.
  - Updated refresh change-detection to use the canonical signature instead of raw `JSON.stringify(nextLinks)`.
  - Kept refresh early-return behavior unchanged and also sorted emitted `characterNames` arrays for deterministic ordering.

- Risks / Side effects
  - Canonicalization may reduce some previously-triggered refreshes caused only by order differences (probability: ?)
      - **?? MANUAL CHECK**: [ ] Trigger multiple source-link refresh events (chat switch, character edit, settings update) and confirm icons/tooltips still refresh when real source links change.
---

## F04: Direct imports from internal ST modules increase upstream breakage risk (prefer `getContext()` where possible)

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  This file pulls several pieces of SillyTavern data directly from internal files. If SillyTavern changes how those internal files are organized, this extension can break. SillyTavern provides a “context” API meant to be the safer way for extensions to access most of this data.

- **Location:**
  `src/bookSourceLinks.js` — top-of-file imports
  ```js
  import { chat_metadata, characters, event_types, eventSource, name1, this_chid } from '../../../../../script.js';
  import { groups, selected_group } from '../../../../group-chats.js';
  import { power_user } from '../../../../power-user.js';
  ...
  import { METADATA_KEY, world_info, world_names } from '../../../../world-info.js';
  ```

- **Detailed Finding:**
  `st-js-best-practices` COMPAT-01 recommends using `SillyTavern.getContext()` instead of importing from internal ST modules like `script.js`, `group-chats.js`, `power-user.js`. This reduces risk of upstream refactors breaking the extension.

  In this file, many of the imported values exist in `st-context.js` as stable `getContext()` fields:
  - `chatMetadata` (instead of `chat_metadata`)
  - `characters`
  - `eventSource`
  - `eventTypes` (instead of `event_types`)
  - `name1`
  - `characterId` (instead of `this_chid`)
  - `groups`
  - `groupId` (instead of `selected_group`)
  - `powerUserSettings` (instead of `power_user`)

  Some imports are still likely necessary as direct imports because `getContext()` does not expose them (e.g., `METADATA_KEY`, `world_names`, `world_info`, `getCharaFilename`). This is acceptable under the COMPAT-01 exception, but it should be minimized and explicitly justified.

- **Why it matters:**
  - Reduced maintenance burden when SillyTavern updates.
  - Fewer “extension broke after update” incidents caused by internal module changes.

- **Severity:** Low ⭕
- **Confidence:** High 😀
- **Category:** JS Best Practice

- **Reproducing the issue:**
  N/A (this is an upgrade/compatibility risk rather than a deterministic runtime bug).

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Replace only the imports that are already provided by `SillyTavern.getContext()`, leaving the unavoidable direct imports in place.

- **Proposed fix:**
  - Remove the direct imports from `script.js`, `group-chats.js`, and `power-user.js`.
  - At the start of `initBookSourceLinks`, call `const ctx = SillyTavern.getContext();` and use:
    - `ctx.chatMetadata`, `ctx.characters`, `ctx.eventSource`, `ctx.eventTypes`, `ctx.name1`, `ctx.characterId`, `ctx.groups`, `ctx.groupId`, `ctx.powerUserSettings`
  - Keep direct imports for `METADATA_KEY`, `world_info`, and `world_names` (unless there is an already-available context accessor), and keep `getCharaFilename` as-is.

- **Implementation Checklist:**
  - [x] Replace `script.js` imports with `const { ... } = SillyTavern.getContext()` destructuring (or `ctx.*`).
  - [x] Replace `groups/selected_group` usage with `ctx.groups` / `ctx.groupId`.
  - [x] Replace `power_user` usage with `ctx.powerUserSettings`.
  - [x] Keep remaining direct imports only for values not exposed via context, and add a brief inline comment explaining the exception.
  - [x] Avoid behavior changes: preserve the existing logic and only change data access paths.

- **Fix risk:** Medium 🟡
  Risk is primarily compatibility: context field names differ (`eventTypes` vs `event_types`, etc.), and older ST versions may not provide some fields.

- **Why it's safe to implement:**
  When context is available and correctly mapped, the values are the same as the direct imports; the logic of source-link computation is unchanged.

- **Pros:**
  Improved resilience to upstream refactors; reduces brittle imports.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The file currently imports from ST internal modules (`script.js`, `group-chats.js`, `power-user.js`).
  - `vendor/SillyTavern/public/scripts/st-context.js` exposes `getContext()` including: `chatMetadata`, `characters`, `eventSource`, `eventTypes`, `name1`, `characterId`, `groups`, `groupId`, `powerUserSettings`.

- **Top risks:**
  - This is a refactor-only/compat finding; it can be deprioritized behind correctness/data-loss issues.
  - Compatibility across ST versions: relying on `SillyTavern.getContext()` assumes the host provides the global + fields; the current direct-import approach may be the project-wide chosen compatibility strategy.
  - Mixing approaches across modules can introduce inconsistency unless scoped and documented.

#### Technical Accuracy Audit

> *Quoted claim:* “many of the imported values exist in `st-context.js` as stable `getContext()` fields…”

- **Why it may be wrong/speculative:**
  If `getContext()` or certain fields were added recently, older ST versions may not have them (upgrade surface risk). The existence claim in current vendor code is true; the “stable” claim across versions is not proven here.

- **Validation:** Validated ✅ (current vendor) / Needs extensive analysis ❌ (cross-version)
  - Validated in `vendor/SillyTavern/public/scripts/st-context.js` for the listed fields.
  - Cross-version stability requires a supported minimum ST version policy.

- **What needs to be done/inspected to successfully validate:**
  - Confirm the extension’s supported ST version range (README / release policy).
  - If supporting older ST, implement a safe fallback (prefer context when available, otherwise fall back to direct imports or legacy `event_types`).

#### Fix Quality Audit

- **Direction:**
  Sound in principle and consistent with COMPAT-01, but it is a compatibility-driven refactor rather than a bug fix.

- **Behavioral change:**
  Potentially none; but if any ctx field differs subtly (or missing), behavior changes can occur. This should be treated as a behavior-risk change even if intended to be neutral.

- **Ambiguity:**
  One approach, but missing an explicit compatibility strategy (“context-first with fallback” vs “hard switch”).

- **Proportionality:**
  Reasonable if the project is standardizing on getContext; otherwise it can be churn.

- **Checklist:**
  Mostly actionable, but it needs one explicit step: decide and document minimum ST version or add fallback.

- **Fix risk calibration:**
  Medium is appropriate.

- **"Why it's safe" validity:**
  Conditional (“when context is available”); this should be made explicit in the plan as a guard.

- **Verdict:** Implementation plan needs revision 🟡
  The plan must include a compatibility decision (minimum ST version or context-first fallback), otherwise the refactor can introduce host-version breakages.


### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/bookSourceLinks.js`
  - Switched the module to context-first runtime data access (`SillyTavern.getContext()`) with direct-import fallback for host compatibility.
  - Replaced direct runtime usage of `script.js`, `group-chats.js`, and `power-user.js` values with resolved runtime context fields.
  - Kept direct imports only for values not exposed in context (`METADATA_KEY`, `world_info`, `world_names`) and documented that exception inline.

- Risks / Side effects
  - On very old hosts with partial context objects, fallback paths now decide which source wins per field (probability: ?)
      - **?? MANUAL CHECK**: [ ] Switch chats/groups/characters and verify source-link icons still update correctly with no console errors on your current SillyTavern version.
---

### Coverage Note

- **Obvious missed findings:** None identified.
- **Severity calibration:** F01 is correctly prioritized. F02 likely has lower real-world severity (current callers normalize missing fields). F03 and F04 are opportunistic performance/compat refactors and should remain Low unless backed by profiling or a project-wide compatibility policy.
