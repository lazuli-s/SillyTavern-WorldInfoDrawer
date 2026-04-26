# REWORK: Mobile panel navigation (back button replaces splitter)
*Created: April 26, 2026*

**Type:** Rework
**Status:** IMPLEMENTED

---

## Summary

On mobile screens (≤ 1000 px wide), the horizontal drag splitter is broken — it is hard to
hit with a finger, it overlaps content, and the resulting layout is unusable. This task removes
the mobile splitter entirely and replaces it with a "Back to Books" button. On mobile, only one
panel is visible at a time: the book browser fills the screen by default, and tapping an entry
(or opening the Entry Manager) replaces it with the editor or entry manager full-screen. Tapping
the back button returns to the book browser. Desktop is unaffected.

## Current Behavior

On mobile, the drawer splits into two stacked panels — the book browser on top and the
editor/entry manager on the bottom — separated by a horizontal drag handle. The drag handle
is difficult to use on touch screens, the panels can end up too small to read, and the overall
layout is hard to use.

## Expected Behavior

After this change, on mobile:
- The book browser fills the full screen by default. The editor panel is hidden.
- When the user taps an entry, or opens the Entry Manager, the book browser hides and the
  editor or entry manager fills the full screen.
- A "← Back to Books" button appears at the top of both panels.
- Tapping that button closes the current panel and returns to the book browser. No confirmation
  is needed (the editor auto-saves as you type).
- The horizontal drag splitter no longer exists on mobile.
- Desktop layout (drag splitter, side-by-side panels) is completely unchanged.

## Agreed Scope

Files to change:

- `src/drawer.splitter.js` — remove mobile splitter DOM creation and all mobile sizing logic
- `src/drawer.js` — wrap `dom.editor` in a new `.stwid--editor-panel` container that holds the
  back button; wire the back button click handler
- `src/editor-panel/editor-panel.js` — add/remove `stwid--mobile-panel-open` on `dom.drawer.body`
  when the editor shows or hides content
- `src/entry-manager/entry-manager.js` — add `stwid--mobile-panel-open` when the Entry Manager opens
- `src/book-browser/browser-tabs/browser-tabs.settings-tab.js` — remove `stwid--mobile-panel-open`
  when the Entry Manager toggle button closes the panel
- `style.css` — mobile layout rules (hide/show panels by class, style the back button, remove
  the mobile splitter display rule)

## Out of Scope

- Desktop layout changes (splitter stays as-is on desktop)
- Any confirmation dialog on back-button press (auto-save makes it unnecessary)
- Animation or slide transition between panels

---

## Implementation Plan

### Step 1 — `src/drawer.splitter.js`: remove mobile splitter

- [x] In `createSplitters(body)`: remove the creation and `body.append` of `mobileSplitter`.
  Return only `{ desktopSplitter }`. Remove `mobileSplitter` from the return object entirely.

- [x] In `createSplitterSizingHelpers(body, list, desktopSplitter, mobileSplitter)`: remove the
  `mobileSplitter` parameter. Remove the following local variables and their helper closures:
  `getMobileMaxHeight`, `getDefaultMobileHeight`, `applyListHeight` (the height variant),
  `setAppliedListHeight`, `applyMobileHeightWithBounds`.
  Remove `appliedListHeight` local variable. Remove the mobile branch from `applyOrientationDefault`
  so it only handles the desktop case; change its signature to remove the `mobileLayout` boolean
  parameter and rename to call only `applyDesktopWidthWithBounds`. Remove `getMobileMaxHeight`,
  `getDefaultMobileHeight`, `applyMobileHeightWithBounds`, `getAppliedListHeight`, and
  `setAppliedListHeight` from the returned object.

- [x] In `reapplyBoundsForCurrentLayout(mobileLayout)`: add `if (mobileLayout) return;` as the
  first line so that on mobile the function is a no-op.

- [x] In `createRestoreSplitterForCurrentLayout`: in the returned `restoreSplitterForCurrentLayout`
  function, add `if (isMobileLayout()) return;` as the first line so that on mobile the
  function is a no-op.

- [x] In `initSplitter(body, list)`: update the destructuring from `createSplitters` to only
  pull out `desktopSplitter` (drop `mobileSplitter`). Update the `createSplitterSizingHelpers`
  call to remove the `mobileSplitter` argument. Remove the entire `attachMobileSplitterDragHandlers`
  call and its argument block.

- [x] Delete the `attachMobileSplitterDragHandlers` function (lines 189–210) entirely, as it is
  no longer called.

