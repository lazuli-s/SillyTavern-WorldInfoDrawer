# CODE REVIEW FINDINGS: `src/orderHelperRender.filterPanel.js`

*Reviewed: February 16, 2026*

## Scope

- **File reviewed:** `src/orderHelperRender.filterPanel.js`
- **Helper files consulted:** `src/orderHelperFilters.js`, `vendor/SillyTavern/public/scripts/st-context.js`, `.claude/skills/st-js-best-practices/references/patterns.md`
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** Script-based filtering with SlashCommandParser + highlight.js; Live preview panel

---

## F01: Script filter is read from localStorage but never persisted back

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The filter box remembers a saved value when it opens, but it never saves what the user types. This means users can lose their filter script after reopening the Order Helper or reloading the page.

- **Location:**
  `src/orderHelperRender.filterPanel.js` â€” `buildFilterPanel(...)` textarea initialization and `input` handler

  Anchor snippet:
  ```js
  inp.value = localStorage.getItem('stwid--order-filter') ?? defaultFilter;
  // ...
  inp.addEventListener('input', () => {
      // highlight + updateListDebounced()
  });
  ```

- **Detailed Finding:**
  The code initializes the filter textarea with:
  `localStorage.getItem('stwid--order-filter') ?? defaultFilter`, suggesting that the script filter is intended to be persisted between sessions.

  However, no code in this file writes back to `localStorage` when the user edits the textarea (no `localStorage.setItem('stwid--order-filter', ...)`). A repo-wide search shows the key `stwid--order-filter` only exists in this file, so persistence is currently one-way (read-only).

  Observable outcome: after editing the script filter, closing and reopening the Order Helper (or a full page reload) will restore the old stored value (or the default), not the userâ€™s last edits.

- **Why it matters:**
  Users can waste time retyping complex filters and may think the feature is unreliable because it appears to â€œforgetâ€ their work.

- **Severity:** Medium â—
- **Confidence:** High ðŸ˜€
- **Category:** UI Correctness

- **Reproducing the issue:**
  1. Open Order Helper â†’ open Script Filter panel.
  2. Type a custom script filter.
  3. Reload the page (or reopen Order Helper if it rebuilds UI).
  4. Observe the filter resets to the previously stored value/default instead of the last typed script.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Persist the textarea value to `localStorage` on input (likely debounced) using the same key used for initial load.

- **Proposed fix:**
  In the textarea `input` handler (or alongside `updateListDebounced`), add a debounced `localStorage.setItem('stwid--order-filter', inp.value)` write. Prefer using the existing `debounce` function already passed in `ctx` to avoid synchronous storage writes on every keystroke.

- **Fix risk:** Low ðŸŸ¢
  This is additive persistence with no impact on filter execution semantics.

- **Why it's safe to implement:**
  It only affects the `localStorage` key already read by this module and does not change filtering logic or row state computation.

- **Pros:**
  Users' filter scripts persist as expected; reduces frustration and rework.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "No code in this file writes back to `localStorage` when the user edits the textarea" â€” **Validated âœ…**
  - Claim: "A repo-wide search shows the key `stwid--order-filter` only exists in this file" â€” **Validated âœ…** (the key appears only in initialization)

- **Top risks:**
  - Missing evidence / wrong prioritization / speculative claims / internal inconsistency / risk of the issue actually causing real impact > risk of fixing/benefits â€” **None identified.** The issue is clearly evidence-backed with direct code reference.

#### Technical Accuracy Audit

  > "No code in this file writes back to `localStorage` when the user edits the textarea"

- **Why it may be wrong/speculative:**
  N/A â€” Claim is directly verifiable in code.

- **Validation:**
  Validated âœ… â€” Source inspection confirms `inp.value = localStorage.getItem('stwid--order-filter') ?? defaultFilter` is read-only; no `setItem` call in the file.

- **What needs to be done/inspected to successfully validate:**
  N/A

#### Fix Quality Audit

