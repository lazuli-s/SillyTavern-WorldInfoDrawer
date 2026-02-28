---
name: css-guide
description: Reference guide to all CSS skills in this SillyTavern WorldInfoDrawer extension. Explains what each CSS skill covers and when to load it. Use when unsure which CSS skill applies to the current task, or when starting a task that touches CSS, UI, or HTML markup. Also invoked by doc-guide when a CSS task is detected.
---

# css-guide — CSS Skill Reference

Six CSS skills cover different aspects of CSS work in this extension. Load only what is relevant to the current task — do not load all of them by default.

## Skill Overview

| Skill | What it covers | Load when |
|---|---|---|
| `css-ST` | Catalog of reusable SillyTavern CSS classes and their modifiers | Making any UI change, adding CSS, or creating HTML markup — always check here before writing new extension CSS |
| `css-responsive` | Responsive/mobile rules: breakpoints, overflow, layout, responsive units (RESP, BRK, OVF, LAY) | Writing or modifying any CSS — run alongside `css-ST` for every CSS edit |
| `css-animation` | CSS transition and animation performance rules: compositor vs paint vs layout property tiers (ANIM-01–03) | Writing any `transition` property or `@keyframes` block |
| `css-accessibility` | Accessibility rules: focus styles, reduced-motion, interactive visibility, accessible names, keyboard reach (ACC-01–05) | Writing CSS or HTML for interactive elements; adding any transition or animation; reviewing CSS files or markup |
| `css-rules` | Naming, formatting, property value, and danger rules for extension CSS (NAME, FMT, PROP, DGR) | Creating new CSS classes, writing new CSS blocks, or cleaning up existing CSS |
| `css-audit` | Full CSS file audit — runs every rule from all skill families against `style.css` and writes a findings report | User explicitly asks to audit, review, or check `style.css` for violations (`/css-audit`) |

## Pairing Rules

Some skills are nearly always loaded together:

- **`css-ST` + `css-responsive`** — load both for any CSS or HTML edit.
- **`css-animation` + `css-accessibility`** — every `transition` or `@keyframes` block needs both: `css-animation` for performance tier rules, `css-accessibility` (ACC-02) for the required `prefers-reduced-motion` fallback.

`css-audit` is a standalone audit tool — do not include it in routine authoring sessions.
