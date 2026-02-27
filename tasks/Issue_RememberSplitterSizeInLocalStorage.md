# ISSUE: Remember splitter size in local storage
*Created: 2026-02-27*

**Type:** ISSUE
**Status:** IMPLEMENTED

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
