CODE REVIEW FINDINGS

## Finding F01: Splitter drag performs layout reads and style writes in a high-frequency loop, creating reflow pressure.

- Location:
  `index.js` + `addDrawer` (splitter `pointerdown` handlers), anchor snippet:
  `const maxWidth = ... body.clientWidth ...; applyListWidth(nextWidth);`
  with `applyListWidth` writing `list.style.flexBasis` and `list.style.width`.

- What the issue is:
  Performance category: `1) DOM/layout reads`, `2) DOM writes`, `3) READ-AFTER-WRITE`, `4) high-frequency path`.
  During `pointermove`, the code repeatedly reads layout (`body.clientWidth`) while continuously writing width styles on each event.

- Why it matters:
  On large drawers/tables, drag-resizing can stutter because the browser is forced into frequent style/layout work.

- Severity:
  Medium

- Fix risk:
  Low

- Confidence:
  High

- Reproduction idea:
  Open DevTools Performance, drag the splitter left/right quickly for a few seconds, and inspect repeated Layout/Recalculate Style activity in the move handler.

- Suggested direction:
  Keep pointermove work to a single write path. Precompute stable geometry where possible and/or batch updates with `requestAnimationFrame` so reads/writes are not interleaved per move event.

- Proposed fix (description only):
  [x] Capture invariant values at `pointerdown` and avoid per-move layout reads where possible.
  [x] Gate width writes through one animation-frame callback.
  [x] Skip redundant width style writes when the target width is unchanged.
  [x] Verify splitter behavior and persisted width remain unchanged.

- Why it's safe:
  Drag direction, width clamping, and saved splitter width behavior remain unchanged; only update cadence is optimized.

## Finding F02: Entry refresh can trigger multiple synthetic editor opens for one update cycle.

- Location:
  `index.js` + `updateWIChange`, anchor snippet:
  inside the updated-entry loop (`for (const k of new Set(...))`), multiple branches call `cache[name].dom.entry[e].root.click();`.

- What the issue is:
  Performance category: `2) DOM writes`, `4) high-frequency path`, `5) synchronous loops over large collections`.
  When one entry has several changed fields, the editor refresh path can click the same row multiple times in one pass.

- Why it matters:
  Repeated editor rebuilds increase main-thread work, can cause visible flicker, and increase the chance of focus/caret instability during active editing.

- Severity:
  High

- Fix risk:
  Medium

- Confidence:
  High

- Reproduction idea:
  Add temporary logging around `root.click()` in `updateWIChange`, then trigger an update where a single entry changes multiple fields (`content`, `comment`, `key`); observe multiple click logs for one entry.

- Suggested direction:
  Compute one `needsEditorRefresh` flag per entry per update pass and trigger a single refresh after field comparisons complete.

- Proposed fix (description only):
  [x] Track whether any changed field requires editor refresh for the current entry.
  [x] Remove per-field immediate clicks and perform one click at the end of that entry's comparison loop.
  [x] Keep dirty-editor guards (`shouldAutoRefreshEditor`) exactly as-is.

- Why it's safe:
  Editor still auto-refreshes when needed, but redundant refreshes are removed; entry data sync behavior is unchanged.

## Finding F03: Order Helper outlet/group/automation filters can become stale after inline edits.

- Location:
  `src/orderHelperRender.js` + `renderOrderHelper` row editors, anchor snippets:
  `input[name='outletName']` change handler (`1546+`), `input[name='group']` change handler (`1573+`), and `input[name='automationId']` change handler (`1700+`) save data without reapplying corresponding row filters.

- What the issue is:
  **Behavior Change Required**
  Filter visibility state (`stwidFilterOutlet`, `stwidFilterGroup`, `stwidFilterAutomationId`) is not recomputed after these values change.

- Why it matters:
  Rows can remain visible when they should be filtered out (or vice versa) until a manual rerender/reopen, making filter results incorrect.

- Severity:
  Medium

- Fix risk:
  Medium

- Confidence:
  High

- Reproduction idea:
  In Order Helper, enable an outlet (or group/automation ID) filter, then edit a matching row to a non-matching value. The row's visibility does not immediately update.

- Suggested direction:
  Re-sync option sets and reapply the affected filter immediately after inline edits that mutate filter-relevant values.

- Proposed fix (description only):
  [ ] After outlet/group/automation ID edits, update corresponding filter value lists.
  [ ] Reapply the matching filter state to the edited row (or all rows if option domains changed).
  [ ] Verify filter button active state reflects the updated domains.

- Why it's safe:
  Data-edit behavior and persisted values remain unchanged; only filter correctness is updated to reflect current row values.

## Finding F04: Apply Order accepts invalid numeric inputs and can write `NaN` order values.

- Location:
  `src/orderHelperRender.js` + `renderOrderHelper` apply button handler, anchor snippet:
  `const start = parseInt(dom.order.start.value); const step = parseInt(dom.order.step.value); let order = start; ... cache[bookName].entries[uid].order = order;`.

