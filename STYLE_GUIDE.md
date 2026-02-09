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

## Dropdown Families (Extension Contract)

Use exactly one of the two dropdown families below.

### 1) Multiselect Dropdown (`stwid--multiselectDropdown*`)

Use for selectable/toggleable option lists (including filter menus and column visibility menus).

- Family classes:
  - `stwid--multiselectDropdownWrap`
  - `stwid--multiselectDropdownButton`
  - `stwid--multiselectDropdownMenu`
  - `stwid--multiselectDropdownOption`
  - `stwid--multiselectDropdownOptionIcon`
  - `stwid--multiselectDropdownOptionCheckbox`
- For Book Visibility:
  - Keep preset actions (`All Books`, `All Active`) at the top.
  - Presets are independent actions, not multiselect rows.
  - Multiselect rows (`Global`, `Chat`, `Persona`, `Character`) use Font Awesome square checkbox icons (`fa-square` / `fa-square-check`).

### 2) Action List Dropdown (`stwid--listDropdown*`)

Use for action menus (book/folder context actions and future single-action lists).

- Family classes:
  - `stwid--listDropdownTrigger`
  - `stwid--listDropdownMenu`
  - `stwid--listDropdownItem`
- These menus are action lists only (no select/multiselect behavior).

## Visibility Chips (`stwid--visibilityChips`)

Keep the default chip contract:

- `stwid--visibilityChips` sits beside any visibility trigger/help controls.
- Chips summarize currently active visibility selections/mode.
- Chips are status indicators only; they are not interactive controls.
