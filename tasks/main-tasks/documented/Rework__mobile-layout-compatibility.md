# REWORK: Mobile Layout Compatibility
*Created: March 9, 2026*

**Type:** Rework
**Status:** DOCUMENTED

---

## Summary

The extension already has a basic mobile layout (book list stacked above the editor on narrow screens), but it has several significant problems that make it hard to use on a phone. This task redesigns three specific areas: the entry editor panel, the bulk-edit control bar, and the book browser tab strip.

## Current Behavior

- **Entry editor panel:** When you tap an entry to open it, the editor appears below the book list in the same screen. It overlaps or squeezes the list area, and the editor content cannot be scrolled. There is no way to go back to just the book list.
- **Entry Manager bulk-edit row:** The table underneath the bulk-edit control bar can scroll sideways to reveal all columns, but the bulk-edit row itself cannot scroll — controls that are off the right edge of the screen are unreachable.
- **Book browser tabs:** The tab buttons (Lorebooks, Folders, Visibility, Sorting, Search) show both an icon and a text label. On a narrow phone screen this row is cramped and hard to use.

## Expected Behavior

- **Entry editor panel:** On mobile, when the user taps an entry, the book list slides away and the editor fills the entire screen. A "back" button appears at the top of the editor, and tapping it returns the user to the book list. The editor content scrolls normally within its area.
- **Entry Manager bulk-edit row:** The bulk-edit control bar scrolls horizontally on mobile, matching the behavior of the table below it.
- **Book browser tabs:** At narrow screen widths (≤ 768 px), tab buttons show only their icon — the text label is hidden. Buttons are still clearly tappable.

## Agreed Scope

Three areas are changed:

| Area | Files affected |
|---|---|
| Editor slide-in on mobile | `style.css`, `src/drawer.js`, `src/editor-panel/editor-panel.js` |
| Bulk-edit row horizontal scroll | `style.css` |
| Tab strip icon-only on mobile | `style.css` |

The mobile breakpoint constant (1000 px) already exists in `src/drawer.splitter.js` and as a CSS `@media` query in `style.css`. No new breakpoint is introduced — 768 px is already used in `style.css` for tab and sort adjustments.

## Out of Scope

- Changing the Entry Manager table layout or hiding columns on mobile (the table already scrolls horizontally and all columns should remain accessible).
- Changing the desktop layout in any way.
- Changing the splitter drag behavior.

---

## Implementation Plan

### Area 1 — Editor panel: full-screen slide-in on mobile

The editor panel (`div.stwid--editor`, referenced as `dom.editor` in `drawer.js`) lives inside `div.stwid--body` (`dom.drawer.body`) alongside `div.stwid--list`. The plan adds a persistent "back" button as a sibling of the editor (so it is never erased by `clearEditor()`), and uses a CSS class on `dom.drawer.body` to toggle which panel is visible.

- [ ] **`src/drawer.js` — create the mobile back button element** in `buildDrawerEditorContainer()`.
  - Create a `div` with class `stwid--mobile-back-btn`.
  - Inside it, add a `<button type="button">` containing an `<i class="fa-solid fa-arrow-left"></i>` icon and a `<span>Book list</span>` label.
  - Append `stwid--mobile-back-btn` to `body` *before* appending `dom.editor` (so it appears above the editor in the DOM).
  - The button's click handler should: (1) remove the class `stwid--mobile-editor-open` from `dom.drawer.body`, and (2) call `editorPanelApi.resetEditorState()`. Wire this handler after `editorPanelApi` is available (it is created in `initDrawer`; wire the click inside `initDrawer` after calling `initEditorPanel`, using `dom.mobileBackBtn` stored on the `dom` object).
  - Store the back-button element on `dom` as `dom.mobileBackBtn` so it can be referenced during wiring.

- [ ] **`src/editor-panel/editor-panel.js` — add class when editor content is rendered** (mobile only).
  - At the end of `renderEntryEditorDom()`, after content is appended to `dom.editor`, add:
    ```js
    if (window.innerWidth <= 1000) {
        dom.drawer.body.classList.add('stwid--mobile-editor-open');
    }
    ```
  - In `renderActivationSettings()` (inside `createActivationSettingsController`), apply the same class addition after `dom.editor.append(activationBlock)`.

- [ ] **`src/editor-panel/editor-panel.js` — remove class when editor is cleared**.
  - At the end of `clearEditor()`, after `dom.editor.innerHTML = ''`, add:
    ```js
    dom.drawer.body.classList.remove('stwid--mobile-editor-open');
    ```

