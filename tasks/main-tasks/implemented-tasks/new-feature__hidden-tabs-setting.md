# NEW FEATURE: Hidden Tabs Setting
*Created: March 5, 2026*

**Type:** New Feature
**Status:** IMPLEMENTED

---

## Summary

Add a "Hidden Tabs" multiselect section to the extension's settings panel (in the SillyTavern Extensions sidebar), letting users check boxes to hide any of the six tabs in the Book Browser's left-panel tab bar. Hidden tabs disappear from the tab strip. If the currently open tab is hidden, the drawer automatically switches to the first visible tab. All tabs are visible by default.

## Current Behavior

The Book Browser tab bar always shows all six tabs: **Settings, Lorebooks, Folders, Visibility, Sorting, Search**. There is no way to hide individual tabs you do not use.

## Expected Behavior

After this change, the extension's settings panel will have a new "Hidden Tabs" section with one checkbox per tab. Checking a box hides that tab from the tab strip. Unchecking it brings the tab back. If the tab currently open is hidden, the extension automatically switches to the first tab that is still visible. The hidden-tab selection is saved and restored across browser reloads. By default, no tabs are hidden (all checkboxes unchecked).

## Agreed Scope

Files to change:

| File | What changes |
|---|---|
| `settings.html` | New "Hidden Tabs" section with six labelled checkboxes |
| `src/shared/settings.js` | New `hiddenTabs` array property + serialization |
| `src/book-browser/browser-tabs/browser-tabs.js` | Apply hidden state on build; expose `applyHiddenTabs()` |
| `src/book-browser/book-browser.js` | Pass `applyHiddenTabs` through to `listPanelApi` |
| `index.js` | Wire checkboxes; call `applyHiddenTabs` on change and on startup |

FEATURE_MAP.md and ARCHITECTURE.md do not need updates (no new modules or ownership transfers).

## Out of Scope

- Hiding entry-manager tabs (those are separate from the Book Browser tab bar)
- Reordering tabs
- Per-profile tab visibility

## Implementation Plan

### Step 1 — Add `hiddenTabs` to the Settings class (`src/shared/settings.js`)

- [x] Add `'hiddenTabs'` to the `KNOWN_SETTINGS_KEYS` array.
- [x] Add the class property `hiddenTabs = [];` (default: empty array, meaning no tabs hidden).
- [x] After the loop that hydrates keys from saved settings, add a guard: if `this.hiddenTabs` is not a proper array, reset it to `[]`. Filter its contents to only allow the six known tab ID strings: `'settings'`, `'lorebooks'`, `'folders'`, `'visibility'`, `'sorting'`, `'search'`.
- [x] Add `hiddenTabs: this.hiddenTabs` to the `toJSON()` return object.

### Step 2 — Add checkboxes to the settings panel HTML (`settings.html`)

- [x] After the second `<div class="flex-container">` block (the Additional Matching Sources row) and before the `<hr>`, add a new `<div class="flex-container"><h4>Hidden Tabs</h4></div>` heading.
- [x] Add six `<div class="flex-container">` rows, one per tab, in the same pattern as the existing rows (a `<label class="menu_button">` wrapping an `<input type="checkbox">`):
  - `id="stwid-hidden-tab-settings"` — label text: `Settings tab`
  - `id="stwid-hidden-tab-lorebooks"` — label text: `Lorebooks tab`
  - `id="stwid-hidden-tab-folders"` — label text: `Folders tab`
  - `id="stwid-hidden-tab-visibility"` — label text: `Visibility tab`
  - `id="stwid-hidden-tab-sorting"` — label text: `Sorting tab`
  - `id="stwid-hidden-tab-search"` — label text: `Search tab`

### Step 3 — Apply hidden-tab visibility in the tab bar builder (`src/book-browser/browser-tabs/browser-tabs.js`)

- [x] In `buildIconTabBar`, after the `for (const tab of panelTabs)` loop that creates buttons and contents, store the built tab buttons in a `Map` keyed by `tab.id` (e.g. `tabButtonsById`).
- [x] Still inside `buildIconTabBar`, read `Settings.instance.hiddenTabs` (import `Settings` from `'../../shared/settings.js'`) and for each ID in that array, call `button.hidden = true` on the matching button from `tabButtonsById`, and also hide its corresponding content panel.
- [x] Add an inner helper `applyTabHidden(tabId, hidden)` inside `buildIconTabBar` that:
  - Sets `tabButtonsById.get(tabId)?.hidden = hidden` and the matching content's `hidden = hidden`.
  - If `hidden === true` and that tab is currently active (its button has class `active`), calls `setActivePlaceholderTab` with the ID of the first button that is not hidden — if no such button exists, do nothing.
