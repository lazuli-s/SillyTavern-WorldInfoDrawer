# REWORK: Mobile Controls Tab and Order Helper Collapse
*Created: February 26, 2026*

**Type:** REWORK
**Status:** DOCUMENTED

---

## Summary

Two mobile-only UI improvements for narrow screens (≤ 1000 px wide).
First, the "Visibility" and "Bulk Editor" action rows inside the Order Helper will
start collapsed by default on mobile every time the Order Helper is opened — saving
vertical space without removing any functionality.
Second, the Lorebooks / Folders / Settings action buttons (the top control row in
the list panel) will be moved into a new "Controls" tab on mobile, matching the
pattern already used for the Sorting row, and reducing how much space is consumed
above the book list on small screens.

---

## Current Behavior

**Order Helper on mobile:**
When the Order Helper is opened on a mobile-width screen, the "Visibility" row and
the "Bulk Editor" row are both expanded by default, taking up a large amount of
vertical space before the user even sees the entry table. Both rows already support
collapse/expand (a chevron button in the row title), but they always start expanded.

**Top control row on mobile:**
On all screen sizes, the Lorebooks / Folders / Settings action buttons
(class `stwid--controlsRow`) are always visible above the tab strip (Visibility /
Sorting / Search). On desktop this is fine. On mobile, this row consumes precious
vertical space that the book list needs.

---

## Expected Behavior

**Order Helper on mobile:**
Every time the Order Helper is opened while the viewport is ≤ 1000 px wide, the
"Visibility" row and "Bulk Editor" row will start collapsed. The user can expand
either row at any time by clicking its title. There is no persistent memory of
this collapsed state — each Order Helper open resets to collapsed on mobile.

**Top control row on mobile:**
On screens ≤ 1000 px wide, a new "Controls" tab (sliders icon + "Controls" label)
appears as the **first** tab in the list panel tab strip, and it is the default
active tab when the drawer opens. The `stwid--controlsRow` element is moved inside
this tab's content area. The now-empty `stwid--controls` wrapper is hidden.
On desktop (> 1000 px), nothing changes: no Controls tab exists, the control row
stays above the tab strip as today.

The tab bar (the row of tab buttons) must stay **pinned at the top** of the list
panel while the book list scrolls below it.

---

## Agreed Scope

| File | What changes |
|---|---|
| `src/orderHelperRender.actionBar.js` | Add `initialCollapsed` param to `buildVisibilityRow` and `buildBulkEditRow` |
| `src/orderHelperRender.js` | Pass `initialCollapsed: window.innerWidth <= 1000` to both build calls |
| `src/drawer.js` | Expose `controlsPrimary` via `dom.controlsRow` (same pattern as `dom.sortingRow`) |
| `src/listPanel.filterBar.js` | On mobile, prepend "Controls" tab and move `controlsRowEl` into it |
| `style.css` | Verify/add `position: sticky; top: 0` to `.stwid--iconTabBar` in the mobile block |
| `FEATURE_MAP.md` | Update list-panel tabs and top control row entries |

---

## Out of Scope

- No changes on desktop (> 1000 px) for any part of this task.
- No persistent memory for the Order Helper collapsed state (always resets on mobile).
- No changes to what the Controls tab contains — it shows the same buttons that are
  already in the top control row today.

---

## Implementation Plan

### Phase 1 — Order Helper rows start collapsed on mobile

**File: `src/orderHelperRender.actionBar.js`**

- [x] In `buildVisibilityRow`, add `initialCollapsed = false` to the destructured
  parameter object (the JSDoc `@param` should be updated to document it too).

- [x] After the collapse toggle listener is wired in `buildVisibilityRow`
  (the block near `rowTitle.addEventListener('click', ...)` at the end of the
  function), add an `if (initialCollapsed)` block that:
  - Sets `row.dataset.collapsed = 'true'`
  - Adds `stwid--collapsed` to `row.classList`
  - Removes `fa-chevron-down` from `collapseChevron.classList`
  - Adds `fa-chevron-right` to `collapseChevron.classList`

