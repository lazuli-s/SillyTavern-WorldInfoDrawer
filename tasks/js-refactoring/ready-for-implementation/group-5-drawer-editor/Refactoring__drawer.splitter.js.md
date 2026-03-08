# REFACTORING: drawer.splitter.js
*Created: July 3, 2026*

**File:** `src/drawer.splitter.js`
**Findings:** 8 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 3 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 3 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **8** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The "drag the splitter" logic is written twice: once for desktop width dragging and once for mobile height dragging. This makes the file harder to maintain, because fixing a bug or changing behavior requires making the same change in two places.

**Where:**
- `src/drawer.splitter.js`, lines 143-196 - desktop splitter pointer drag logic (width)
- `src/drawer.splitter.js`, lines 198-251 - mobile splitter pointer drag logic (height)

**Steps to fix:**
- [ ] Extract the shared drag pattern into a new function named `attachSplitterPointerDragHandlers(...)` near the top of the file (after the helper functions). Suggested parameters:
  - [ ] `splitterEl` (the element that receives the pointerdown)
  - [ ] `shouldHandleDrag()` (returns true when the current layout should allow dragging)
  - [ ] `getStartCoord(evt)` (returns `evt.clientX` or `evt.clientY`)
  - [ ] `getStartSize()` (returns current list width or height)
  - [ ] `minSize`, `getMaxSize()`
  - [ ] `applyWithBounds(nextSize)` (applies and returns the new applied size)
  - [ ] `saveAppliedSize(appliedSize)` (persists the final size to storage)
- [ ] Replace the desktop handler (lines 143-196) with a call to `attachSplitterPointerDragHandlers(...)` configured for width dragging and desktop layout.
- [ ] Replace the mobile handler (lines 198-251) with a call to `attachSplitterPointerDragHandlers(...)` configured for height dragging and mobile layout.
- [ ] Ensure the extracted helper still uses the same animation-frame throttling behavior (the `requestAnimationFrame` block) so performance stays the same.

---

### [2] DRY-01 - Duplicated code block

**What:** The code that "applies a list size to CSS" is duplicated for width and height. The two versions do the same steps (clamp a minimum, build a `px` string, avoid unnecessary style writes, and clear conflicting CSS properties) but with different property names. Keeping these in sync over time is error-prone.

**Where:**
- `src/drawer.splitter.js`, lines 70-78 - `applyListWidth(value)`
- `src/drawer.splitter.js`, lines 79-87 - `applyListHeight(value)`
- `src/drawer.splitter.js`, lines 88-92 - `applyDesktopWidthWithBounds(value)`
- `src/drawer.splitter.js`, lines 93-97 - `applyMobileHeightWithBounds(value)`

**Steps to fix:**
- [ ] Extract the shared "apply list size" pattern into a new function named `applyListSizeCss(...)`. Suggested parameters:
  - [ ] `value`, `minValue`
  - [ ] `axis` set to `'width'` or `'height'`
  - [ ] `appliedValue` (previous applied width/height) so the function can short-circuit when nothing changed
- [ ] Update `applyListWidth` and `applyListHeight` to become thin wrappers around `applyListSizeCss(...)`.
- [ ] Extract the "clamp then apply then store the applied value" pattern into a helper named `applyListSizeWithBounds(...)`.
- [ ] Update `applyDesktopWidthWithBounds` and `applyMobileHeightWithBounds` to call `applyListSizeWithBounds(...)` with their layout-specific max-size function.

---

### [3] DRY-01 - Duplicated code block

**What:** The helper functions for computing layout bounds and defaults are duplicated between desktop (width) and mobile (height). The duplicated structure makes it harder to adjust the sizing math later without missing one path.

**Where:**
- `src/drawer.splitter.js`, lines 52-56 - `getDesktopMaxWidth()`
- `src/drawer.splitter.js`, lines 57-61 - `getMobileMaxHeight()`
- `src/drawer.splitter.js`, lines 62-65 - `getDefaultDesktopWidth()`
- `src/drawer.splitter.js`, lines 66-69 - `getDefaultMobileHeight()`

**Steps to fix:**
- [ ] Extract the shared "max size" pattern into a function named `getMaxListSizeForLayout(...)` that can calculate either max width (desktop) or max height (mobile). Suggested parameters:
  - [ ] `bodyEl`, `splitterEl`
  - [ ] `minListSize`, `minEditorSize`
  - [ ] `measureAxis` set to `'width'` or `'height'`
