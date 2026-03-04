# CODE REVIEW FINDINGS: `src/editor-panel/editor-panel.js`
*Reviewed: March 2, 2026*

## Scope

- **File reviewed:** `src/editor-panel/editor-panel.js`
- **Helper files consulted:** `src/shared/wi-update-handler.js`, `src/book-browser/book-list/book-list.world-entry.js`
- **Skills applied:** `st-js-best-practices`, `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** Entry editor render pipeline, dirty tracking to avoid unsaved-edit loss on refresh, editor reset/highlight control, focus/unfocus UI toggles, and activation settings embedding/toggling.

---

## F01: Dirty Flag Is Set On Focus, Which Can Block Required Editor Refresh

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The editor marks an entry as "changed" as soon as the user clicks into a field, even if they did not type anything. This can stop automatic refresh when the entry is updated elsewhere, so the editor can keep showing old information.

- **Category:** UI Correctness

- **Location:**
  `src/editor-panel/editor-panel.js` in `onEditorPointerdown` (`if (target.closest(...)) { markEditorDirtyIfCurrent(); }`)

- **Detailed Finding:**
  `onEditorPointerdown` sets dirty state on any pointer interaction with `input`, `textarea`, `select`, or contenteditable targets (lines 82-93). The WI update path (`src/shared/wi-update-handler.js`) gates auto-refresh through `editorPanelApi.isDirty(name, uid)` and skips editor reopen when dirty. Because pointer focus alone sets dirty, a no-change click can suppress refresh for real incoming updates (for example, external entry mutation or another UI path). The same update cycle later calls `editorPanelApi.markClean(name, e)` when no reopen happened, so the stale editor remains visible while the dirty guard is cleared.

- **Why it matters:**
  Users can unknowingly edit outdated content and overwrite newer data, which increases the chance of accidental data loss or confusing "why didn’t it update?" behavior.

- **Severity:** High ❗❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Only mark dirty on real content edits, not on focus/click. Keep `input`/`change`/typing-based detection as the source of truth for unsaved state.

- **Proposed fix:**
  In `src/editor-panel/editor-panel.js`, remove dirty marking from `onEditorPointerdown` (or constrain it to controls that truly mutate value at pointer time, if any are proven necessary). Keep `onEditorInput`, `onEditorChange`, and `onEditorKeydown` as dirty triggers. Ensure `isDirty` reflects edit intent, not field focus, so `wi-update-handler` refresh decisions remain accurate.

- **Fix risk:** Low 🟢
  This narrows dirty-state triggers and does not alter save payload construction, editor rendering, or event subscriptions.

- **Why it's safe to implement:**
  It only changes when the dirty flag flips to true; it does not modify `getWorldEntry`, `buildSavePayload`, activation settings toggles, or list selection behavior.

- **Pros:**
  Prevents stale editor views after external updates and makes dirty tracking match actual user edits.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `onEditorPointerdown` at lines 82–93 calls `markEditorDirtyIfCurrent()` on any pointerdown on `input`, `textarea`, `select`, or contenteditable — confirmed in source.
  - `shouldAutoRefreshEditor` in `wi-update-handler.js` (lines 35–42) calls `editorPanelApi.isDirty(name, uid)` and returns its inverse — confirmed in source.
  - The `else if` branch in `wi-update-handler.js` (lines 211–215) calls `editorPanelApi.markClean(name, e)` when `needsEditorRefresh` is false — confirmed. A click-only dirty blocks the refresh, then that branch clears the dirty flag, leaving stale data visible with no guard.

- **Top risks:**
  Missing follow-up: after removing the dirty call from `onEditorPointerdown`, the remaining function body (null-check + `target.closest` check) becomes dead code. The original checklist does not instruct the implementer to also remove the now-empty function and its event listener pair.

#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:** Sound. The fix stays entirely within `editor-panel.js` as prescribed by `FEATURE_MAP.md` and `ARCHITECTURE.md`.

- **Behavioral change:** Yes — intentional behavioral change (dirty no longer set on focus-only pointer interactions). Correctly labeled as intentional by the finding.

- **Ambiguity:** Single recommendation. No ambiguity.

- **Checklist:** Step 1 uses "focus-only interactions" which is slightly vague — an LLM might add a condition rather than remove the entire block. More critically, the checklist omits a required follow-up: after removing the dirty call, `onEditorPointerdown` becomes a function with only a dead null-check. The now-empty function, its `addEventListener` registration (line 98), and its `removeEventListener` in `cleanup` (line 298) must also be removed.

- **Dependency integrity:** No cross-finding dependency. Independent finding.

- **Fix risk calibration:** Low is accurate. Removes one block from one function; does not touch shared state, event bus, or save paths.

- **"Why it's safe" validity:** Specific and verifiable — names `getWorldEntry`, `buildSavePayload`, activation settings toggles, and list selection behavior as unaffected.

- **Verdict:** Implementation plan needs revision 🟡
  Checklist step 1 must specify removing the entire `if (target.closest(...)) { markEditorDirtyIfCurrent(); }` block (not just vague "focus-only interactions"), and a new step must cover removing the now-dead `onEditorPointerdown` function and its listener pair.

#### Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Step 1 was vague ("focus-only interactions") and the checklist omitted a required cleanup step for the now-empty `onEditorPointerdown` function and its listener pair.
> Revisions applied: Step 1 made concrete (remove the entire `if` block by name); new step 3 added for removing the dead function and its two listener calls.

- [x] In `onEditorPointerdown` (lines 88–93 of `editor-panel.js`), remove the entire `if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) { markEditorDirtyIfCurrent(); }` block.
- [x] Keep existing `input`/`change`/`keydown` dirty flow intact — do not touch `onEditorInput`, `onEditorChange`, or `onEditorKeydown`.
- [x] Since `onEditorPointerdown` is now an empty function, also remove: (a) the `onEditorPointerdown` const declaration, (b) its `addEventListener('pointerdown', ...)` call on line 98, and (c) its `removeEventListener('pointerdown', ...)` call in `cleanup` on line 298.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/editor-panel/editor-panel.js`
  - Removed pointerdown-driven dirty marking by deleting `onEditorPointerdown` and its listener registration/cleanup.
  - Preserved existing dirty tracking triggers on `input`, `change`, and `keydown` handlers.