- **Direction:**
  The proposed fix stays within the `orderHelperRender.filterPanel.js` module per ARCHITECTURE.md (filter panel responsibility). No cross-module moves.

- **Behavioral change:**
  The fix changes **when** persistence happens (debounced on input vs. never), but this is the intended behavior per the issue description. No behavioral change to filter logic.

- **Ambiguity:**
  Only one suggestion: add debounced save. No alternative options provided. âœ…

- **Checklist:**
  Checklist items are complete and actionable:
  1. Create debounced save function using existing `debounce` from `ctx` âœ…
  2. Call it inside `input` handler âœ…
  3. Ensure default value is saved âœ…
  
  All steps can be implemented by an LLM without human input. No vague steps.

- **Dependency integrity:**
  No cross-finding dependencies declared. The fix is self-contained.

- **Fix risk calibration:**
  Fix risk is rated **Low** ðŸŸ¢ â€” correct. This is additive persistence only, no impact on filter execution semantics.

- **"Why it's safe" validity:**
  The safety claim is specific: "only affects the `localStorage` key already read by this module and does not change filtering logic or row state computation." âœ…

- **Mitigation:**
  Not applicable â€” fix risk is low.

- **Verdict:** Ready to implement ðŸŸ¢

#### Implementation Checklist

> Verdict: Ready to implement ðŸŸ¢ â€” no checklist revisions needed.

- [x] Create `saveFilterDebounced = debounce(() => localStorage.setItem('stwid--order-filter', inp.value), <small delay>)` near `updateListDebounced`.
- [x] Call `saveFilterDebounced()` inside the `input` handler.
- [x] Ensure the default value is saved at least once (either immediately after init when key is missing, or on first input).