- [x] Remove the constants `MOBILE_SPLITTER_STORAGE_KEY` and `LEGACY_MOBILE_SPLITTER_STORAGE_KEY`,
  `MIN_LIST_HEIGHT`, and `MIN_EDITOR_HEIGHT` since they are now unused.

---

### Step 2 — `style.css`: mobile layout rules

- [x] In the splitter media query block (`@media screen and (max-width: 1000px)` around line 170):
  remove the rule that sets `.stwid--splitter-h { display: block; ... }`. The element will no
  longer be created, so the rule is dead. Leave the `.stwid--splitter { display: none; }` rule
  because the desktop splitter element still exists in the DOM on mobile.

- [x] Add a new CSS rule (outside any media query, near the other `.stwid--editor-panel` rules)
  for the new wrapper element introduced in Step 3:
  ```css
  .stwid--editor-panel {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  ```

- [x] Add a new rule (also outside any media query) for the back button — hidden on desktop:
  ```css
  .stwid--mobile-back-btn {
    display: none;
  }
  ```

- [x] Inside the existing `@media screen and (max-width: 1000px)` block (near the
  `body.stwid-- #WorldInfo > .stwid--body` rule), add the following mobile panel layout rules:
  ```css
  /* Book browser fills screen by default on mobile */
  body.stwid-- #WorldInfo > .stwid--body .stwid--list {
    flex: 1 1 auto;
    height: auto;
  }

  /* Editor panel hidden by default on mobile */
  body.stwid-- #WorldInfo > .stwid--body .stwid--editor-panel {
    display: none;
  }

  /* When a panel is open: hide book browser, show editor panel full-screen */
  body.stwid-- #WorldInfo > .stwid--body.stwid--mobile-panel-open .stwid--list {
    display: none;
  }

  body.stwid-- #WorldInfo > .stwid--body.stwid--mobile-panel-open .stwid--editor-panel {
    display: flex;
    flex: 1 1 auto;
  }

  /* Back button visible on mobile */
  .stwid--mobile-back-btn {
    display: flex;
    align-items: center;
    gap: 0.4em;
    flex: 0 0 auto;
    width: 100%;
    padding: 0.5em 0.75em;
    font-size: 0.9em;
  }
  ```

---

### Step 3 — `src/drawer.js`: wrapper div + back button

- [x] Modify `buildDrawerEditorContainer({ dom, wiHandlerApi })` to create a wrapper element
  before creating `dom.editor`:
  ```js
  const editorPanel = document.createElement('div');
  editorPanel.classList.add('stwid--editor-panel');

  const mobileBackBtn = document.createElement('button');
  mobileBackBtn.classList.add('stwid--mobile-back-btn', 'menu_button');
  mobileBackBtn.type = 'button';
  const backIcon = document.createElement('i');
  backIcon.classList.add('fa-solid', 'fa-arrow-left');
  mobileBackBtn.append(backIcon, document.createTextNode(' Back to Books'));
  editorPanel.append(mobileBackBtn);

  const editor = document.createElement('div');
  dom.editor = editor;
  editor.classList.add('stwid--editor');
  // ... keep the existing click listener on editor ...
  editorPanel.append(editor);

  return { editorContainer: editorPanel, mobileBackBtn };
  ```

- [x] In `buildAndAttachDrawerDom`, update the line that calls `buildDrawerEditorContainer` to
  destructure both values:
  ```js
  const { editorContainer, mobileBackBtn } = buildDrawerEditorContainer({ dom, wiHandlerApi });
  ```

- [x] In `buildAndAttachDrawerDom`, after `editorPanelApi` is created (after the
  `initEditorPanel` call), add a constant and wire the back button click handler:
  ```js
  const ENTRY_MANAGER_ACTIVE_CLASS = 'stwid--state-active';

  mobileBackBtn.addEventListener('click', () => {
      if (dom.order.toggle?.classList?.contains(ENTRY_MANAGER_ACTIVE_CLASS)) {
          dom.order.toggle.click();
      } else {
          editorPanelApi.clearEditor();
      }
  });
  ```
  Place this block immediately after `setEditorPanelApi.current = editorPanelApi;`.

  Implementation note: the final handler calls `editorPanelApi.resetEditorState()` for the
  non-Entry-Manager path instead of `clearEditor()` so activation settings are safely moved
  back to their original parent before returning to the book browser.

---

### Step 4 — `src/editor-panel/editor-panel.js`: mobile panel class hooks

- [x] Define a new constant near the top of the file:
  ```js
  const MOBILE_PANEL_OPEN_CLASS = 'stwid--mobile-panel-open';
  ```