- [ ] **`style.css` — hide editor by default on mobile; show list-only view**.
  Inside the existing `@media screen and (max-width: 1000px)` block that targets `.stwid--editor`:
  - Hide the editor when no content is active: the editor is already empty when not in use (content is removed by `clearEditor`), but we want to ensure it takes no space. Add `display: none` (or `flex: 0 0 0; overflow: hidden; min-height: 0`) to `.stwid--editor` at mobile breakpoint by default.
  - When `stwid--mobile-editor-open` is on `.stwid--body`: hide `div.stwid--list` and `div.stwid--splitter-h`, and make `div.stwid--editor` fill all available space.

  Specific rules to add inside the existing `@media screen and (max-width: 1000px)` block:
  ```css
  /* Default: editor hidden on mobile until an entry is opened */
  .stwid--body > .stwid--editor {
    display: none;
  }

  /* When editor is open: hide list + splitter, show editor full height */
  .stwid--body.stwid--mobile-editor-open > .stwid--list,
  .stwid--body.stwid--mobile-editor-open > .stwid--splitter-h {
    display: none;
  }
  .stwid--body.stwid--mobile-editor-open > .stwid--editor {
    display: flex;
    flex: 1 1 auto;
    width: 100%;
    max-width: none;
    overflow-y: auto;
  }
  ```

- [ ] **`style.css` — style the mobile back button**.
  Add a new rule block (outside any media query first, then a mobile-only rule):
  ```css
  /* Mobile back button — hidden on desktop */
  .stwid--mobile-back-btn {
    display: none;
  }

  @media screen and (max-width: 1000px) {
    /* Show only when editor is open */
    .stwid--body.stwid--mobile-editor-open > .stwid--mobile-back-btn {
      display: flex;
      align-items: center;
      padding: 0.4em 0.6em;
      border-bottom: 1px solid var(--SmartThemeBorderColor);
      flex: 0 0 auto;
    }

    .stwid--mobile-back-btn button {
      display: flex;
      align-items: center;
      gap: 0.5em;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--SmartThemeBodyColor);
      font-size: 0.95em;
      padding: 0.3em 0.5em;
      border-radius: var(--stwid-radius-m);
    }

    .stwid--mobile-back-btn button:focus-visible {
      outline: var(--stwid-focus-ring);
      outline-offset: var(--stwid-focus-ring-offset);
    }
  }
  ```

  Also update the `.stwid--body` flex layout at mobile so the back button and editor stack vertically:
  - `.stwid--body.stwid--mobile-editor-open` should be `flex-direction: column` (it already is in column mode on mobile, so this may not need a separate rule).

---

### Area 2 — Bulk-edit row: horizontal scroll on mobile

The bulk-edit row (`.stwid--bulkEditRow`) sits above the table wrapper (`.stwid--orderTableWrap`) in the Entry Manager. The table wrapper already has `overflow-x: auto` at `max-width: 1000px`. The bulk-edit row needs the same treatment.

- [ ] **`style.css` — make `.stwid--bulkEditRow` scroll horizontally on mobile**.
  Inside the existing `@media screen and (max-width: 1000px)` block that already handles `.stwid--orderTableWrap`, add:
  ```css
  .stwid--bulkEditRow {
    overflow-x: auto;
    flex-wrap: nowrap;
  }
  ```
  The `flex-wrap: nowrap` prevents child sections from collapsing vertically, ensuring they remain in a single row that can be scrolled.

  > Note: The existing `@media screen and (max-width: 768px)` rule already reduces the gap and padding of `.stwid--bulkEditRow`. That rule stays unchanged.

---

### Area 3 — Book browser tab strip: icon-only on mobile

The tab button (`button.stwid--iconTabButton`) contains an `<i>` icon element and a `<span>` text label (built in `src/book-browser/browser-tabs/browser-tabs.js` `createTabButton()`). At narrow widths, hiding the `<span>` shows only the icon.

- [ ] **`style.css` — hide tab label text at ≤ 768 px**.
  Add inside the existing `@media screen and (max-width: 768px)` block (or create one if the right block does not already apply here):
  ```css
  .stwid--iconTabButton > span {
    display: none;
  }

  .stwid--iconTabButton {
    gap: 0;
    padding: 0.5em;
  }
  ```
  Hiding the `<span>` still leaves the `title` attribute (already set to `"<Tab name> tab"`) available as a tooltip on long-press or hover, so the tab remains accessible without its label.

  > No JS changes are needed for this area — the icon and span are already separate elements in the DOM.