- [ ] Extract the shared "default size" pattern into a function named `getDefaultListSizeForLayout(...)`. Suggested parameters:
  - [ ] `bodyEl`, `ratio`, `fallbackPx`
  - [ ] `minListSize`, `getMaxListSize()`
- [ ] Replace the four helpers above with calls to the new shared functions.

---

### [4] DRY-02 - Magic value

**What:** The value `6` appears 2 times. It represents the fallback thickness of the splitter handle (in pixels) when the element returns `0` size and should be a named constant.

**Where:**
- `src/drawer.splitter.js`, line 53
- `src/drawer.splitter.js`, line 58

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const SPLITTER_THICKNESS_FALLBACK_PX = 6;`
- [ ] Replace each occurrence of the raw literal with `SPLITTER_THICKNESS_FALLBACK_PX`.

---

### [5] NAME-01 - Shape-based name

**What:** `splitterH` (line 42) describes the element by its shape ("H") rather than its purpose. Reading the name alone does not clearly tell the reader what role it plays in the UI.

**Where:** `src/drawer.splitter.js`, line 42

**Steps to fix:**
- [ ] Rename `splitterH` to `mobileSplitter` (or `horizontalSplitter`) everywhere it appears in this file.
- [ ] Rename `splitter` (line 38) to `desktopSplitter` to make the desktop/mobile distinction explicit.

---

### [6] SIZE-01 - Large function

**What:** `initSplitter` is 235 lines long (lines 35-269). It is doing too much: it creates DOM elements and also defines sizing math and also wires drag handlers and also wires resize/unload cleanup behavior.

**Where:** `src/drawer.splitter.js`, lines 35-269

**Steps to fix:**
- [ ] Extract DOM creation (lines 38-46) into a new function named `createSplitters(body)` that returns `{ desktopSplitter, mobileSplitter }`.
- [ ] Extract sizing helpers (lines 51-122) into a new function named `createSplitterSizingHelpers(body, list, desktopSplitter, mobileSplitter)` that returns the helper functions needed by the rest of `initSplitter`.
- [ ] Extract `restoreSplitterForCurrentLayout` (lines 124-141) into a named function `restoreSplitterForCurrentLayout()` so it can be placed with other top-level helpers and kept short.
- [ ] Extract desktop drag wiring (lines 143-196) into `attachDesktopSplitterDragHandlers(...)`.
- [ ] Extract mobile drag wiring (lines 198-251) into `attachMobileSplitterDragHandlers(...)`.
- [ ] Extract resize and unload wiring (lines 253-265) into `attachLayoutResizeHandler(...)`.
- [ ] After extraction, keep `initSplitter` as a short orchestrator that calls these helpers and returns `restoreSplitterForCurrentLayout`.

---

### [7] SIZE-01 - Large function

**What:** The desktop `pointerdown` handler function is 54 lines long (lines 143-196). It mixes multiple jobs: starting the drag, throttling UI updates, and cleaning up event listeners and saving the final value.

**Where:** `src/drawer.splitter.js`, lines 143-196

**Steps to fix:**
- [ ] Extract the handler body into a named function `onDesktopSplitterPointerDown(evt)` so it can be tested and reviewed separately.
- [ ] Within that function, extract cleanup into `cleanupDesktopSplitterDrag(endEvt)` (based on lines 167-186).
- [ ] If implementing Finding [1], replace most of this handler with a call to the shared `attachSplitterPointerDragHandlers(...)` helper instead.

---

### [8] SIZE-01 - Large function

**What:** The mobile `pointerdown` handler function is 54 lines long (lines 198-251). It mixes multiple jobs: starting the drag, throttling UI updates, and cleaning up event listeners and saving the final value.

**Where:** `src/drawer.splitter.js`, lines 198-251

**Steps to fix:**
- [ ] Extract the handler body into a named function `onMobileSplitterPointerDown(evt)` so it can be tested and reviewed separately.
- [ ] Within that function, extract cleanup into `cleanupMobileSplitterDrag(endEvt)` (based on lines 222-241).
- [ ] If implementing Finding [1], replace most of this handler with a call to the shared `attachSplitterPointerDragHandlers(...)` helper instead.