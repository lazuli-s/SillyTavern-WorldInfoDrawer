---
name: css-ST
description: Reference of reusable SillyTavern CSS classes for the WorldInfoDrawer extension. Use whenever making any UI change, adding CSS, or creating HTML markup — check here before adding new extension CSS. Lists all major ST component families with modifiers so you can pick the right class without scanning the submodule.
---

# CSS-ST — SillyTavern Style Reference

## Core Rule

**Always reuse existing ST CSS classes before writing new extension CSS.**

If what you need is covered below, use it. Only add new `.stwid--` classes when
nothing here fits, and document why with a comment.

---

## Buttons

### `.menu_button`

General-purpose interactive button. Use for any standalone clickable action.

| Modifier | When to use |
|---|---|
| *(base)* | Standard button with text or icon |
| `[disabled]` / `.disabled` | Grayed out, non-clickable |
| `.toggleable` | Represents an on/off state; add `.toggled` for the "on" state |
| `.menu_button_default` | Elevated/filled style — use for primary confirm actions |
| `.menu_button_icon` | Wrapper `<span>` inside a button when combining icon + text label |

### `.right_menu_button`

Smaller icon button for toolbars and sidebar panels. Base brightness 75%,
brightens to 150% on hover. Use when `.menu_button` is too large.

### `.mes_button`

Low-opacity (0.3) icon button used in the message action area. Becomes fully
opaque on hover. Use for secondary/utility actions that should stay out of the
way visually.

---

## Text Inputs

### `.text_pole`

Single class covers all input types. Apply directly to the element:

| Element | Use |
|---|---|
| `input.text_pole` | Standard text field |
| `textarea.text_pole` | Multi-line text area |
| `select.text_pole` | Native dropdown (adds arrow padding automatically) |

---

## Select2 Dropdowns

Use when you need a searchable or multi-select dropdown beyond native `<select>`.

| Class | Purpose |
|---|---|
| `.select2-choice-clickable-buttonstyle` | Multi-select field showing selected items as removable chips |
| `.select2-results` | The dropdown results panel (includes search box) |
| `.select2-results__option` | Individual option row |
| `.select2-results__option--highlighted` | Focused/hovered option |
| `.select2-results__option--selected` | Already-selected option |
| `.select2-results__option--disabled` | Non-selectable option |
| `.select2-results__option--group` | Group header row |

---

## Toggles & Checkboxes

Native HTML elements — ST provides all styling automatically. No extra class needed.

| Element | Appearance |
|---|---|
| `input[type='checkbox']` | Styled checkbox — blue when checked |
| `input[type='range']` | Styled slider |

---

## Inline Elements

| Class | Purpose |
|---|---|
| `.note-link-span` | Inline blue circle-question icon; use for inline help/reference links |
| `.fa-solid.fa-circle-info` | Info icon (solid); add `.opacity50p` to dim to 50% |
| `.fa-solid.fa-circle-question` | Question mark icon (solid) |

---

## Typography

Use heading elements directly — ST styles the full hierarchy automatically.

| Element / Class | Appearance |
|---|---|
| `h1` | Large, colored, underlined — page title level |
| `h2` | Bold — major section title |
| `h3` | With colored left border |
| `h4`–`h6` | Progressively smaller, minimal decoration |
| `.standoutHeader` | Section label with gradient background and bottom border; use for labeled groups |

---

## Drawers (Collapsible Sections)

Build a collapsible section using these parts together:

| Class | Role |
|---|---|
| `.inline-drawer` | Outer container |
| `.inline-drawer-header` | Clickable header bar (flex, space-between) |
| `.inline-drawer-toggle` | Add to the header to make it the toggle trigger |
| `.inline-drawer-icon` | Chevron/arrow icon inside the header |
| `.inline-drawer-content` | Hidden content panel (shown/hidden by ST JS) |
| `.standoutHeader.inline-drawer-header` | Header with gradient background — use for visually prominent sections |

---

## Menus & Popups

### Context / options menu

`#options .options-content` — scrollable context menu panel. Icons inside
(`.options-content i`) are auto-sized and center-aligned.

### Popup API (JavaScript)

| Call | Use |
|---|---|
| `Popup.show.text(message)` | Simple message dialog |
| `Popup.show.confirm(message)` | OK / Cancel confirmation dialog |
| `Popup.show.input(message, defaultValue)` | Single text input dialog |
| `new Popup(html, POPUP_TYPE.DISPLAY)` | Custom HTML content inside a popup |

### Popup size modifiers

Apply to the popup element after creation to control size:

| Class | Effect |
|---|---|
| `.large_dialogue_popup` | 90vh × 90vw |
| `.wide_dialogue_popup` | Minimum shelf width |
| `.wider_dialogue_popup` | Min 750px, max 90% viewport width |
| `.vertical_scrolling_dialogue_popup` | Enables vertical scroll inside content |
| `.horizontal_scrolling_dialogue_popup` | Enables horizontal scroll inside content |
| `.left_aligned_dialogue_popup` | Left-aligns content text |
