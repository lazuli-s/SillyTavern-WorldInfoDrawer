# REFACTORING: Move sorting row DOM builder from drawer.js to sorting-tab.js
*Created: March 5, 2026*

**Type:** Refactoring
**Status:** IMPLEMENTED

---

## Summary

The sorting tab's entire visual layout — its dropdowns, buttons, labels, and event wiring — is currently built inside `drawer.js`, a general-purpose setup file. The dedicated sorting tab module (`browser-tabs.sorting-tab.js`) only places the pre-built result into the tab container; it builds nothing. This refactor moves the construction code into the sorting tab module so it fully owns its own content, matching the pattern already used by the Settings, Visibility, Search, and other tab modules.

No user-visible behavior changes. The sorting tab will look and work exactly the same after this refactor.

## Current Behavior

When the extension initializes, `drawer.js` builds the entire sorting tab UI inline — about 100 lines covering the Global Sorting dropdown, the Per-book Sorting toggle button, and the Clear All Preferences button. The result is stored on an internal DOM map (`dom.sortingRow`) and later passed to `browser-tabs.js`, which hands it off to `browser-tabs.sorting-tab.js` solely to be appended into the tab container.

## Expected Behavior

After the refactor, `drawer.js` calls a factory function exported from `browser-tabs.sorting-tab.js` to create the sorting row, passing in the dependencies it needs. `drawer.js` stores the returned element in `dom.sortingRow` as before. `browser-tabs.js` and `browser-tabs.sorting-tab.js` continue to work exactly as they do today — no caller signatures change.

## Agreed Scope

| File | Change |
|---|---|
| `src/book-browser/browser-tabs/browser-tabs.sorting-tab.js` | Add `createSortingTabContent` factory function; add required imports |
| `src/drawer.js` | Replace ~100-line inline sorting block with a single call to `createSortingTabContent`; add import |
| `FEATURE_MAP.md` | Update the "Sorting controls row" entry to reflect the new owning module |
| `ARCHITECTURE.md` | Update the `browser-tabs.sorting-tab.js` module description |

## Out of Scope

- `appendSortOptions` and `getSortLabel` remain imported in `drawer.js` — they are also passed to `initBookBrowser` and `initEditorPanel` and cannot be removed.
- No changes to `browser-tabs.js` (it already calls `mountSortingTabContent` correctly).
- No changes to `style.css` or any other file.

## Implementation Plan

- [x] In `browser-tabs.sorting-tab.js`, add imports at the top of the file:
  - `import { Settings } from '../../shared/settings.js';`
  - `import { appendSortOptions } from '../../shared/utils.js';`

- [x] In `browser-tabs.sorting-tab.js`, add and export a new function `createSortingTabContent({ cache, getListPanelApi })` that:
  1. Creates the root `div` with class `stwid--sortingRow` (this becomes `dom.sortingRow`).
  2. Builds the **Global Sorting** `stwid--thinContainer`:
     - Label span (`stwid--thinContainerLabel`, text `'Global Sorting'`)
     - Hint icon (`fa-circle-question stwid--thinContainerLabelHint`, title as in current code)
     - Sort dropdown (`select.text_pole.stwid--smallSelectTextPole`) with `aria-label`, `title`, populated via `appendSortOptions`, and a `change` listener that writes `Settings.instance.sortLogic`/`sortDirection`, calls `getListPanelApi().sortEntriesIfNeeded(name)` for each key in `cache`, and calls `Settings.instance.save()`.
     - Wrapper div `stwid--globalSorting` containing the select.
  3. Builds the **Per-book Sorting** `stwid--thinContainer`:
     - Label span and hint icon (title as in current code, text `'Per-book Sorting'`).
     - Toggle button (`menu_button stwid--bookSortToggle`) with icon, `aria-pressed`, `title`, `aria-label`, and an inner `updateToggleState` helper that reads `Settings.instance.useBookSorts` to set classes/attributes. Wires a `click` listener that flips `useBookSorts`, saves, calls `updateToggleState`, and re-sorts all books via `getListPanelApi()`.
     - Clear button (`menu_button stwid--clearBookSorts`) with broom icon, `title`, `aria-label`, and an async `click` listener that disables the button, calls `await getListPanelApi().clearBookSortPreferences()`, and re-enables in a `finally` block.
     - Wrapper div `stwid--individualSorting` > `stwid--perBookSortButtons` containing the two buttons.
  4. Assembles all pieces and returns the root element.
  - Verify: the returned element structure is identical to what `drawer.js` currently produces — same CSS classes, same attributes, same event behavior, same DOM hierarchy.

- [x] In `src/drawer.js`, add an import for `createSortingTabContent`:
  ```js
  import { createSortingTabContent } from './book-browser/browser-tabs/browser-tabs.sorting-tab.js';
  ```

- [x] In `src/drawer.js`, locate the inline sorting block (currently lines ~260–361, starting with `const controls = document.createElement('div'); {` and ending with `list.append(controls);`). Replace it entirely with:
  ```js
  dom.sortingRow = createSortingTabContent({ cache, getListPanelApi: () => listPanelApi });
  ```
  Note: `listPanelApi` is assigned later in the same function, so `getListPanelApi: () => listPanelApi` (a lazy getter) is required — identical to how other tab factories receive it.

- [x] In `FEATURE_MAP.md`, find the "Sorting controls row" entry (under **Sorting & ordering**). Update the owning module list — replace `src/drawer.js` with `src/book-browser/browser-tabs/browser-tabs.sorting-tab.js` as the builder. Keep `src/book-browser/browser-tabs/browser-tabs.js` and `style.css` as listed.

- [x] In `ARCHITECTURE.md`, find the `browser-tabs.sorting-tab.js` row in the Module Responsibilities table. Update its description from `"Owns mounting for Sorting tab content"` to `"Builds the Sorting tab content (Global Sorting dropdown, Per-book Sorting toggle and clear) and mounts it into the tab container"`.

---

## After Implementation
*Implemented: March 6, 2026*

### What changed

`src/book-browser/browser-tabs/browser-tabs.sorting-tab.js`
- Added the new `createSortingTabContent` function so this module now builds the sorting tab's own controls.
- Kept the same dropdown, toggle button, clear button, labels, hints, and click/change behavior that were previously in `drawer.js`.

`src/drawer.js`
- Replaced the large inline sorting-controls block with one call to `createSortingTabContent`.
- Kept the lazy `getListPanelApi` callback so the sorting controls still work even though the list API is created later.

`FEATURE_MAP.md`
- Updated the sorting-controls ownership entry so future work points to the sorting tab module instead of the drawer bootstrap file.

`ARCHITECTURE.md`
- Updated the sorting tab module description to say it now builds and mounts the sorting tab content.

### Risks / What might break

- This touches the sorting tab startup path, so the Sorting tab could appear empty if the new factory is not called at the right time.
- This moves button and dropdown event wiring, so sorting changes could stop refreshing book order if the list API callback is wrong.
- This keeps the same DOM classes on purpose, but if any class was missed the sorting row layout could shift.

### Manual checks

- Reload the browser tab, open the drawer, and open the Sorting tab. Success looks like the same Global Sorting and Per-book Sorting sections appearing in the same place as before.
- Change Global Sorting and confirm visible book entries reorder right away. Success looks like the dropdown still changing book entry order without errors.
- Turn Per-book Sorting on and off. Success looks like the toggle icon, pressed state, and tooltip text changing correctly each time.
- Click Clear All Preferences. Success looks like the button temporarily disabling during the action and becoming usable again afterward.
