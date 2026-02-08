# Style Guide (UI Design • CSS)

This guide defines how to style UI changes in this extension using **CSS only**, with the **highest priority on reusing existing SillyTavern (ST) styles**.

## Core Rule (Priority #1)

**Always reuse existing ST CSS rules first.**  
Before adding any new CSS class or selector:

1. **Scan the ST submodule** (`/vendor/SillyTavern`) for existing styles that already match your need.
2. Use those classes directly in the extension markup if possible.
3. Only add new CSS if *no suitable ST style exists*.

> This is mandatory for all UI changes.

---

## Where to Look First (ST Submodule)

Use these files as your **first stop** when searching for reusable styles:

- `vendor/SillyTavern/public/css/popup.css` (popup layout, buttons, dialog behavior)
- `vendor/SillyTavern/public/style.css` (global buttons, inputs, layouts)
- `vendor/SillyTavern/public/css/world-info.css` (World Info-specific styles)

---

## Reusable ST CSS Classes (Suggested List)

Use these **existing ST classes** before creating new ones:

### Popup & Dialog

- `.popup`  
- `.popup-body`  
- `.popup-content`  
- `.popup-controls`  
- `.popup-button-ok`  
- `.popup-button-cancel`  
- `.popup-button-close`  

### Buttons

- `.menu_button`  
- `.menu_button_default`  
- `.right_menu_button`  

### Inputs / Fields

- `.text_pole`  

### Dialogue Layout Variants (when needed)

- `.large_dialogue_popup`  
- `.wide_dialogue_popup`  
- `.wider_dialogue_popup`  
- `.vertical_scrolling_dialogue_popup`  
- `.horizontal_scrolling_dialogue_popup`  
- `.left_aligned_dialogue_popup`  

## When You *Can* Add New CSS

Only add a new class if **all** are true:

1. No matching ST class exists.
2. You already scanned the ST submodule.
3. The new style is **small, targeted, and local** to the extension.

If you add a new class, document **why** it was necessary.

---

## Extension Dropdown Families

Use these two class families consistently across the extension.

### 1) `stwid--multiselectDropdown*` (select/multiselect menus)

Use this family for dropdowns where the menu content represents selectable state.

Core classes:
- `.stwid--multiselectDropdownWrap`
- `.stwid--multiselectDropdownButton`
- `.stwid--multiselectDropdownMenu`
- `.stwid--multiselectDropdownOption`
- `.stwid--multiselectDropdownOptionIcon`
- `.stwid--multiselectDropdownOptionCheckbox`

Behavior contract:
- Support top preset actions when needed (for example `All Books`, `All Active`) as independent, non-multiselect rows.
- Keep multiselect rows visually distinct using Font Awesome square/check-square indicators.
- Opening one multiselect dropdown should close other open multiselect dropdowns.
- Clicking outside an open multiselect dropdown should close it.

Current usage:
- Book Visibility menu in `src/listPanel.js`
- Order Helper column visibility and header filter menus in `src/orderHelperRender.js`

### 2) `stwid--listDropdown*` (action-list menus)

Use this family for menus that trigger actions, not selections.

Core classes:
- `.stwid--listDropdownTrigger`
- `.stwid--listDropdownMenu`
- `.stwid--listDropdownItem`

Behavior contract:
- Use blocker/anchor positioning patterns already established in the extension.
- Keep action rows as direct click targets with icon + label content.
- Clicking outside the list dropdown closes it (via blocker click behavior).

Current usage:
- Book action menu in `src/listPanel.js`
- Folder action menu in `src/lorebookFolders.js`

---

## `stwid--visibilityChips` Default Contract

`stwid--visibilityChips` is the default chip-lane pattern for active filter/status chips across the extension.

Rules:
- Reuse this lane/pattern for any current or future chip-based UI.
- Place chips next to their owning control/trigger in the same row when possible.
- Allow chips to wrap inside the chip lane while keeping the owning control cluster anchored.
- Use chips as the persistent active-state summary; do not overload trigger text with dynamic state labels.
- Keep chip visuals consistent with existing border/radius/color tokens in `style.css`.
