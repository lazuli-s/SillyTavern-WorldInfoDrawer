# REFACTORING: entry-manager.utils.js
*Created: July 3, 2026*

**File:** `src/entry-manager/entry-manager.utils.js`
**Findings:** 4 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 0 |
| Large functions | SIZE-01 | 0 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **4** |

---

## Findings

### [1] DRY-01 — Duplicated code block

**What:** The logic that syncs the checkbox icon with the input's checked state is written twice. This makes it easy for one copy to drift (change in one place but not the other) and causes extra work when updating behavior.

**Where:**
- `src/entry-manager/entry-manager.utils.js`, lines 34-37 — `setChecked(...)` updates the icon based on `input.checked`
- `src/entry-manager/entry-manager.utils.js`, lines 38-40 — the `change` handler repeats the same icon update

**Steps to fix:**
- [x] Reuse the existing shared function: change the `input.addEventListener('change', ...)` handler (lines 38-40) to call `setChecked(input.checked)` instead of calling `setMultiselectDropdownOptionCheckboxState(...)` directly.
- [x] Confirm `setChecked(...)` remains the single place that updates both `input.checked` and the checkbox icon state.

---

### [2] DRY-02 — Magic value

**What:** The value `'stwid--state-active'` appears 6 times. It represents the "active/open" UI state class and should be a named constant.

**Where:**
- `src/entry-manager/entry-manager.utils.js`, line 50
- `src/entry-manager/entry-manager.utils.js`, line 83
- `src/entry-manager/entry-manager.utils.js`, line 84
- `src/entry-manager/entry-manager.utils.js`, line 89
- `src/entry-manager/entry-manager.utils.js`, line 91
- `src/entry-manager/entry-manager.utils.js`, line 103

**Steps to fix:**
- [x] At the top of the file (after exports/constants), add: `const CSS_STATE_ACTIVE = 'stwid--state-active';`
- [x] Replace each occurrence of the raw literal with `CSS_STATE_ACTIVE`. For the selector string on line 50, use a template string or concatenation so the class name is not duplicated inside the selector.

---

### [3] DRY-02 — Magic value

**What:** The value `'aria-expanded'` appears 4 times. It represents the same ARIA attribute name (an accessibility attribute) and should be a named constant.

**Where:**
- `src/entry-manager/entry-manager.utils.js`, line 59
- `src/entry-manager/entry-manager.utils.js`, line 71
- `src/entry-manager/entry-manager.utils.js`, line 85
- `src/entry-manager/entry-manager.utils.js`, line 92

**Steps to fix:**
- [x] At the top of the file (after exports/constants), add: `const ARIA_EXPANDED_ATTR = 'aria-expanded';`
- [x] Replace each occurrence of the raw literal with `ARIA_EXPANDED_ATTR`.

---

### [4] NEST-01 — Deep nesting

**What:** Inside `wireCollapseRow`, the click handler contains an `if` branch that registers a `transitionend` listener with its own callback. This reaches 4 levels of nesting (function -> click callback -> if block -> transitionend callback), which makes the flow harder to follow.

**Where:** `src/entry-manager/entry-manager.utils.js`, lines 121-130 (deepest point: line 128)

**Steps to fix:**
- [x] Extract the `transitionend` callback body (lines 127-130) into a new helper function named `resetContentWrapAfterExpand(contentWrap)` that clears `contentWrap.style.overflow` and `contentWrap.style.maxHeight`.
- [x] Replace the inline `transitionend` callback with a call to `resetContentWrapAfterExpand(contentWrap)`.

---

## After Implementation
*Implemented: March 10, 2026*

### What changed

`src/entry-manager/entry-manager.utils.js`
- Reused the existing `setChecked(...)` helper so checkbox state and icon updates now flow through one shared path.
- Replaced repeated UI state and ARIA attribute strings with named constants to make the file easier to maintain.
- Extracted the expand-transition cleanup into `resetContentWrapAfterExpand(...)` so the collapse-row click logic is flatter and easier to read.

### Risks / What might break

- If future code in this file bypasses `setChecked(...)`, the checkbox icon and input state could drift again.
- If another selector or attribute string was meant to differ from the shared constants later, reusing the constant could hide that change unless it is updated intentionally.
- The expand cleanup still depends on the `transitionend` event firing, so unusual CSS changes could affect when the reset runs.

### Manual checks

- Open any multiselect dropdown in the Entry Manager and toggle a checkbox. Success looks like the check icon always matching the checked state.
- Open and close an Entry Manager dropdown. Success looks like the menu opening and closing normally, with the trigger’s expanded accessibility state still working.
- Expand and collapse a collapsible Entry Manager row. Success looks like the animation finishing cleanly with no stuck height or overflow styling.
