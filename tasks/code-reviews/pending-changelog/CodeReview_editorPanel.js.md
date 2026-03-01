# CODE REVIEW FINDINGS: `src/editorPanel.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/editorPanel.js`
- **Helper files consulted:** `FEATURE_MAP.md`, `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** Entry editor render pipeline, editor dirty tracking to prevent refresh from discarding unsaved edits, editor reset/clear and active-row highlight control, focus/unfocus editor UI toggles, global activation settings panel embedding/toggling, duplicate-entry button refresh queue/reopen behavior

---

## F01: Code duplication in activation settings display logic

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The same code for showing the activation settings panel appears in two different functions. If the display logic needs to change in the future, a developer might update one place and forget the other, causing inconsistent behavior.

- **Category:** Redundancy

- **Location:**
  `src/editorPanel.js`, functions `showActivationSettings()` (lines 115-128) and `toggleActivationSettings()` (lines 130-153)

- **Detailed Finding:**
  Both `showActivationSettings()` and the `isActive` branch of `toggleActivationSettings()` contain identical code blocks:
  1. Closing the order helper panel if open
  2. Clearing entry highlights
  3. Creating and appending the "Global World Info/Lorebook activation settings" h4 element
  4. Appending the activation block to the editor

  The duplication spans approximately 12 lines of nearly identical logic. The only difference is that `showActivationSettings()` unconditionally shows the panel, while `toggleActivationSettings()` shows it when `isActive` is true after toggling the class.

- **Why it matters:**
  Duplicated code increases maintenance burden and bug risk. If the activation settings display logic needs modification (e.g., adding a new element, changing the heading text, or adjusting the order helper close behavior), a developer must remember to update both locations. Missing one location would result in inconsistent UI behavior depending on whether the user clicked the dedicated activation button or toggled it.

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Extract the common activation settings display logic into a shared helper function that both `showActivationSettings()` and `toggleActivationSettings()` can call.

- **Proposed fix:**
  Create a private helper function `renderActivationSettings()` that encapsulates the common logic: closing order helper, clearing highlights, creating the h4, and appending the activation block. Both `showActivationSettings()` and `toggleActivationSettings()` should call this helper.

- **Fix risk:** Low 🟢

- **Why it's safe to implement:**
  This is a pure refactoring with no behavioral changes. Both code paths currently execute identical logic; extracting to a helper merely centralizes it. The existing control flow (setting classes before/after) remains unchanged.

- **Pros:**
  - Single source of truth for activation settings display logic
  - Easier future maintenance and modifications
  - Reduced risk of inconsistent behavior between the two entry points
  - Smaller bundle size (minor, but measurable)

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  The duplication claim is directly traceable in `src/editorPanel.js` where `showActivationSettings()` and the `isActive` branch of `toggleActivationSettings()` run the same ordered steps: close order helper if open, clear highlights, create/append the same `<h4>` title, then append `activationBlock`.

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims - all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:**
  Technically sound. The recommendation stays inside `src/editorPanel.js`, which matches module ownership in `ARCHITECTURE.md` and does not move responsibilities across modules.

- **Behavioral change:**
  No observable behavior change required. This is a local deduplication refactor if the extracted helper preserves current statement order.

- **Ambiguity:**
  One clear recommendation is provided (extract shared render logic to one helper).

- **Checklist:**
  Complete and actionable. Steps are specific and directly mappable to existing functions.

- **Dependency integrity:**
  None. This finding can be implemented independently.

- **Fix risk calibration:**
  Accurate. `Low` is appropriate because the change is localized and does not alter async flow, shared persistence, or cross-module contracts.

- **"Why it's safe" validity:**
  Valid. The safety claim is specific to identical code paths in the same module and is verifiable by comparing current branches.

- **Verdict:** Ready to implement 🟢
  The finding is well-evidenced, confidence is high, and the implementation plan is sufficiently concrete.

#### Implementation Checklist

> Verdict: Ready to implement 🟢 - no checklist revisions needed.

- [x] Create a new private function `renderActivationSettings()` that contains the duplicated logic
- [x] Refactor `showActivationSettings()` to call `renderActivationSettings()` after setting the active class
- [x] Refactor `toggleActivationSettings()` to call `renderActivationSettings()` when `isActive` is true

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/editorPanel.js`
  - Added `renderActivationSettings()` to centralize activation settings rendering logic
  - Updated `showActivationSettings()` and active branch of `toggleActivationSettings()` to call the shared helper
