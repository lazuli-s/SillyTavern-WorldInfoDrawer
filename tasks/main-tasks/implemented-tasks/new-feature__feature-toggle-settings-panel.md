# NEW FEATURE: Feature Toggle Settings Panel
*Created: March 4, 2026*

**Type:** New Feature
**Status:** IMPLEMENTED

---

## Summary

Add a settings panel to the ST Extensions drawer that lets the user enable or disable individual extension features using checkboxes. Starting with Bulk Editor and Folder Grouping, the system is designed to be scalable so new feature toggles can be added later with minimal code changes. Disabled features are hidden completely. Settings are saved permanently.

## Current Behavior

The extension has no entry in the ST Extensions drawer at all. There is no settings panel, no checkboxes, and no way to turn off individual features from the UI. The Bulk Editor and Folder Grouping are always shown.

## Expected Behavior

After this change:
- The extension appears in the ST Extensions drawer under "WorldInfo Drawer" with a collapsible settings panel.
- The panel contains a "Features" section with one checkbox per toggleable feature.
- Unchecking a feature hides it completely from the extension UI.
- Checking it back makes it reappear.
- The on/off state is saved permanently (survives page reload).
- The initial features exposed as toggles are: **Bulk Editor** and **Folder Grouping**.
- Future features can be added to the toggle list by adding one entry to a central registry, without rewriting the existing system.

## Agreed Scope

**Files to create:**
- `settings.html` — HTML template for the ST Extensions settings panel (root of extension)

**Files to modify:**
- `src/shared/settings.js` — Add feature flag booleans to the settings object
- `index.js` — Inject settings HTML into ST Extensions drawer on startup; wire feature hide/show on load
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js` — Add hide/show logic for the Entry Manager toggle button (Bulk Editor toggle)
- `src/entry-manager/entry-manager.js` — Guard Entry Manager open against disabled state
- `src/book-browser/book-list/book-folders/book-folders.folders-view.js` — Add hide/show for folder DOM rows
- `src/drawer.js` — Add hide/show for folder-related buttons in top control row (new folder, import folder, collapse/expand folders)
- `FEATURE_MAP.md` — Add entry for the new settings panel feature
- `ARCHITECTURE.md` — Update module responsibilities table if a new module is introduced

## Out of Scope

- The Entry Search/Filter toggle (not requested for now)
- The Book Browser panel toggle (not requested for now)
- Any toggle for the Entry editor panel itself
- Greyed-out or collapsed states — disabled means fully hidden only

## Implementation Plan

### Step 1 — Add feature flags to the Settings class

In `src/shared/settings.js`:

- [x] Add two new boolean properties to the `Settings` class: `featureBulkEditor = true` and `featureFolderGrouping = true` (default `true` so existing users see no change).
- [x] Add both keys to the `KNOWN_SETTINGS_KEYS` array so they are loaded from saved settings on startup.
- [x] Add both keys to the `toJSON()` method return value so they are persisted when `save()` is called.

### Step 2 — Create the settings HTML template

Create `settings.html` in the extension root. Use SillyTavern's standard extension panel markup (`inline-drawer`, `inline-drawer-toggle`, `inline-drawer-content`, `flex-container`, `menu_button`, `sysHR`). The file must be pure HTML — no script tags.

- [x] Create `settings.html` with the collapsible panel structure wrapping a "Features" section.
- [x] Add one `<input type="checkbox">` + `<label>` pair for each feature:
  - id `stwid-feature-bulk-editor`, label "Bulk Editor"
  - id `stwid-feature-folder-grouping`, label "Folder Grouping"
- [x] Add a `<hr class="sysHR" />` at the bottom of the content section.

### Step 3 — Inject the settings panel and wire checkboxes

In `index.js`, after the existing initialization calls:

- [x] Call `SillyTavern.getContext().renderExtensionTemplateAsync` with the extension folder name and `'settings'` to load `settings.html` asynchronously.
- [x] Append the returned HTML into `#extensions_settings` (the ST Extensions drawer container).
- [x] Wire a `change` event listener on `#stwid-feature-bulk-editor` that:
  - Updates `Settings.instance.featureBulkEditor` with the checkbox's checked state.
  - Calls `Settings.instance.save()`.
  - Calls `applyFeatureVisibility()` (see Step 4).
- [x] Wire the same pattern for `#stwid-feature-folder-grouping` → `Settings.instance.featureFolderGrouping`.
- [x] On startup, after wiring, set each checkbox's initial checked state from `Settings.instance` and call `applyFeatureVisibility()`.

### Step 4 — Implement the feature visibility registry

Create a small helper (can live inside `index.js` or a new `src/shared/feature-visibility.js`) that defines a **feature registry** — a plain array of objects, one per feature:

```js
// Each entry: { settingKey, applyFn }
// applyFn(enabled) shows or hides the relevant DOM elements
const FEATURE_REGISTRY = [
    {
        settingKey: 'featureBulkEditor',
        applyFn: (enabled) => applyBulkEditorVisibility(enabled),
    },
    {
        settingKey: 'featureFolderGrouping',
        applyFn: (enabled) => applyFolderGroupingVisibility(enabled),
    },
];

function applyFeatureVisibility() {
    for (const { settingKey, applyFn } of FEATURE_REGISTRY) {
        applyFn(Settings.instance[settingKey]);
    }
}
```

