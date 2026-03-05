# NEW FEATURE: Additional Matching Sources Panel
*Created: March 4, 2026*

**Type:** New Feature
**Status:** IMPLEMENTED

---

## Summary

SillyTavern has a built-in "Additional Matching Sources" section inside each World Info entry editor. It contains six checkboxes that let the user tell the entry to scan additional parts of the conversation context — such as the character description, persona, or creator notes — when deciding whether to activate. The drawer extension currently **hides this section** via a CSS override rule. This task restores it as a collapsible section at the bottom of the entry editor, and adds a settings toggle so the user can hide it if they prefer.

---

## Current Behavior

When a user opens a World Info entry in the drawer's editor panel, the "Additional Matching Sources" section is completely invisible. It exists in the vanilla SillyTavern entry template and is fully wired (checkboxes save correctly to the entry data), but [style.css:1056-1059](style.css#L1056-L1059) deliberately hides it with a CSS `display: none` rule. In addition, two other CSS rules prevent the section from ever being usable even if un-hidden: one forces all inline-drawer content inside the editor to always be visible (`display: flex !important`) and another hides all inline-drawer toggle buttons.

---

## Expected Behavior

After this change:

- When a user opens an entry in the drawer editor, the "Additional Matching Sources" section appears at the bottom of the entry editor content (after the "Selective / Use Probability / Add Memo" row), as a collapsed inline-drawer accordion.
- The user can click the section header to expand or collapse it. The chevron icon updates accordingly (down = collapsed, up = expanded). It starts collapsed by default.
- The six checkboxes (Character Description, Character Personality, Scenario, Persona Description, Character's Note, Creator's Notes) function exactly as they do in vanilla ST — they read from and save to the entry's data automatically (wired by vanilla ST's `getWorldEntry`; no custom save logic needed).
- When no entry is open, the section is not visible.
- In the extension's settings panel (Settings > WorldInfo Drawer), a new checkbox labelled **"Additional Matching Sources"** under the Features section lets the user disable the section entirely. When disabled, it is completely hidden from the editor panel.

---

## Root Cause Investigation