- What the issue is:
  **Behavior Change Required**
  `start`/`step` are not validated before use. Empty or invalid inputs propagate `NaN` through all selected rows.

- Why it matters:
  Invalid order data can be persisted, breaking ordering predictability and requiring manual cleanup.

- Severity:
  High

- Fix risk:
  Low

- Confidence:
  High

- Reproduction idea:
  Clear the `Start` field (or enter non-numeric text via devtools), click Apply, and inspect resulting `order` values in cache/persisted payload.

- Suggested direction:
  Block apply when `start` or `step` is non-finite/non-positive and surface clear user feedback.

- Proposed fix (description only):
  [ ] Validate parsed `start` and `step` before iterating rows.
  [ ] Abort apply on invalid values and notify the user.
  [ ] Keep current apply algorithm unchanged for valid values.

- Why it's safe:
  Valid apply flows are unaffected; only invalid input paths are rejected instead of corrupting order values.

## Finding F05: Entry search performs full-cache scans and mass DOM class toggles on each input cycle.

- Location:
  `src/listPanel.js` + `setupFilter` -> `applySearchFilter`, anchor snippet:
  loops over every book and entry (`for (const b of Object.keys(state.cache))`, nested entry loops) with repeated `classList.add/remove('stwid--filter-query')`.

- What the issue is:
  Performance category: `2) DOM writes`, `4) high-frequency path`, `5) synchronous loops over large collections`.
  Even with a 125ms debounce, search work is `O(total entries)` with many DOM mutations per cycle.

- Why it matters:
  Large lorebook sets can cause typing lag and delayed UI updates, especially when entry scanning is enabled.

- Severity:
  Medium

- Fix risk:
  Medium

- Confidence:
  High

- Reproduction idea:
  Enable `Entries` search, load a large set of books/entries, type quickly in search, and profile scripting time in the input path.

- Suggested direction:
  Reduce per-cycle work by avoiding redundant class writes and using precomputed normalized search strings for entries.

- Proposed fix (description only):
  [ ] Skip `classList` writes when target state is already correct.
  [ ] Cache normalized searchable text per entry and refresh cache only when entry fields change.
  [ ] Keep existing search semantics and thresholds unchanged.

- Why it's safe:
  Search matching behavior and UI states remain the same; only redundant compute/mutation work is reduced.

## Finding F06: Order Helper row construction repeatedly re-queries template nodes inside a large synchronous loop.

- Location:
  `src/orderHelperRender.js` + `renderOrderHelper`, anchor snippet:
  inside `for (const e of entries)`, repeated global template lookups like
  `document.querySelector('#entry_edit_template [name="entryKillSwitch"]')`,
  `... [name="entryStateSelector"]`,
  `... [name="position"]`.

- What the issue is:
  Performance category: `5) synchronous loops over large collections`, `2) DOM writes`.
  The same selectors are resolved per row instead of once per render pass.

- Why it matters:
  Opening Order Helper scales poorly with entry count and can block the UI while rows are built.

- Severity:
  Medium

- Fix risk:
  Low

- Confidence:
  High

- Reproduction idea:
  Open Order Helper with many active entries and capture a performance trace; look for repeated selector resolution/clone work during initial render.

- Suggested direction:
  Resolve base template elements once before the row loop and clone cached nodes for each row.

- Proposed fix (description only):
  [ ] Hoist shared template lookups out of the per-row loop.
  [ ] Reuse/cloned cached template nodes per row.
  [ ] Confirm row controls and event wiring remain identical.

- Why it's safe:
  UI structure and control behavior remain unchanged; only repeated selector overhead is removed.

## Finding F07: Book menu integrations rely on fixed delay and unguarded selectors, creating race-prone failures.

- Location:
  `src/listPanel.js` + `renderBook` (book menu actions), anchor snippets:
  rename action (`await state.delay(500); document.querySelector('#world_popup_name_button').click();`)
  and bulk-edit action (`await state.delay(500); document.querySelector('.stwibe--trigger').click();`).

- What the issue is:
  These actions assume target buttons exist after a hard-coded 500ms wait and call `.click()` without null checks.

- Why it matters:
  On slow clients or delayed plugin/UI loading, actions can throw and silently fail, producing inconsistent menu behavior.

- Severity:
  Medium

- Fix risk:
  Low

- Confidence:
  High

- Reproduction idea:
  Simulate slow UI (CPU throttling), trigger Rename/Bulk Edit from the menu quickly after open, and observe null-reference failures or no-op behavior.

- Suggested direction:
  Replace fixed sleep with condition-based waits for the specific target element, and guard optional integrations before invoking.

- Proposed fix (description only):
  [ ] Wait for target action element presence instead of fixed 500ms delay.
  [ ] Add null-safe guards before invoking `.click()`.
  [ ] Keep existing menu action flow and target actions unchanged.

- Why it's safe:
  Same actions are triggered, but with deterministic readiness checks; no change to intended user-visible workflow.