<!-- META-REVIEW: STEP 2 will be inserted here -->

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperRender.filterPanel.js`
  - Added a debounced `saveFilterDebounced()` write to persist script edits to `localStorage`.
  - Seeded the default script value to `localStorage` the first time the panel opens with no existing stored value.

- Risks / Side effects
  - Very frequent typing still performs debounced storage writes (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Type a custom script, close/reopen Order Helper (or reload), and confirm the same script text is restored.

---

## F02: Missing null guards when resolving rows can throw during refresh/desync

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If the list refreshes while the filter is running, the code can look for a row that no longer exists and crash, breaking the filter feature.

- **Location:**
  `src/orderHelperRender.filterPanel.js` â€” `updateList()` loops

  Anchor snippet:
  ```js
  const row = dom.order.entries[e.book][e.data.uid];
  setOrderHelperRowFilterState(row, 'stwidFilterScript', true);
  ```

- **Detailed Finding:**
  `updateList()` obtains entries via `getOrderHelperEntries(orderHelperState.book, true)` and then immediately dereferences DOM rows via `dom.order.entries[e.book][e.data.uid]`.

  In other modules, similar access patterns are guarded with optional chaining (`dom.order.entries?.[book]?.[uid]`) to handle cases where the UI is mid-refresh, a book section is unmounted, or the row hasn't been rendered yet. Here, unguarded indexing can throw `TypeError: Cannot read properties of undefined` if:
  - `dom.order.entries[e.book]` is missing (book removed/hidden/rerendered),
  - the row map exists but `e.data.uid` row is missing (not rendered yet / filtered out / rerender in progress).

  This is especially plausible because `updateList()` is async and may run concurrently with other Order Helper operations (table rebuild, scope changes, or WORLDINFO update reconciliation), and the function only checks `stwid--active` once at the start.

- **Why it matters:**
  A single missing row can crash filtering, leaving the user with stale filter state and potentially a broken UI until reopen/reload.

- **Severity:** Medium â—
- **Confidence:** Medium ðŸ¤”
  The failure depends on runtime timing (refresh while filter is in-flight), but the unguarded dereference is explicit.

- **Category:** Race Condition

- **Reproducing the issue:**
  1. Open Order Helper and open the script filter.
  2. Enter a filter that takes noticeable time (or apply it to a large entry list).
  3. Trigger a UI refresh/rerender (e.g., change Order Helper scope, or any action that rebuilds the table) while the filter is running.
  4. Observe potential console error and filter not applying.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make row lookup resilient to missing DOM entries by using optional chaining and skipping rows that cannot be resolved.

- **Proposed fix:**
  Replace `dom.order.entries[e.book][e.data.uid]` with `dom.order.entries?.[e.book]?.[e.data.uid]` in both loops. If `row` is falsy, continue without calling `setOrderHelperRowFilterState`.

- **Fix risk:** Low ðŸŸ¢
  Skipping missing rows is safer than crashing, and matches patterns already used in `src/orderHelperFilters.js`.

- **Why it's safe to implement:**
  It only changes behavior for rows that are already missing/unrendered; existing, valid rows behave identically.

- **Pros:**
  Prevents filter-panel crashes during rerender/update timing; improves robustness.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "`updateList()` obtains entries via `getOrderHelperEntries(orderHelperState.book, true)` and then immediately dereferences DOM rows via `dom.order.entries[e.book][e.data.uid]`" â€” **Validated âœ…**
  - Claim: "In other modules, similar access patterns are guarded with optional chaining" â€” **Validated âœ…** (checked `orderHelperFilters.js`)

- **Top risks:**
  - Missing evidence / wrong prioritization / speculative claims / internal inconsistency / risk of the issue actually causing real impact > risk of fixing/benefits â€” **None identified.** The issue describes a real race condition with plausible timing scenarios.

#### Technical Accuracy Audit

  > "This is especially plausible because `updateList()` is async and may run concurrently with other Order Helper operations"

- **Why it may be wrong/speculative:**
  The race condition is theoretically possible but requires specific timing: async operations + concurrent UI rebuilds. The claim is plausible but not proven through runtime evidence.

- **Validation:**
  Validated âœ… â€” Source inspection confirms unguarded `dom.order.entries[e.book][e.data.uid]` access in both loops (lines 108 and 116). The `orderHelperFilters.js` module uses optional chaining in similar patterns.

- **What needs to be done/inspected to successfully validate:**
  Not required â€” the code pattern is clearly present.

#### Fix Quality Audit

- **Direction:**
  The proposed fix stays within the `orderHelperRender.filterPanel.js` module. No cross-module moves.

- **Behavioral change:**
  The fix changes behavior only for missing rows â€” skipping them instead of throwing. This is a safer default and aligns with other modules.

- **Ambiguity:**
  Only one suggestion: use optional chaining + continue. âœ…

- **Checklist:**
  Checklist items are complete and actionable:
  1. Update both row-resolution sites to use optional chaining âœ…
  2. Add `if (!row) continue;` âœ…
  3. Ensure error path still calls `showFilterError` âœ…
  
  All steps can be implemented by an LLM without human input.

- **Dependency integrity:**
  No cross-finding dependencies declared.

- **Fix risk calibration:**
  Fix risk is rated **Low** ðŸŸ¢ â€” correct. Skipping missing rows is safer than crashing.

- **"Why it's safe" validity:**
  The safety claim is specific: "only changes behavior for rows that are already missing/unrendered; existing, valid rows behave identically." âœ…

- **Mitigation:**
  Not applicable â€” fix risk is low.

- **Verdict:** Ready to implement ðŸŸ¢

#### Implementation Checklist

> Verdict: Ready to implement ðŸŸ¢ â€” no checklist revisions needed.

- [x] Update both row-resolution sites (optimistic "mark kept" loop and per-entry execution loop) to use optional chaining.
- [x] Add `if (!row) continue;` before calling `setOrderHelperRowFilterState(...)`.
- [x] Ensure the error path still calls `showFilterError(...)` without throwing.

<!-- META-REVIEW: STEP 2 will be inserted here -->

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperRender.filterPanel.js`
  - Guarded both row lookups with optional chaining (`dom.order.entries?.[e.book]?.[e.data.uid]`).
  - Added `if (!row) continue;` before row-state mutation in both loops to prevent runtime throws during refresh/desync.

