# ISSUE: Remember splitter size in local storage
*Created: 2026-02-27*

**Type:** ISSUE
**Status:** FINISHED

---

## Summary

The drawer splitter should remember the user-selected size after reload.
The request specifically asked to remember splitter size in local storage.

## What changed

- Updated `src/drawer.js` to use dedicated keys:
  - `stwid--splitter-size` (desktop width)
  - `stwid--splitter-size-mobile` (mobile height)
- Added backward compatibility:
  - Reads legacy keys `stwid--list-width` and `stwid--list-height` if new keys are missing.
  - Writes both new and legacy keys so users on mixed versions keep consistent behavior.
- Updated persistence documentation in `ARCHITECTURE.md` and `FEATURE_MAP.md`.

## Why this change

- Matches requested key naming around splitter size.
- Keeps existing users from losing their saved splitter size.

## Manual check

- Not run in this environment.
- Reload the browser tab and confirm splitter size is preserved for desktop and mobile layouts.

---

## Post-Implementation Review

Reviewed: February 27, 2026

### Files Inspected

*No `Files Changed` section was present in the task file. File inferred from the implementation description.*

- `src/drawer.js`

### Findings

#### PIR-01: Layout switch overwrites saved splitter size

- **Category:** Bug

- **Severity:** Medium ❗

- **Location:** `src/drawer.js` — `onLayoutResize` / `applyOrientationDefault()` (lines 704–712, 843–848)

- **Summary:** When the browser window is resized across the 1000 px mobile/desktop breakpoint, `onLayoutResize` calls `applyOrientationDefault(isMobile)`. That function computes the *default* size for the new orientation and immediately saves it to `localStorage`, overwriting any previously stored value. So if a user has dragged the splitter on mobile, then resizes the browser to a desktop width and back again, their saved mobile size is replaced with the default. This directly contradicts the feature goal of remembering user-selected sizes.

  The existing `restoreSplitterForCurrentLayout()` function already handles this correctly: it reads the stored value first and only falls back to the default if nothing is stored. The resize handler should call that function instead of `applyOrientationDefault`.

- **Confidence:** High 😀 — The overwrite path is fully traceable in code with no runtime assumptions needed.

- **Fix risk:** Low 🟢 — The fix is a one-line swap inside `onLayoutResize`. `restoreSplitterForCurrentLayout` is already in scope at that point, and its logic already handles both the "stored value exists" and "no stored value" cases correctly.

- **Fix Plan:**
  - [x] In `src/drawer.js`, inside the `onLayoutResize` debounce callback (around line 847), replace the call `applyOrientationDefault(isMobile)` with `restoreSplitterForCurrentLayout()`.
  - [x] Verify that `restoreSplitterForCurrentLayout` is declared before `onLayoutResize` in the same scope (it is — line 714 vs line 843), so no hoisting issues arise.
  - [ ] Manually test: set a custom splitter size, resize the window across the 1000 px breakpoint, resize back, and confirm the original size is restored rather than the default.

- **Requires human judgment:** No

---

## Post-Implementation Fixes

Implemented: February 27, 2026

- [x] **PIR-01**: Layout switch overwrites saved splitter size
  - **What changed**: When the browser window crossed the mobile/desktop size boundary, the code was resetting the splitter to its default size and saving that default over the user's custom size. Changed the resize handler to call the existing restore function instead, which reads the saved size first and only falls back to the default when nothing is stored. User-selected sizes are now preserved across layout switches.