- [x] Return `applyTabHidden` from `buildIconTabBar` alongside `iconTab` (return `{ iconTab, applyTabHidden }`).
- [x] In `setupFilter`, destructure `{ iconTab, applyTabHidden }` from `buildIconTabBar(...)`.
- [x] Add an `applyHiddenTabs(hiddenTabIds)` function inside `createFilterBarSlice` (scoped after `setupFilter` is defined) that:
  - Accepts an array of tab ID strings.
  - For each of the six known tab IDs, calls `applyTabHidden(id, hiddenTabIds.includes(id))`.
- [x] Add `applyHiddenTabs` to the returned object of `createFilterBarSlice`.

### Step 4 — Pass `applyHiddenTabs` up through the Book Browser (`src/book-browser/book-browser.js`)

- [x] Locate where `createFilterBarSlice` is called and its return value is used. Add `applyHiddenTabs` to the public API object that `book-browser.js` returns as `listPanelApi` (or equivalent). The exact mechanism matches how `setFolderGroupingVisibility` is currently exposed — follow the same pattern.

### Step 5 — Wire checkboxes and apply on startup (`index.js`)

- [x] Define `applyHiddenTabsVisibility` as a function that reads `Settings.instance.hiddenTabs` and calls `listPanelApi?.applyHiddenTabs?.(Settings.instance.hiddenTabs)`.
- [x] Add an entry for `hiddenTabs` to `FEATURE_REGISTRY`:
  ```js
  {
      settingKey: 'hiddenTabs',
      applyFn: () => applyHiddenTabsVisibility(),
  }
  ```
  Note: `applyFn` here ignores the boolean `enabled` argument (since `hiddenTabs` is an array, not a boolean) and calls `applyHiddenTabsVisibility()` directly which reads the setting itself.
- [x] In `initSettingsPanel`, for each of the six tab IDs, query the matching checkbox element by its `id` (e.g. `#stwid-hidden-tab-settings`) and:
  - Set `checkbox.checked = Settings.instance.hiddenTabs.includes(tabId)`.
  - Add a `'change'` listener that updates `Settings.instance.hiddenTabs` (add or remove the ID from the array based on `checkbox.checked`), calls `Settings.instance.save()`, and then calls `applyHiddenTabsVisibility()`.
- [x] Call `applyFeatureVisibility()` at the end of `initSettingsPanel` as it already does — this will also trigger the new hidden-tabs apply via the registry.

---

## After Implementation
*Implemented: March 6, 2026*

### What changed

`settings.html`
- Added a new Hidden Tabs section in the extension settings sidebar.
- Added one checkbox for each Book Browser tab.

`src/shared/settings.js`
- Added a saved `hiddenTabs` setting.
- Cleaned saved values so only known tab names are kept.

`src/book-browser/browser-tabs/browser-tabs.js`
- Added logic to hide tab buttons and their matching tab panels.
- Added automatic fallback to the first visible tab if the active one gets hidden.
- Exposed a small `applyHiddenTabs` hook so the setting can update the UI live.

`src/book-browser/book-browser.js`
- Passed the hidden-tab apply hook through the Book Browser public API.

`index.js`
- Wired the six settings checkboxes to the saved setting.
- Applied hidden tabs on startup and immediately after each checkbox change.

### Risks / What might break

- This touches the Book Browser tab switcher, so it might affect which tab opens by default after reload.
- This touches saved extension settings, so older saved data with unusual values might be reset to a safe empty list.
- This hides both the tab button and its panel, so a mistake here could leave the left panel showing the wrong content until reload.

### Manual checks

- Open the extension settings sidebar and confirm the new Hidden Tabs section appears with six checkboxes.
- Check one tab, reload the browser tab, and confirm that tab stays hidden after reload.
- Hide the tab that is currently open in the drawer and confirm the drawer switches to the first still-visible tab instead of going blank.
- Uncheck a previously hidden tab and confirm it immediately returns to the tab strip.
- Try hiding several tabs at once and confirm the remaining visible tabs still switch normally.