- Risks / Side effects
  - Browser controls that only mutate on pointer interaction (if any exist in this editor subtree) might no longer set dirty before `change` dispatch (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Open an entry, click into fields without editing, trigger an external WI update, and confirm the editor refreshes instead of staying stale.

---

## F02: Focus/Unfocus Controls Are Mouse-Only Divs

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The editor’s Focus and Unfocus controls are built as plain `div` elements with click handlers. Keyboard users may not be able to reach or activate these controls.

- **Category:** UI Correctness

- **Location:**
  `src/editor-panel/editor-panel.js` in `createFocusToggleButton` (`document.createElement('div')` + click listener)

- **Detailed Finding:**
  `createFocusToggleButton` creates a `div` with icon classes and attaches only a `click` handler (lines 173-183). No semantic button role, keyboard handler, or tabbable behavior is provided. The control is inserted in `appendFocusButton` and `appendUnfocusButton` and is therefore a primary UI action for editor layout state. This violates expected interactive semantics and can break keyboard navigation/accessibility behavior.

- **Why it matters:**
  Users who rely on keyboard navigation may be blocked from using the focus toggle, causing an inconsistent or inaccessible editor experience.

- **Severity:** Medium ❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Use a native button element for interactive controls so keyboard, focus, and accessibility semantics work by default.

- **Proposed fix:**
  Change `createFocusToggleButton` to create a `<button type="button">` instead of `div`, keep existing classes/icons, and provide an explicit accessible name (`aria-label`) aligned with the title text. Ensure the same function is reused by both Focus and Unfocus insertions.

- **Fix risk:** Low 🟢
  The change is localized to one helper and preserves existing control wiring.

- **Why it's safe to implement:**
  It does not affect editor data, World Info API calls, dirty tracking logic, or async token flow in `openEntryEditor`.

- **Pros:**
  Improves keyboard accessibility and standardizes interactive control behavior with minimal code change.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `createFocusToggleButton` at lines 173–183 uses `document.createElement('div')` — confirmed in source.
  - No `tabindex`, `role="button"`, or keyboard handler is present — confirmed.
  - The function is reused for both Focus (`appendFocusButton`) and Unfocus (`appendUnfocusButton`) buttons — confirmed.

- **Top risks:** None.

#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:** Sound. Change is localized to `createFocusToggleButton` in `editor-panel.js`, correct per ARCHITECTURE.md.

- **Behavioral change:** No data or logic change. Semantic element upgrade only. Not labeled as a behavioral change, which is appropriate.

- **Ambiguity:** Single recommendation (`<button type="button">`). No ambiguity.

- **Checklist:** Complete and actionable. Steps cover element creation, type attribute, aria-label, and class/click preservation.

- **Dependency integrity:** None declared or needed. Independent finding.

- **Fix risk calibration:** Low is accurate. The change is localized to one helper function.

- **"Why it's safe" validity:** Specific — names editor data, WI API calls, dirty tracking logic, and async token flow as unaffected.

- **Mitigation:** Verify that applying `menu_button` and the Font Awesome classes to a `<button>` element does not introduce default browser button styling (border, padding, background) that the class does not reset. Spot-check visually after the switch.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Replace `document.createElement('div')` with `document.createElement('button')` in `createFocusToggleButton`.
- [x] Set `button.type = 'button'` and add `aria-label` based on the `title` argument.
- [x] Keep existing click behavior and class names so styling hooks remain intact.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/editor-panel/editor-panel.js`
  - Updated focus toggle control creation from `<div>` to `<button>`.
  - Added `type="button"` and `aria-label` while preserving existing classes, title, and click behavior.

- Risks / Side effects
  - Default browser button styles may appear if current CSS class chain does not fully normalize `<button>` styling (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Open the entry editor and confirm Focus/Unfocus icons keep the same visual style and are reachable/activatable via keyboard Tab + Enter/Space.