- [x] In `createEditorClearer`, inside `clearEditor({ resetCurrent = true } = {})`, in the
  `if (resetCurrent)` block, add the following line **before** `resetEditorOwnership()`:
  ```js
  dom.drawer.body?.classList?.remove(MOBILE_PANEL_OPEN_CLASS);
  ```

- [x] In `renderEntryEditorDom` (the function starting around line 179), after the line
  `appendUnfocusButton()` and before the `if (header) dom.editor.append(header)` line, add:
  ```js
  dom.drawer.body?.classList?.add(MOBILE_PANEL_OPEN_CLASS);
  ```

- [x] In `renderActivationSettings` (inside `createActivationSettingsController`), after the
  line `dom.editor.append(activationBlock)`, add:
  ```js
  dom.drawer.body?.classList?.add(MOBILE_PANEL_OPEN_CLASS);
  ```

- [x] In `hideActivationSettings` (inside `createActivationSettingsController`), after the
  `clearEditor({ resetCurrent: false })` call, add:
  ```js
  dom.drawer.body?.classList?.remove(MOBILE_PANEL_OPEN_CLASS);
  ```

---

### Step 5 — `src/entry-manager/entry-manager.js`: mobile panel class on open

- [x] Define a new constant near the top of the file (alongside `STATE_ACTIVE_CLASS`):
  ```js
  const MOBILE_PANEL_OPEN_CLASS = 'stwid--mobile-panel-open';
  ```

- [x] In `openEntryManager` (inside `createEntryManagerOpeners`), after the line
  `dom.order.toggle.classList.add(STATE_ACTIVE_CLASS)` and before `renderEntryManager(book)`,
  add:
  ```js
  dom.drawer.body?.classList?.add(MOBILE_PANEL_OPEN_CLASS);
  ```

---

### Step 6 — `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`: mobile panel class on close

- [x] Define a new constant near the top of the file (alongside `ACTIVE_STATE_CLASS`):
  ```js
  const MOBILE_PANEL_OPEN_CLASS = 'stwid--mobile-panel-open';
  ```

- [x] In the `entryManagerToggleButton` click handler, in the `if (isActive)` branch, after
  the line `entryManagerToggleButton.classList.remove(ACTIVE_STATE_CLASS)` and before
  `getEditorPanelApi()?.clearEditor?.()`, add:
  ```js
  dom.drawer.body?.classList?.remove(MOBILE_PANEL_OPEN_CLASS);
  ```

---

## After Implementation
*Implemented: April 26, 2026*

### What changed

`src/drawer.splitter.js`
- Removed the mobile splitter element and touch-drag sizing path.
- Kept the desktop splitter restore and resize behavior unchanged.

`src/drawer.js`
- Wrapped the editor in a new panel container.
- Added a mobile-only "Back to Books" button that closes Entry Manager or resets the current editor panel.

`src/editor-panel/editor-panel.js`
- Marks the mobile panel as open when an entry editor or activation settings are shown.
- Removes that marker when the editor panel is cleared or activation settings close.

`src/entry-manager/entry-manager.js`
- Marks the mobile panel as open when Entry Manager opens.

`src/book-browser/browser-tabs/browser-tabs.settings-tab.js`
- Removes the mobile panel marker when the Entry Manager toggle closes the panel.

`style.css`
- Removed the mobile splitter display rule.
- Added mobile rules that show either the book browser or the editor/Entry Manager panel full-screen.
- Added styling for the mobile back button.

`ARCHITECTURE.md` and `FEATURE_MAP.md`
- Updated the docs so the splitter is described as desktop-only and mobile panel navigation is mapped to its owning files.

### Risks / What might break

- This touches mobile panel visibility, so mobile users might see the wrong panel if a code path opens editor content without adding the mobile-open class.
- This changes the editor container structure, so any CSS that assumed `.stwid--editor` was the direct child of the drawer body could need adjustment.
- This removes mobile splitter persistence, so old saved mobile splitter heights are ignored.

### Manual checks

- On a screen 1000 px wide or narrower, open the drawer. The book browser should fill the drawer and no horizontal splitter should appear.
- Tap an entry. The book browser should hide, the editor should fill the drawer, and the "Back to Books" button should be visible at the top.
- Tap "Back to Books" from an entry editor. The book browser should return and the editor should close.
- Open Entry Manager on mobile. Entry Manager should fill the drawer and the back button should return to the book browser.
- On desktop, drag the vertical splitter. It should still resize the book browser and editor side by side.