- Risks / Side effects
  - Missing rows are now skipped instead of crashing, so a row mid-rerender may retain its prior temporary filter marker until the next pass (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Run a script filter, then quickly change Order Helper scope to force rerender; confirm no console errors and visible rows still update.

---

## F03: In-flight async filter execution can apply stale results after filter panel is no longer active

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The filter can keep running in the background and change which rows are shown even after the user closes the filter panel, which can feel confusing and inconsistent.

- **Location:**
  `src/orderHelperRender.filterPanel.js` â€” `updateList()` async flow

  Anchor snippet:
  ```js
  if (!dom.order.filter.root.classList.contains('stwid--active')) return;
  // ... async compile + loops ...
  const result = (await closure.execute()).pipe;
  ```

- **Detailed Finding:**
  `updateList()` only checks whether the filter panel is active once at the beginning:
  `if (!dom.order.filter.root.classList.contains('stwid--active')) return;`.

  The function then:
  - awaits `SlashCommandParser.getScope()`,
  - awaits `closure.compile(script)`,
  - iterates entries and awaits `closure.execute()` per entry.

  If the user closes/deactivates the filter panel while this async chain is in-flight (without typing again), `filterStack` does not necessarily change (no newer closure is pushed), so the stale-run guard `filterStack.at(-1) !== closure` may not fire. As a result, the function can continue applying `stwidFilterScript` dataset state even though the panel is inactive.

  This is a UI correctness issue: the script-filter feature becomes â€œbackground statefulâ€ even after its UI is closed, which can be surprising (especially if the user expects the script filter to only apply while the panel is open).

- **Why it matters:**
  Users may see the table change after closing the filter UI, interpret it as a bug, and lose trust in the filtering system.

- **Severity:** Low â­•
- **Confidence:** Medium ðŸ¤”
  Depends on user interaction timing and on whether closing the panel is expected to halt evaluation.

- **Category:** UI Correctness

- **Reproducing the issue:**
  1. Open the script filter panel and type a filter.
  2. Immediately close/toggle off the filter panel before execution completes.
  3. Observe the table may still update as the async loop finishes.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add an â€œis still active?â€ early-exit check at safe points (after compilation and inside/around per-entry execution) to stop applying results when the panel is inactive.

- **Proposed fix:**
  In `updateList()`, re-check `dom.order.filter.root.classList.contains('stwid--active')`:
  - after `compile(...)` succeeds,
  - and inside the per-entry loop before mutating row state.
  If inactive, return without further state updates.

- **Fix risk:** Medium ðŸŸ¡
  This changes timing semantics: closing the panel would stop a currently running filter application, which could be perceived as a behavior change depending on intended UX.

- **Why it's safe to implement:**
  It does not affect filter correctness when the panel remains open; it only affects the â€œclose during evaluationâ€ edge case.

- **Pros:**
  Prevents confusing background changes; reduces stale-async side effects.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "`updateList()` only checks whether the filter panel is active once at the beginning" â€” **Validated âœ…**
  - Claim: "`filterStack` does not necessarily change" when panel closes without typing â€” **Validated âœ…** (filterStack only changes on new input, not panel close)

- **Top risks:**
  - Missing evidence / wrong prioritization / speculative claims / internal inconsistency / risk of the issue actually causing real impact > risk of fixing/benefits â€” **None identified.** The async timing analysis is accurate.

#### Technical Accuracy Audit

  > "If the user closes/deactivates the filter panel while this async chain is in-flight (without typing again), `filterStack` does not necessarily change"

- **Why it may be wrong/speculative:**
  This is a valid observation â€” the filterStack only gets new closures on input, not on panel close.

- **Validation:**
  Validated âœ… â€” Source inspection confirms: `filterStack.push(closure)` only happens in `updateList()`, which is called via `updateListDebounced()`. Closing the panel doesn't trigger a new input, so no new closure is pushed.

- **What needs to be done/inspected to successfully validate:**
  Not required â€” claim is accurate.

#### Fix Quality Audit

- **Direction:**
  The proposed fix stays within the `orderHelperRender.filterPanel.js` module. No cross-module moves.

- **Behavioral change:**
  **Labeled as "Behavior Change Required"** â€” The fix intentionally changes behavior: closing the panel during filter execution will now stop the filter application mid-flight. This is explicitly mentioned in the Fix risk as "could be perceived as a behavior change depending on intended UX."

- **Ambiguity:**
  Only one suggestion: re-check active state after compile and in loop. âœ…

- **Checklist:**
  Checklist items are complete and actionable:
  1. Add `isActive()` helper âœ…
  2. Check after compile âœ…
  3. Check in loop âœ…
  
  All steps can be implemented by an LLM without human input.

- **Dependency integrity:**
  No cross-finding dependencies declared.

- **Fix risk calibration:**
  Fix risk is rated **Medium ðŸŸ¡** â€” correct. This is a behavioral change (timing semantics).

- **"Why it's safe" validity:**
  The safety claim is accurate but incomplete â€” it mentions the edge case but does not explicitly flag it as a behavioral change. The medium risk rating acknowledges this.

- **Mitigation:**
  Not required for low-risk implementation â€” but implementer should verify UX is acceptable.

- **Verdict:** Ready to implement ðŸŸ¢

#### Implementation Checklist

> Verdict: Ready to implement ðŸŸ¢ â€” no checklist revisions needed.

- [x] Add a helper `isActive()` closure in `updateList()` to check `dom.order.filter.root?.classList.contains('stwid--active')`.
- [x] After `await closure.compile(script)`, if not active, return.
- [x] In the per-entry loop, before setting row filter state, if not active, return.

<!-- META-REVIEW: STEP 2 will be inserted here -->

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperRender.filterPanel.js`
  - Added `isActive()` to centralize panel-active checks using optional chaining.
  - Added early returns after compile and inside the per-entry execution loop to stop applying script-filter state after panel deactivation.

- Risks / Side effects
  - Closing the panel mid-run now stops remaining row updates, so partially-applied state can persist until the next refresh/input cycle (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] Start a heavy script filter and close the panel quickly; confirm no further row-state changes are applied after close.

---

## F04: Syntax highlighting runs on every keystroke and may cause input lag for long scripts

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  As the user types, the app re-highlights the entire script and rewrites the preview HTML each time. For long scripts, typing may become slow.

- **Location:**
  `src/orderHelperRender.filterPanel.js` â€” textarea `input` handler

  Anchor snippet:
  ```js
  inp.addEventListener('input', () => {
      syntax.innerHTML = DOMPurify.sanitize(hljs.highlight(...).value ?? '');
      updateScrollDebounced();
      updateListDebounced();
  });
  ```

- **Detailed Finding:**
  The `input` handler always runs `hljs.highlight(...)` over the full textarea content and then sets `syntax.innerHTML` (sanitized) immediately. This is separate from the actual filter execution, which is debounced to 1000ms, but highlighting is not debounced.

  highlight.js parsing + DOMPurify + innerHTML assignment can be relatively expensive and can cause noticeable input latency on large scripts or slower devices.

- **Why it matters:**
  Input lag makes the feature feel â€œbrokenâ€ and discourages using more complex filters (which is exactly when highlighting is most valuable).

- **Severity:** Low â­•
- **Confidence:** Medium ðŸ¤”
  Depends on script size/device performance.

- **Category:** Performance

- **Reproducing the issue:**
  1. Paste a long script into the filter textarea.
  2. Type quickly.
  3. Observe delayed characters / jank (if present).

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Debounce or schedule highlighting work so it doesnâ€™t run synchronously on every input event.

- **Proposed fix:**
  Introduce a `debounce` (or `requestAnimationFrame`) wrapper for the highlight update, similar to `updateListDebounced`. Keep scroll sync behavior intact.

- **Fix risk:** Medium ðŸŸ¡
  Adds a small delay to highlighting which could be seen as a UX change; must ensure the overlay stays visually aligned (especially around newline edge cases).

- **Why it's safe to implement:**
  It does not change filter execution logic or saved data; it only changes when the syntax overlay rerenders.

- **Pros:**
  Smoother typing; better perceived performance for complex filters.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "The `input` handler always runs `hljs.highlight(...)` over the full textarea content and then sets `syntax.innerHTML` (sanitized) immediately." â€” **Validated âœ…**
  - Claim: "highlighting is not debounced" â€” **Validated âœ…** (filter execution is debounced but highlighting runs synchronously on each input)

- **Top risks:**
  - Missing evidence / wrong prioritization / speculative claims / internal inconsistency / risk of the issue actually causing real impact > risk of fixing/benefits â€” **None identified.** Performance impact depends on script size/device but the claim is plausible.

#### Technical Accuracy Audit

  > "highlight.js parsing + DOMPurify + innerHTML assignment can be relatively expensive"

- **Why it may be wrong/speculative:**
  This is a performance analysis claim. The actual impact depends on script length and device performance. It's plausible but not benchmarked.

- **Validation:**
  Validated âœ… â€” Source inspection confirms highlighting runs synchronously in the input handler without any debouncing.

- **What needs to be done/inspected to successfully validate:**
  Not required â€” the code pattern is clearly present.

#### Fix Quality Audit

- **Direction:**
  The proposed fix stays within the `orderHelperRender.filterPanel.js` module. No cross-module moves.

- **Behavioral change:**
  The fix adds a delay to syntax highlighting updates. This is a UX change but not a behavioral change to core functionality.

- **Ambiguity:**
  Only one suggestion: debounce highlighting. âœ…

- **Checklist:**
  Checklist items are complete and actionable:
  1. Extract to `updateHighlight()` âœ…
  2. Create debounced version âœ…
  3. Call debounced version âœ…
  
  All steps can be implemented by an LLM without human input.

- **Dependency integrity:**
  No cross-finding dependencies declared.

- **Fix risk calibration:**
  Fix risk is rated **Medium ðŸŸ¡** â€” correct. The delay could cause visual misalignment, especially around newlines.

- **"Why it's safe" validity:**
  The safety claim is accurate: "does not change filter execution logic or saved data; it only changes when the syntax overlay rerenders." âœ…

- **Mitigation:**
  Not required for implementation â€” but implementer should verify overlay stays aligned with textarea.

- **Verdict:** Ready to implement ðŸŸ¢

#### Implementation Checklist

> Verdict: Ready to implement ðŸŸ¢ â€” no checklist revisions needed.

- [x] Extract highlighting update into `updateHighlight()` function.
- [x] Create `updateHighlightDebounced = debounce(() => updateHighlight(), 50â€“150)`.
- [x] Call `updateHighlightDebounced()` in the `input` handler instead of updating immediately.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperRender.filterPanel.js`
  - Extracted highlight generation into `updateHighlight()`.
  - Added `updateHighlightDebounced` (100ms) and switched input handling to debounced highlighting.
  - Kept initial render highlighting immediate via `updateHighlight()` at setup.

- Risks / Side effects
  - Syntax overlay updates slightly after typing, which could feel delayed for very short scripts (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] Paste/type a longer script quickly and confirm typing stays smooth while syntax highlighting remains aligned with the textarea content.
---

### Coverage Note

- **Obvious missed findings:** None identified.
- **Severity calibration:** All findings are correctly severity-rated (F01 Medium, F02 Medium, F03 Low, F04 Low). The Medium findings address real data integrity/usability concerns; the Low findings are performance/edge-case optimizations.