The section is hidden by this CSS rule in [style.css:1056-1059](style.css#L1056-L1059):

```css
/* override: hide the nested "User Settings" inline-drawer */
.stwid--editor .inline-drawer-content > .world_entry_edit .inline-drawer:has(> .userSettingsInnerExpandable) {
  display: none;
}
```

Two additional rules must be worked around to make the section usable:

1. [style.css:1031-1037](style.css#L1031-L1037): forces **all** `.inline-drawer-content` inside `.stwid--editor` to `display: flex !important` — this would always show the section's content even when collapsed.
2. [style.css:1026-1029](style.css#L1026-L1029): hides **all** `.inline-drawer-toggle` inside `.stwid--editor` — this would hide the section's header/toggle button.

The fix uses a custom CSS class (`stwid--ams`) added by JS to the AMS element to scope overrides precisely, and a JS click handler (with `stopPropagation`) to manage expand/collapse independently of vanilla ST's global handler.

---

## Agreed Scope

Files affected:
- **`style.css`** — remove the hide rule; add AMS-specific CSS for collapsible behavior, visible header, and feature-toggle hide
- **`src/editor-panel/editor-panel.js`** — wire the AMS section on each entry open (add class, wire click handler)
- **`src/shared/settings.js`** — add `featureAdditionalMatchingSources` setting
- **`settings.html`** — add feature toggle checkbox
- **`index.js`** — add to `FEATURE_REGISTRY`; wire the settings checkbox in `initSettingsPanel`
- **`FEATURE_MAP.md`** — add entries for the new feature and the new setting
- **`ARCHITECTURE.md`** — no structural change needed (no new module)

---

## Out of Scope

- Changing the save/load behavior of the checkboxes — vanilla ST's `getWorldEntry` already wires them correctly.
- Persisting the expand/collapse state of the AMS section across entries or sessions — always starts collapsed per user's request.
- Moving the section outside the scrollable entry form (it stays where the template places it — at the bottom of `.world_entry_edit`).

---

## Implementation Plan

### Step 1 — Update `style.css`

- [x] **Remove** the rule at lines 1056–1059 that hides the AMS inline-drawer entirely:
  ```css
  .stwid--editor .inline-drawer-content > .world_entry_edit .inline-drawer:has(> .userSettingsInnerExpandable) {
    display: none;
  }
  ```

- [x] **Add** the following new rules directly after the block ending at line 1059 (or at end of the editor section). Each rule needs a matching comment:

  ```css
  /* AMS: show the header/toggle button (overrides the blanket inline-drawer-toggle hide) */
  .stwid--editor .stwid--ams > .inline-drawer-header.inline-drawer-toggle {
    display: flex;
    cursor: pointer;
  }

  /* AMS: collapsed by default — overrides the flex !important on .inline-drawer-content */
  .stwid--ams > .inline-drawer-content {
    display: none !important;
    flex: initial;
    flex-direction: initial;
  }

  /* AMS: expanded state — toggled by JS adding stwid--ams-open */
  .stwid--ams.stwid--ams-open > .inline-drawer-content {
    display: block !important;
  }

  /* AMS: feature disabled — hides the section entirely */
  body.stwid--ams-disabled .stwid--ams {
    display: none !important;
  }
  ```

### Step 2 — Update `src/editor-panel/editor-panel.js`

- [x] In `openEntryEditor`, after `dom.editor.append(editDom)` (and AFTER `appendUnfocusButton()`, `header`, `editDom` appends), add a call to a new helper `wireAmsSection(editDom)`.

- [x] Implement the `wireAmsSection(editDom)` helper (as a `const` inside `initEditorPanel`'s closure):

  ```js
  const wireAmsSection = (editDom) => {
      const amsHeader = editDom.querySelector('.userSettingsInnerExpandable');
      const amsDrawer = amsHeader?.closest('.inline-drawer');
      if (!amsDrawer) return;

      amsDrawer.classList.add('stwid--ams');

      amsHeader.addEventListener('click', (e) => {
          e.stopPropagation(); // prevent vanilla ST's global inline-drawer handler
          const isOpen = amsDrawer.classList.toggle('stwid--ams-open');
          const icon = amsDrawer.querySelector('.inline-drawer-icon');
          if (icon) {
              icon.classList.toggle('up', isOpen);
              icon.classList.toggle('down', !isOpen);
              icon.classList.toggle('fa-circle-chevron-up', isOpen);
              icon.classList.toggle('fa-circle-chevron-down', !isOpen);
          }
      });
  };
  ```

  Notes:
  - `querySelector('.userSettingsInnerExpandable')` finds the AMS header inside the lazy-loaded `.world_entry_edit` (which is added synchronously by `addEditorDrawerContent()` when `$(drawerToggle).trigger('inline-drawer-toggle')` fires).
  - `e.stopPropagation()` prevents the vanilla ST global `click` handler from also firing and interfering with the collapse state.
  - No custom save logic — vanilla ST's `getWorldEntry` already wires all six checkboxes to `saveWorldInfo` via `handleMatchCheckboxHelper`.

### Step 3 — Update `src/shared/settings.js`

- [x] Add `'featureAdditionalMatchingSources'` to the `KNOWN_SETTINGS_KEYS` array.
- [x] Add `featureAdditionalMatchingSources = true;` as a class property default (default `true` = visible by default).
- [x] In the constructor, after existing `parseBooleanSetting` calls, add:
  ```js
  this.featureAdditionalMatchingSources = parseBooleanSetting(this.featureAdditionalMatchingSources, true);
  ```
- [x] In `toJSON()`, add `featureAdditionalMatchingSources: this.featureAdditionalMatchingSources`.

### Step 4 — Update `settings.html`

- [x] Add a new checkbox row for the feature inside the Features section, following the same pattern as the Folder Grouping checkbox:
  ```html
  <div class="flex-container">
      <label class="menu_button" for="stwid-feature-additional-matching-sources">
          <input id="stwid-feature-additional-matching-sources" type="checkbox">
          Additional Matching Sources
      </label>
  </div>
  ```

### Step 5 — Update `index.js`

- [x] Add an entry to `FEATURE_REGISTRY`:
  ```js
  {
      settingKey: 'featureAdditionalMatchingSources',
      applyFn: (enabled) => document.body.classList.toggle('stwid--ams-disabled', !enabled),
  },
  ```

- [x] In `initSettingsPanel`, after the folderGroupingCheckbox block, add wiring for the new checkbox:
  ```js
  const amsCheckbox = wrapper.querySelector('#stwid-feature-additional-matching-sources');
  if (amsCheckbox instanceof HTMLInputElement) {
      amsCheckbox.checked = Boolean(Settings.instance.featureAdditionalMatchingSources);
      amsCheckbox.addEventListener('change', () => {
          Settings.instance.featureAdditionalMatchingSources = amsCheckbox.checked;
          Settings.instance.save();
          applyFeatureVisibility();
      });
  }
  ```

### Step 6 — Update `FEATURE_MAP.md`

- [x] Add to the **Editor behavior** section:
  ```
  - Additional Matching Sources section in editor panel (show/wire collapsible AMS inline-drawer per entry) → src/editor-panel/editor-panel.js
  ```
- [x] Add to the **Settings panel** section:
  ```
  - Additional Matching Sources feature toggle (featureAdditionalMatchingSources) → src/shared/settings.js, settings.html, index.js
  ```

---

## After Implementation
*Implemented: March 4, 2026*

### What changed

- `style.css`
  - Removed the old rule that fully hid the Additional Matching Sources section.
  - Added AMS-only styles so the header is visible, content starts collapsed, and opens only when toggled.
  - Added a body-class hide rule so the new feature toggle can disable the section.
- `src/editor-panel/editor-panel.js`
  - Added `wireAmsSection(editDom)` to find the AMS drawer on each editor open and mark it with `stwid--ams`.
  - Added click wiring to expand/collapse AMS and keep the chevron icon in sync.
  - Called `wireAmsSection(editDom)` after the editor DOM is mounted.
- `src/shared/settings.js`
  - Added a new persisted setting key: `featureAdditionalMatchingSources`.
  - Added default value `true`, constructor parsing, and JSON serialization support.
- `settings.html`
  - Added a new Features checkbox labeled `Additional Matching Sources`.
- `index.js`
  - Added AMS visibility handling to `FEATURE_REGISTRY` by toggling `body.stwid--ams-disabled`.
  - Wired the new settings checkbox to save and re-apply feature visibility instantly.
- `FEATURE_MAP.md`
  - Documented AMS editor behavior ownership in `src/editor-panel/editor-panel.js`.
  - Documented the AMS feature toggle ownership across settings and bootstrap files.

### Risks / What might break

- This touches editor drawer toggle behavior, so it might affect other nested inline-drawers if their markup changes upstream.
- This adds one more body-level feature class toggle, so future CSS using similar class names could conflict if not scoped.
- This depends on the `.userSettingsInnerExpandable` selector from ST templates, so an upstream rename could hide the AMS section again.

### Manual checks

- Open any lorebook entry in the drawer editor and confirm `Additional Matching Sources` appears collapsed at the bottom of the form.
- Click the AMS header and confirm it expands/collapses and the chevron flips up/down each time.
- Toggle each AMS checkbox, close the entry, reopen it, and confirm the checkbox states are preserved.
- Open `Settings > WorldInfo Drawer`, turn off `Additional Matching Sources`, reopen an entry, and confirm the AMS section is completely hidden.
- Turn the setting back on and confirm the AMS section appears again without needing a full restart.