- [x] Implement `applyBulkEditorVisibility(enabled)`:
  - When `false`: hide the Entry Manager toggle button in the Visibility tab row (the button that opens the bulk editor). Use `element.hidden = true` or `element.style.display = 'none'`.
  - When `true`: restore it to visible.
  - Also ensure the Entry Manager panel itself is closed if it is currently open and the feature is being disabled.
- [x] Implement `applyFolderGroupingVisibility(enabled)`:
  - When `false`: hide all folder rows in the book list (elements with class `stwid--folder` or equivalent), and hide the folder-related buttons in the top control row (new folder, import folder, collapse/expand all folders).
  - When `true`: restore all those elements to visible.

**Note to implementer:** Before implementing hide/show, inspect the live DOM or read `src/drawer.js` and `src/book-browser/browser-tabs/browser-tabs.filter-bar.js` to confirm the exact element selectors or IDs for the Entry Manager toggle and the folder control buttons. Do not guess selectors — read the source first.

### Step 5 — Guard Entry Manager open against disabled state

In `src/entry-manager/entry-manager.js` (or wherever `openEntryManager` / its equivalent is called):

- [x] At the top of the function that opens the Entry Manager, check `Settings.instance.featureBulkEditor`. If `false`, return early without opening.

### Step 6 — Update documentation

- [x] In `FEATURE_MAP.md`, add an entry under a new "Settings panel" section (or "Integration with SillyTavern") noting:
  - Extension settings panel injection → `index.js`
  - Feature toggle on/off state → `src/shared/settings.js`
  - Feature visibility registry → `index.js` (or `src/shared/feature-visibility.js`)
- [x] If a new `src/shared/feature-visibility.js` file is created, add it to the module table in `ARCHITECTURE.md`.

---

## Implementation Notes

- **COMPAT-03:** When adding `featureBulkEditor` and `featureFolderGrouping` to `KNOWN_SETTINGS_KEYS`, ensure existing users who have no saved value for these keys get `true` (the default) on next load. The existing loop in `Settings` constructor already handles this — new keys not present in saved data are simply skipped, leaving the class property default (`true`) in place.
- **Scalability contract:** To add a future feature toggle, the implementer only needs to: (1) add the default property to `Settings`, (2) add the key to `KNOWN_SETTINGS_KEYS` and `toJSON()`, (3) add a checkbox to `settings.html`, (4) add one entry to `FEATURE_REGISTRY` with its `applyFn`. No other code changes are needed.
- **DOM readiness:** `applyFeatureVisibility()` must only be called after the drawer DOM is fully initialized. Call it after `initDrawer()` completes and the list is first loaded.

### Plan correction applied before implementation

The setting name `featurefolderGrouping` in the original checklist was corrected to `featureFolderGrouping` to keep key names consistent and avoid save/load key mismatches.

---

## After Implementation
*Implemented: March 5, 2026*

### What changed

- `src/shared/settings.js`
  - Added two new saved settings: Bulk Editor toggle and Folder Grouping toggle.
  - Included both new settings in load/save behavior.
- `settings.html`
  - Added a new "WorldInfo Drawer" settings panel for the ST Extensions drawer.
  - Added two checkboxes under Features: Bulk Editor and Folder Grouping.
- `index.js`
  - Injects the new settings panel into `#extensions_settings` on startup.
  - Wires checkbox change events to saved settings.
  - Added a feature registry and apply loop so each feature toggle is handled in one place.
  - Applies visibility on startup and again after first list refresh.
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`
  - Added hide/show support for the Entry Manager toggle button in the Visibility tab.
- `src/book-browser/book-browser.js`
  - Exposed list API hooks for Entry Manager toggle visibility and folder grouping visibility.
- `src/book-browser/book-list/book-folders/book-folders.folders-view.js`
  - Added folder-grouping visibility state and applied it when rendering/updating folder rows.
- `src/drawer.js`
  - Added folder-control references and a helper to hide/show folder controls in the top row.
- `src/entry-manager/entry-manager.js`
  - Added an early return guard so Entry Manager cannot open when Bulk Editor is disabled.
- `FEATURE_MAP.md`
  - Added a new Settings panel feature section and mapped all new ownership points.
- `ARCHITECTURE.md`
  - Updated module responsibility rows to include settings injection and feature-toggle visibility ownership.

### Risks / What might break

- This touches startup initialization, so settings could fail to appear if the settings drawer container changes in SillyTavern.
- This touches Entry Manager opening/visibility, so there could be edge cases where the button state and panel state get out of sync during fast toggling.
- This touches folder visibility and controls, so folder rows or folder buttons could stay hidden after reload if a future module bypasses the new visibility hooks.

### Manual checks

- Open SillyTavern Extensions settings and confirm a new "WorldInfo Drawer" collapsible panel appears with two checkboxes.
- Uncheck "Bulk Editor" and confirm the Entry Manager button disappears and the Entry Manager panel closes if open.
- Check "Bulk Editor" again and confirm the Entry Manager button comes back and can open normally.
- Uncheck "Folder Grouping" and confirm folder rows in the book list disappear and folder controls (new/import/collapse folders) disappear.
- Check "Folder Grouping" again and confirm folder rows and folder controls reappear.
- Reload the page and confirm both checkboxes keep their last values and the UI loads in the same visible/hidden state.
