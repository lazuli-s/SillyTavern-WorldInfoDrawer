# CODE REVIEW FINDINGS: `src/drawer.splitter.js`
*Reviewed: March 6, 2026*

## Scope

- **File reviewed:** `src/drawer.splitter.js`
- **Helper files consulted:** `ARCHITECTURE.md`, `FEATURE_MAP.md`, `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`, `.claude/skills/st-js-best-practices/references/patterns.md`, `vendor/SillyTavern/public/scripts/st-context.js`, `style.css`
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** List/editor splitter drag resize for desktop and mobile, saved splitter state persistence, and layout restore behavior.

---

## F01: Splitter size is not re-clamped when the window changes size without crossing the mobile breakpoint

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If the user makes the book list wide, then shrinks the app window but stays in the same layout type, the saved width is kept as-is. That can leave the editor side squeezed below its minimum usable size.

- **Category:** UI Correctness

- **Location:**
  `src/drawer.splitter.js` in `onLayoutResize` / `restoreSplitterForCurrentLayout` (`if (isMobile === lastLayoutIsMobile) return;`)

- **Detailed Finding:**
  The module correctly clamps splitter values inside `applyDesktopWidthWithBounds()` and `applyMobileHeightWithBounds()`, but that clamping is only exercised during drag and during `restoreSplitterForCurrentLayout()`. The resize handler at lines 235-240 exits early whenever the viewport stays in the same orientation bucket, so a normal desktop-to-smaller-desktop resize or mobile-height change never re-applies bounds. Because the list panel uses fixed pixel `width` / `flex-basis` or `height`, an older larger splitter value can remain applied after the available container shrinks, even though `getDesktopMaxWidth()` / `getMobileMaxHeight()` would now return a smaller maximum. The result is a list pane that keeps too much space and an editor pane that can collapse below the intended minimums.

- **Why it matters:**
  This directly affects usability in common cases like resizing the browser window, docking panels, or rotating a device. The editor can become cramped or effectively unusable until the user manually drags the splitter again.

- **Severity:** Medium ❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Keep the current stored-size model, but make resize handling re-apply the current layout bounds even when the layout type does not switch. That changes behavior only when the existing size has become invalid for the new viewport.

- **Proposed fix:**
  Update `onLayoutResize` so it does not return immediately for same-layout resizes. When `isMobile === lastLayoutIsMobile`, re-clamp the currently applied size by calling `applyDesktopWidthWithBounds(appliedListWidth)` or `applyMobileHeightWithBounds(appliedListHeight)`, and persist the clamped value back through `saveSplitterSize(...)` if it changed. Keep the existing breakpoint-switch path that calls `restoreSplitterForCurrentLayout()`.

- **Implementation Checklist:**
  - [ ] Change `onLayoutResize` to re-apply desktop bounds with `applyDesktopWidthWithBounds(appliedListWidth)` during desktop-to-desktop resizes.
  - [ ] Change `onLayoutResize` to re-apply mobile bounds with `applyMobileHeightWithBounds(appliedListHeight)` during mobile-to-mobile resizes.
  - [ ] Persist the corrected size to the matching storage keys when resize clamping reduces the current splitter size.

- **Fix risk:** Low 🟢
  The change stays inside this module and only runs on resize, using the module’s existing clamping helpers and storage functions.

- **Why it's safe to implement:**
  It does not alter drag behavior, storage key names, orientation switching, or any World Info data flow. It only corrects already-out-of-bounds UI sizes.

- **Pros:**
  Prevents editor collapse after browser/device resizing, keeps splitter behavior consistent with the module’s own min/max rules, and reduces the need for manual user recovery.

### STEP 2: META CODE REVIEW

🟢 Ready to implement

#### Implementation Checklist

