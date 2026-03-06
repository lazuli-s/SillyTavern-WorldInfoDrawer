# REFACTORING: Consolidate search row creation into search tab module
*Created: March 5, 2026*

**Type:** Refactoring
**Status:** IMPLEMENTED

---

## Summary

The search feature UI is split across two files in a way that leaves the
orchestrator (`browser-tabs.js`) doing work that belongs to the search tab
module (`browser-tabs.search-tab.js`). This refactoring moves the `searchRow`
container creation into `browser-tabs.search-tab.js` so the search module
fully owns its own DOM — matching the pattern used by the visibility and
sorting tab modules.

No user-visible behavior changes. The extension will work identically after
this change.

## Current Behavior

`browser-tabs.js` creates the `searchRow` container div (with CSS class
`stwid--searchRow`) and then calls `buildSearchRow` (imported from
`browser-tabs.search-tab.js`) to fill it. This means the orchestrator
owns a piece of the search tab's DOM construction.

`browser-tabs.search-tab.js` exports two functions:
- `buildSearchRow(searchRow, listPanelState, runtime, updateFolderActiveToggles)`
  — fills an already-created div with the search input and "Entries" checkbox.
- `mountSearchTabContent({ tabContentsById, searchRow })`
  — places the completed row into the tab panel.

## Expected Behavior

After this change:
- `browser-tabs.search-tab.js` exports a new function `createSearchRow`
  that creates the `searchRow` div, populates it via `buildSearchRow`,
  and returns it (along with references to the input elements).
- `browser-tabs.js` calls `createSearchRow(...)` instead of creating the
  div and calling `buildSearchRow` itself.
- `buildSearchRow` becomes a private (non-exported) function used only
  internally by `createSearchRow`.
- `mountSearchTabContent` is unchanged.

The user sees no difference. All search behavior stays identical.

## Agreed Scope

Files affected:
- `src/book-browser/browser-tabs/browser-tabs.search-tab.js` — add
  `createSearchRow`, make `buildSearchRow` private (remove `export`).
- `src/book-browser/browser-tabs/browser-tabs.js` — update import to use
  `createSearchRow` instead of `buildSearchRow`; remove inline `searchRow`
  div creation; remove the `buildSearchRow(...)` call.

Files confirmed NOT in scope (correctly owned where they are):
- `src/book-browser/book-browser.state.js` — owns search state fields,
  entry search cache, and related getters/setters/helpers. This is state
  management, not search tab UI.
- `src/book-browser/book-browser.js` — orchestration-level calls
  (`clearEntrySearchCache`, null-reset of `searchInput`/`searchEntriesInput`,
  and `searchInput.dispatchEvent`) are correctly placed in the orchestrator.

## Out of Scope

- Moving search state or cache management out of `book-browser.state.js`.
- Any visual or behavioral change to the search feature.
- Updating `FEATURE_MAP.md` or `ARCHITECTURE.md` (no ownership boundaries
  change — the search tab already owns this feature per both docs).

## Implementation Plan

- [x] In `src/book-browser/browser-tabs/browser-tabs.search-tab.js`:
  Remove `export` from `buildSearchRow` (make it module-private, no other
  file calls it directly).

- [x] In `src/book-browser/browser-tabs/browser-tabs.search-tab.js`:
  Add and export a new function `createSearchRow(listPanelState, runtime,
  updateFolderActiveToggles)` that:
  1. Creates a `div` element and adds the class `stwid--searchRow`.
  2. Calls `buildSearchRow(searchRow, listPanelState, runtime,
     updateFolderActiveToggles)` to populate it.
  3. Returns `{ searchRow, search, searchEntriesCheckbox }` (forwarding
     the same shape that `buildSearchRow` currently returns, plus the
     container element).

- [x] In `src/book-browser/browser-tabs/browser-tabs.js`:
  Update the import from `browser-tabs.search-tab.js`:
  replace `buildSearchRow` with `createSearchRow`
  (keep `mountSearchTabContent` unchanged).

- [x] In `src/book-browser/browser-tabs/browser-tabs.js`, inside
  `setupFilter`:
  Replace the three lines:
  ```js
  const searchRow = document.createElement('div');
  searchRow.classList.add('stwid--searchRow');
  ...
  buildSearchRow(searchRow, listPanelState, runtime, updateFolderActiveToggles);
  ```
  with a single call:
  ```js
  const { searchRow } = createSearchRow(listPanelState, runtime, updateFolderActiveToggles);
  ```
  The `searchRow` variable is still passed to `buildIconTabBar` on the next
  line — that call is unchanged.

---

## After Implementation
*Implemented: March 5, 2026*

### What changed

`src/book-browser/browser-tabs/browser-tabs.search-tab.js`
- Kept `buildSearchRow` inside the module so only the search-tab file uses it directly.
- Added `createSearchRow(...)` so this module now creates the search row container and fills it itself.
- Returned the same input references as before, plus the finished row element.

`src/book-browser/browser-tabs/browser-tabs.js`
- Switched the import to `createSearchRow`.
- Removed the extra search-row container creation from `setupFilter`.
- Left the rest of the tab mounting flow unchanged.

### Risks / What might break

- This touches the search tab setup, so the Search tab could fail to appear if the new helper returns the wrong element shape.
- This changes where the search input is created, so search filtering could stop responding if the state references were not forwarded correctly.

### Manual checks

- Reload the browser tab, open the drawer, and click the Search tab. Success looks like the search box and the `Entries` checkbox appearing exactly where they did before.
- Type part of a lorebook name into the search box. Success looks like matching books staying visible and non-matching books hiding.
- Turn on the `Entries` checkbox and search for text that exists inside an entry title, memo, or keys. Success looks like matching books or entries still being found the same way as before.
