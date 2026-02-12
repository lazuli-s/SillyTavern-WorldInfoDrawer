---
name: style-guide
description: "Enforces UI/CSS styling rules for the SillyTavern WorldInfoDrawer extension. Use whenever making any UI change, adding CSS, creating or modifying HTML markup, or styling components. Ensures existing SillyTavern styles are reused before adding new ones, and that extension-specific CSS families (dropdowns, visibility chips) follow the established contract."
---

# Style Guide Skill (UI Design / CSS)

This skill defines how to style UI changes in this extension using **CSS only**, with the **highest priority on reusing existing SillyTavern (ST) styles**.

## Core Rule

**Always reuse existing ST CSS rules first.**

Before adding any new CSS class or selector:

1. Scan the ST submodule (`vendor/SillyTavern`) for existing styles that already match the need.
2. Use those classes directly in the extension markup if possible.
3. Only add new CSS if **no suitable ST style exists**.

## Where to Look First (ST Submodule)

Use these files as the **first stop** when searching for reusable styles:

- `vendor/SillyTavern/public/css/popup.css` — popup layout, buttons, dialog behavior
- `vendor/SillyTavern/public/style.css` — global buttons, inputs, layouts
- `vendor/SillyTavern/public/css/world-info.css` — World Info-specific styles

## Reusable ST CSS Classes

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

### Dialogue Layout Variants

- `.large_dialogue_popup`
- `.wide_dialogue_popup`
- `.wider_dialogue_popup`
- `.vertical_scrolling_dialogue_popup`
- `.horizontal_scrolling_dialogue_popup`
- `.left_aligned_dialogue_popup`

## When Adding New CSS Is Acceptable

Only add a new class if **all** of these are true:

1. No matching ST class exists.
2. The ST submodule was already scanned.
3. The new style is **small, targeted, and local** to the extension.

When adding a new class, document **why** it was necessary.

## Dropdown Families (Extension Contract)

Use exactly one of the two dropdown families below.

### Multiselect Dropdown (`stwid--multiselectDropdown*`)

Use for selectable/toggleable option lists (including filter menus and column visibility menus).

Family classes:
- `stwid--multiselectDropdownWrap`
- `stwid--multiselectDropdownButton`
- `stwid--multiselectDropdownMenu`
- `stwid--multiselectDropdownOption`
- `stwid--multiselectDropdownOptionIcon`
- `stwid--multiselectDropdownOptionCheckbox`

Book Visibility rules:
- Keep preset actions (`All Books`, `All Active`) at the top.
- Presets are independent actions, not multiselect rows.
- Multiselect rows (`Global`, `Chat`, `Persona`, `Character`) use Font Awesome square checkbox icons (`fa-square` / `fa-square-check`).

### Action List Dropdown (`stwid--listDropdown*`)

Use for action menus (book/folder context actions and future single-action lists).

Family classes:
- `stwid--listDropdownTrigger`
- `stwid--listDropdownMenu`
- `stwid--listDropdownItem`

These menus are action lists only (no select/multiselect behavior).

## Visibility Chips (`stwid--visibilityChips`)

Maintain the default chip contract:

- `stwid--visibilityChips` sits beside any visibility trigger/help controls.
- Chips summarize currently active visibility selections/mode.
- Chips are status indicators only; they are not interactive controls.