- [x] Change `onLayoutResize` to re-apply desktop bounds with `applyDesktopWidthWithBounds(appliedListWidth)` during desktop-to-desktop resizes.
- [x] Change `onLayoutResize` to re-apply mobile bounds with `applyMobileHeightWithBounds(appliedListHeight)` during mobile-to-mobile resizes.
- [x] Persist the corrected size to the matching storage keys when resize clamping reduces the current splitter size.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/drawer.splitter.js`
  - Added `reapplyBoundsForCurrentLayout()` so same-layout resizes re-clamp the current splitter size instead of returning early.
  - Persisted the corrected desktop or mobile splitter size when a resize forces the list pane back within the current layout limits.

- Risks / Side effects
  - Resize events now perform one extra clamp/apply pass for the active layout, which could reveal any hidden assumptions about stale splitter values in manual testing. (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] On desktop, drag the list pane wide, shrink the drawer without crossing the mobile breakpoint, and confirm the editor keeps a usable minimum width.
  - Mobile height corrections now save immediately after resize clamping, so manual verification should confirm the restored height matches the newly clamped value after a reload. (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] On a narrow/mobile layout, drag the top pane tall, reduce the drawer height, reload, and confirm the stored top pane height stays within the visible space.

---

## F02: Direct import from SillyTavern internals uses the brittle path without documenting why the stable context API is not available

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  This file reaches into SillyTavern’s internal utility file directly. That can break after a SillyTavern update, and the code does not explain why it had to use that less-stable route.

- **Category:** JS Best Practice

- **Location:**
  `src/drawer.splitter.js` import section (`import { debounce } from '../../../../utils.js';`)

- **Detailed Finding:**
  The file imports `debounce` from `../../../../utils.js` at line 1. Per `st-js-best-practices` COMPAT-01, extensions should prefer `SillyTavern.getContext()` over direct imports from core source files because those relative import paths are an internal implementation detail and are more likely to change upstream. `vendor/SillyTavern/public/scripts/st-context.js` does not currently expose `debounce`, so a direct import may be unavoidable here, but the exception path in COMPAT-01 requires documenting why the stable context surface cannot be used. The current file provides no such note, so future maintainers have no signal that this is an intentional exception rather than an accidental contract violation.

- **Why it matters:**
  This is a maintenance risk. If upstream moves or renames the utility export, this file can fail to load, and the reason for using the brittle import path will not be obvious during debugging.

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Treat this as an explicit compatibility exception rather than an implicit one. Keep behavior unchanged, but document the reason at the import site so the risk is visible and easier to revisit later.

- **Proposed fix:**
  Add a short comment above the `debounce` import noting that `SillyTavern.getContext()` does not expose `debounce`, so this file intentionally uses the direct utility import as a COMPAT-01 exception. If the project has a shared compatibility helper for such imports, use that instead; otherwise keep the import path unchanged.

- **Implementation Checklist:**
  - [ ] Add an inline comment above the `debounce` import explaining that `getContext()` does not expose this helper and that the direct import is an intentional compatibility exception.
  - [ ] Keep the import path in the most specific SillyTavern utility module unless the repository already has a local wrapper for host utilities.

- **Fix risk:** Low 🟢
  This is a documentation-only change unless the repository already has an established wrapper helper to reuse.

- **Why it's safe to implement:**
  It does not change runtime behavior, event flow, DOM behavior, or persisted data. It only makes the existing compatibility trade-off explicit.

- **Pros:**
  Makes the upstream dependency easier to maintain, aligns the file with the project’s JS compatibility rules, and reduces future debugging ambiguity.

### STEP 2: META CODE REVIEW

🟢 Ready to implement

#### Implementation Checklist

- [x] Add an inline comment above the `debounce` import explaining that `getContext()` does not expose this helper and that the direct import is an intentional compatibility exception.
- [x] Keep the import path in the most specific SillyTavern utility module unless the repository already has a local wrapper for host utilities.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/drawer.splitter.js`
  - Added a COMPAT-01 comment above the direct `debounce` import so the brittle host import is documented as an intentional exception.
