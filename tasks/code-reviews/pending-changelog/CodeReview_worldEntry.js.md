# CODE REVIEW FINDINGS: `src/worldEntry.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/worldEntry.js`
- **Helper files consulted:** `src/listPanel.selectionDnD.js`, `vendor/SillyTavern/public/scripts/world-info.js`
- **Skills applied:** `<st-js-best-practices>` / `<st-world-info-api>`
- **FEATURE_MAP stated responsibilities:** Entry row rendering, selection interactions (single/toggle/SHIFT range), entry enable/disable toggle, entry strategy selector, click-to-open editor, and entry state mapping.

---

## F01: Mixed UID Types Break Selection Logic And Can Duplicate Copied Entries

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The file stores selected entry IDs in two different formats (number vs text). That mismatch makes selection checks unreliable and can cause accidental duplicate copies when users do SHIFT-select + CTRL-drag.

- **Category:** Data Integrity

- **Location:**
  `src/worldEntry.js` -> `renderEntry()` (anchor snippets: `context.selectList.push(uid)` at SHIFT path vs `context.selectList.push(e.uid)` at single-select path)

- **Detailed Finding:**
  `renderEntry()` mixes UID types in `context.selectList`. In the SHIFT range path, UIDs come from `el.dataset.uid` (string) and are pushed as strings (`lines 50-55`). In the regular select path, the same list stores `e.uid` directly (`lines 95, 86, 28, 246`), and WI entry shape defines `uid` as number by default. Because `includes()`/`indexOf()` use strict equality, the same UID can exist as both `1` and `'1'`. This causes inconsistent behavior in this module and downstream selection consumers (notably move/copy loop in `src/listPanel.selectionDnD.js` line 54). A common failure path is: single-select one row (number UID), SHIFT-select range (string UIDs), then CTRL-drag copy; the source UID can be processed twice (once as number, once as string), creating unintended duplicate copied entries.

- **Why it matters:**
  Users can unintentionally create duplicate lorebook entries and selection/deselection behavior becomes unpredictable.

- **Severity:** High ❗❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Normalize selected entry UIDs to one type at the source and use that same type for every selection check. The lowest-risk option is using strings everywhere because dataset values are already strings.

- **Proposed fix:**
  In `renderEntry()`, create one normalized UID variable (for example from `String(e.uid)`) and use it for all `includes`, `indexOf`, and `push` operations on `context.selectList`. In the SHIFT loop, normalize `el.dataset.uid` before comparisons. Ensure drag gating checks (`dragstart` and `pointerdown`) also use the normalized value.

- **Implementation Checklist:**
  - [ ] Add a normalized row UID variable in `renderEntry()` and stop using raw `e.uid` for selection list comparisons.
  - [ ] Replace all selection-list membership/removal operations in `worldEntry.js` to use the normalized UID type consistently.
  - [ ] Normalize SHIFT-range UIDs from `dataset.uid` before comparing/pushing.
  - [ ] Update drag gating checks in `dragstart` and `pointerdown` to use the same normalized UID type.

- **Fix risk:** Low 🟢
  The change is local to selection-ID bookkeeping and does not alter WI persistence APIs or entry rendering structure.

- **Why it's safe to implement:**
  It does not change how entries are saved, rendered, or opened in the editor. It only makes selection identity checks consistent.

- **Pros:**
  Eliminates accidental duplicate copy operations, fixes inconsistent deselect behavior, and makes drag eligibility reliable for range-selected rows.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - UID type mismatch: `e.uid` (number) vs `el.dataset.uid` (string) — traceable at lines 95-100 vs lines 67-72
  - Strict equality failure: `includes()` and `indexOf()` use strict equality (`1 !== '1'`)
  - Downstream impact: `moveOrCopySelectedEntriesToBook` iterates `selectList` and can process same entry twice

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:**
  Technically sound. Normalizing to strings is the lowest-risk option since DOM dataset values are already strings. Fix stays within `worldEntry.js` as the rendering/selection module.

- **Behavioral change:**
  No observable behavior change — only fixes inconsistent internal state. Not labeled as "Behavior Change Required" and does not need to be.

- **Ambiguity:**
  Single clear recommendation: normalize UIDs to strings at the source.

- **Checklist:**
  Checklist items are complete and actionable. Each step references specific operations (includes, indexOf, push) and locations (SHIFT-range, drag gating).

- **Dependency integrity:**
  No dependencies on other findings.

- **Fix risk calibration:**
  Correctly rated Low 🟢 — change is localized to selection bookkeeping, does not alter persistence APIs or rendering structure.

- **"Why it's safe" validity:**
  Valid. Specifically names concrete behaviors not affected: "does not change how entries are saved, rendered, or opened in the editor."

- **Mitigation:**
  Omit — not applicable for Low risk.