- [x] Apply the identical change to `buildBulkEditRow`:
  add `initialCollapsed = false` to its parameter object, and add the same
  `if (initialCollapsed)` block after its collapse toggle listener.

**File: `src/orderHelperRender.js`**

- [x] In `renderOrderHelper`, find the call to `buildVisibilityRow({...})` and
  add `initialCollapsed: window.innerWidth <= 1000` to its argument object.

- [x] Find the call to `buildBulkEditRow({...})` and add
  `initialCollapsed: window.innerWidth <= 1000` to its argument object.

---

### Phase 2 — Expose the top control row via the dom map

**File: `src/drawer.js`**

- [x] Locate where `controlsPrimary` is created:
  ```js
  const controlsPrimary = document.createElement('div');
  controlsPrimary.classList.add('stwid--controlsRow');
  ```
  Immediately after those two lines, add:
  ```js
  dom.controlsRow = controlsPrimary;
  ```
  This follows the same pattern already used for `dom.sortingRow = controlsSecondary`.

---

### Phase 3 — Add the mobile Controls tab in the filter bar

**File: `src/listPanel.filterBar.js`** — inside `setupFilter`

- [ ] At the very top of the `setupFilter` function body (before the `filter`
  element is created), add:
  ```js
  const controlsRowEl = runtime?.dom?.controlsRow instanceof HTMLElement
      ? runtime.dom.controlsRow
      : null;
  const isMobile = window.innerWidth <= 1000;
  ```

- [ ] Find the `panelTabs` array definition:
  ```js
  const panelTabs = [
      { id:'visibility', icon:'fa-eye', label:'Visibility' },
      ...
  ];
  ```
  Immediately after this array is defined, add:
  ```js
  if (isMobile && controlsRowEl) {
      panelTabs.unshift({ id:'controls', icon:'fa-sliders', label:'Controls' });
  }
  ```

- [ ] After the `for (const tab of panelTabs)` loop that builds buttons and content
  panels (and after `tabContentsById` is fully populated), add a block that moves
  the controls row element into the Controls tab content and hides its original
  parent wrapper:
  ```js
  if (isMobile && controlsRowEl) {
      const controlsTabContent = tabContentsById.get('controls');
      if (controlsTabContent) {
          const originalParent = controlsRowEl.parentElement;
          controlsTabContent.append(controlsRowEl);
          if (originalParent) {
              originalParent.style.display = 'none';
          }
      }
  }
  ```

- [ ] Find the `setActivePlaceholderTab` call that sets the initial active tab
  (currently `setActivePlaceholderTab(panelTabs[0].id)`). Replace it with:
  ```js
  const defaultTabId = (isMobile && controlsRowEl) ? 'controls' : (panelTabs[0]?.id ?? 'visibility');
  setActivePlaceholderTab(defaultTabId);
  ```

---

### Phase 4 — Pin the tab bar on mobile

**File: `style.css`**

- [ ] Find the existing `@media (max-width: 1000px)` block that covers the list
  panel (Section 2 — List Panel).

- [ ] Check whether `.stwid--iconTabBar` already has `position: sticky` or an
  equivalent rule that keeps it visible while the book list scrolls.

- [ ] If no sticky rule exists, add one inside the mobile block:
  ```css
  .stwid--iconTabBar {
      position: sticky;
      top: 0;
      z-index: 1;
  }
  ```
  Confirm the background color matches the panel background so it doesn't bleed
  through scrolled content (reuse an existing ST or extension CSS variable if
  available).

---

### Phase 5 — Update FEATURE_MAP.md

- [ ] In the "Selection & interaction" section, find the entry for
  "List-panel icon tabs" and append a note that on mobile (≤ 1000 px), a
  "Controls" tab is prepended as the default first tab and contains the
  `stwid--controlsRow` element.

- [ ] In the "Book-level behavior" section, find the "Top control row" entry and
  append a note that on mobile the control row is moved into the Controls tab.
