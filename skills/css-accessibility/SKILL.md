---
name: css-accessibility
description: Authoring companion and review tool enforcing accessibility rules for this SillyTavern WorldInfoDrawer extension. Covers focus styles (ACC-01), motion sensitivity (ACC-02), interactive element visibility (ACC-03), accessible names for icon-only buttons (ACC-04), and keyboard reachability (ACC-05). Use when writing new CSS or HTML for interactive elements, adding icon-only buttons or controls, writing CSS transitions or animations, or reviewing style.css or markup for accessibility violations. Triggers automatically during any code review that includes CSS files or interactive HTML elements.
---

# CSS Accessibility

## Rule Family: Accessibility (ACC)

| ID | Rule |
|---|---|
| ACC-01 | Never remove a focus indicator without providing a visible replacement. `outline: none` or `outline: 0` alone is a violation. Always pair with a visible `:focus-visible` replacement (e.g. `box-shadow`, `border`, custom outline). Use `:focus-visible`, not `:focus` — it activates only for keyboard navigation, not mouse clicks. |
| ACC-02 | Always provide a `prefers-reduced-motion` media query block that disables or reduces any `transition` or `animation` that moves content. Opacity fades are exempt. This rule applies to **both new code and existing code under review**. |
| ACC-03 | Do not use CSS to visually hide interactive elements in a way that makes them unreachable by keyboard (e.g. `visibility: hidden` or `display: none` on a control that should remain operable). Use `display: none` only when the element is genuinely inactive. |
| ACC-04 | Icon-only buttons and controls must have an accessible name. Add `aria-label` to any button or interactive element that contains only an icon with no visible text label. |
| ACC-05 | All interactive elements added by the extension must be reachable by Tab and operable by keyboard. Do not use `tabindex` values greater than `0`. |

## Guide Mode (writing new CSS or HTML)

1. Apply all applicable ACC rules from the start — do not draft first and fix later.
2. For every `outline: none` removal, immediately add a `:focus-visible` replacement (ACC-01).
3. For every `transition` or `animation` block, immediately add a `prefers-reduced-motion` override directly after it (ACC-02). Cross-reference `css-animation` (ANIM-01–03) for performance tier rules on the same transition.
4. For every icon-only button or control in markup, add `aria-label` before finishing (ACC-04).
5. Load `references/examples.md` for concrete before/after snippets for each rule.