- **Verdict:** Ready to implement 🟢
  All claims are evidenced, fix is localized and low-risk, checklist is actionable.

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Add a normalized row UID variable in `renderEntry()` and stop using raw `e.uid` for selection list comparisons.
- [x] Replace all selection-list membership/removal operations in `worldEntry.js` to use the normalized UID type consistently.
- [x] Normalize SHIFT-range UIDs from `dataset.uid` before comparing/pushing.
- [x] Update drag gating checks in `dragstart` and `pointerdown` to use the same normalized UID type.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/worldEntry.js`
  - Added a normalized `rowUid` string in `renderEntry()` and used it for selection membership/removal checks.
  - Normalized SHIFT-range dataset UIDs before pushing/comparing and updated `dragstart`/`pointerdown` gating to use normalized UIDs.

---

## F02: Per-Row Save Guard Still Allows Cross-Row Save Races

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The code blocks double-click saves on one row, but it still lets two different rows save at the same time. If those saves finish out of order, one user change can overwrite another.

- **Category:** Race Condition

- **Location:**
  `src/worldEntry.js` -> `renderEntry()` status handlers (`isSavingState` at line 130; save calls at lines 157 and 206)

- **Detailed Finding:**
  `isSavingState` is scoped per rendered row, so it only serializes save requests for that single row. Two quick edits on different rows in the same book can still trigger concurrent `saveWorldInfo(name, payload, true)` calls. `saveWorldInfo(..., true)` in ST (`vendor/SillyTavern/public/scripts/world-info.js`, lines 4088-4093) performs immediate save without debounce queueing. Since each handler builds payload from mutable cache state at call time, out-of-order network completion can commit an older snapshot last, reverting a newer toggle/strategy change.

- **Why it matters:**
  This is a direct lost-update risk: users can make two valid changes and only one persists.

- **Severity:** High ❗❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Serialize all entry-state saves per book through one shared queue, not per-row flags. Keep optimistic UI, but enforce deterministic save ordering.

- **Proposed fix:**
  Add a per-book save queue helper in a shared owner (for example WI update/save orchestration context), expose it through `setWorldEntryContext`, and route both status handlers through it instead of calling `context.saveWorldInfo(..., true)` directly. Build payload immediately before each queued save executes so each operation starts from latest cache state.

- **Implementation Checklist:**
  - [ ] Add a per-book save serialization helper in the shared runtime/handler layer used by `worldEntry.js`.
  - [ ] Expose that helper to `worldEntry` via the injected context object.
  - [ ] Replace direct immediate-save calls in both entry status handlers with the shared queued save helper.
  - [ ] Ensure queued saves rebuild payload at execution time (not at click time) to avoid stale snapshots.

- **Fix risk:** Medium 🟡
  Save ordering changes can affect perceived responsiveness and may reveal dependencies in other modules that assumed immediate parallel saves.

- **Why it's safe to implement:**
  The fix can be scoped to entry status/strategy writes for one book at a time and does not require changing ST-owned APIs or data schema.

- **Pros:**
  Prevents lost updates, makes save outcomes deterministic, and reduces hard-to-reproduce state regressions.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Per-row scope: `isSavingState` declared inside `renderEntry()` at line 130, making it per-row
  - Concurrent save path: Both status handlers call `context.saveWorldInfo(name, context.buildSavePayload(name), true)` at lines 157 and 206
  - Immediate save: `saveWorldInfo(..., true)` bypasses debounce per ST world-info.js
  - Lost-update scenario: Out-of-order network completion can commit older snapshot last

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:**
  Technically sound. Per-book serialization is the correct approach for race-condition prevention. The suggestion to use a shared owner (WI update/save orchestration context) aligns with ARCHITECTURE.md's module boundaries.

- **Behavioral change:**
  Yes — changes observable behavior (saves become serialized, potentially slower perceived responsiveness when rapidly toggling multiple rows). The original finding correctly rates this Medium 🟡 risk and notes "Save ordering changes can affect perceived responsiveness."

- **Ambiguity:**
  Single clear recommendation: shared per-book queue through context.

- **Checklist:**
  Checklist items are complete and actionable. Each step has a clear location (shared runtime layer, context injection, handler replacement) and verification criterion (payload built at execution time).

- **Dependency integrity:**
  No dependencies on other findings.

- **Fix risk calibration:**
  Correctly rated Medium 🟡 — touches shared state (save coordination), async behavior (queue/serialization), and multiple callers (both status handlers). The "Why it's safe" claim is valid: scoped to entry status/strategy writes, no ST API changes needed.

- **"Why it's safe" validity:**
  Valid. Specifically names scope boundary: "scoped to entry status/strategy writes for one book at a time" and "does not require changing ST-owned APIs or data schema."

- **Mitigation:**
  Implementer should verify queue behavior with rapid successive clicks on different rows. Ensure failed saves reject the promise so queue continues.

- **Verdict:** Ready to implement 🟢
  All claims are evidenced, fix direction is architecturally sound, checklist is actionable. Medium risk is correctly calibrated and acknowledged.

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Add a per-book save serialization helper in the shared runtime/handler layer used by `worldEntry.js`.
- [x] Expose that helper to `worldEntry` via the injected context object.
- [x] Replace direct immediate-save calls in both entry status handlers with the shared queued save helper.
- [x] Ensure queued saves rebuild payload at execution time (not at click time) to avoid stale snapshots.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/drawer.js`, `src/worldEntry.js`
  - Added `enqueueEntryStateSave(bookName)` in `drawer.js` using a per-book promise queue and payload rebuild at execution time.
  - Injected the queue helper through `setWorldEntryContext(...)` and switched entry status handlers to call the shared queued helper.

- Risks / Side effects
  - Rapid cross-row toggles now serialize per book and may feel slightly slower than parallel immediate saves (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] In one book, quickly toggle enable/state on multiple different rows; confirm all final row states persist after refresh with no reversion.
