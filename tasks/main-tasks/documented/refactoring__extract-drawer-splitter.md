# REFACTORING: Extract drawer splitter into its own module
*Created: March 4, 2026*

**Type:** Refactoring
**Status:** DOCUMENTED

---

## Summary

The splitter — the draggable divider between the book list and the entry editor — is implemented
entirely inside `src/drawer.js`. All its constants, helpers, and ~210-line setup block should
move to their own file (`src/drawer.splitter.js`) so that `drawer.js` stays focused on
orchestrating the drawer as a whole, and splitter logic has a clear, findable home.

No user-visible behavior changes. This is pure code reorganization.

## Current Behavior

All splitter logic (constants, storage helpers, DOM creation, drag handlers, resize listener,
restore function) is defined inline inside the `addDrawer` closure in `src/drawer.js`,
mixed in with unrelated drawer bootstrap code.

## Expected Behavior

After this change, `src/drawer.splitter.js` owns everything splitter-related. `src/drawer.js`
imports and calls `initSplitter(body, list)` and receives back the `restoreSplitterForCurrentLayout`
function it needs to call in two places.

## Agreed Scope

- **New file:** `src/drawer.splitter.js`
- **Modified:** `src/drawer.js`
- **Doc updates:** `ARCHITECTURE.md`, `FEATURE_MAP.md`

## Implementation Plan

- [ ] Create `src/drawer.splitter.js` as an ES module. Add at the top:
  - Import `debounce` from `'../../../../utils.js'` (same path used in `drawer.js`)
  - Define and export a single function: `export function initSplitter(body, list) { ... }`

- [ ] Inside `initSplitter(body, list)`, move (in order from `drawer.js`):
  1. The 8 constants currently at lines 220–228:
     `DESKTOP_SPLITTER_STORAGE_KEY`, `MOBILE_SPLITTER_STORAGE_KEY`,
     `LEGACY_DESKTOP_SPLITTER_STORAGE_KEY`, `LEGACY_MOBILE_SPLITTER_STORAGE_KEY`,
     `MOBILE_LAYOUT_BREAKPOINT`, `MIN_LIST_WIDTH`, `MIN_EDITOR_WIDTH`,
     `MIN_LIST_HEIGHT`, `MIN_EDITOR_HEIGHT`
  2. The `isMobileLayout` arrow function (line 229)
  3. `getStoredSplitterSize` (lines 230–239)
  4. `saveSplitterSize` (lines 240–245)
  5. The entire body of the `const splitter = document.createElement('div'); { ... }` block
     (lines 679–888): internal state variables, all helper functions, both drag event handlers,
     the `onLayoutResize` debounced handler, and the `restoreSplitterForCurrentLayout` assignment
  6. At the end of `initSplitter`, return `restoreSplitterForCurrentLayout`

- [ ] In `src/drawer.js`, make the following changes:
  1. Add at the top: `import { initSplitter } from './drawer.splitter.js';`
  2. Remove the 8 constants (lines 220–228) and `isMobileLayout` (line 229)
  3. Remove `getStoredSplitterSize` (lines 230–239) and `saveSplitterSize` (lines 240–245)
  4. Remove the line: `let restoreSplitterForCurrentLayout = ()=>{};` (line 678)
  5. Replace the entire `const splitter = document.createElement('div'); { ... }` block
     (lines 679–888) with a single line:
     `const restoreSplitterForCurrentLayout = initSplitter(body, list);`
  6. Verify the two call sites remain unchanged:
     - `restoreSplitterForCurrentLayout();` after `drawerContent.append(body);`
     - `restoreSplitterForCurrentLayout();` inside the `moDrawer` MutationObserver callback

- [ ] Update `ARCHITECTURE.md`:
  - Add `src/drawer.splitter.js` to the project structure tree under `src/` (after `drawer.js`)
  - Add a row to the Module Responsibilities table:
    `src/drawer.splitter.js | Desktop/mobile splitter DOM creation, drag-resize handlers, size persistence, and layout-restore logic`
  - Update the `drawer.js` row to remove "desktop/mobile splitter behavior" from its description

- [ ] Update `FEATURE_MAP.md`:
  - In the "Bootstrap & runtime sync" section, change the splitter entry to point to
    `src/drawer.splitter.js` (currently says `→ src/drawer.js`)
  - In the "Persistence & settings" section, change the splitter persistence entry to point to
    `src/drawer.splitter.js` (currently says `→ src/drawer.js`)
