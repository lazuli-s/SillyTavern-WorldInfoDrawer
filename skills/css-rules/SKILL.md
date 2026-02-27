---
name: css-rules
description: Authoring companion enforcing CSS naming, formatting, property value, and danger rules for this SillyTavern extension. Covers four rule families: Naming (NAME), Formatting (FMT), Properties (PROP), and Danger (DGR). Use when creating new CSS classes, writing new CSS blocks, cleaning up existing CSS, or explicitly reviewing CSS for naming, formatting, and property violations. Triggered independently by name — does not activate automatically for every CSS edit.
---

# CSS Rules

## Naming (NAME)

| ID | Rule |
|---|---|
| NAME-01 | All extension-owned classes must start with `.stwid--` (double hyphen, not single). |
| NAME-02 | Use hyphen-separated words for all new class names: `.stwid--folder-header`, `.stwid--list-dropdown`. When a class is a named part of a component family, use `__` to separate the component name from the element name: `.stwid--list-dropdown__menu`, `.stwid--list-dropdown__item`. Standalone classes never use `__`. Existing camelCase names (e.g. `stwid--multiselectDropdownWrap`) are a known deviation — do not flag them, but do not add new camelCase names. |
| NAME-03 | Names must be meaningful and functional — describe what the element *is* or *does*, not how it looks. `.stwid--entry-list` is good; `.stwid--red-box` or `.stwid--x1` are not. |
| NAME-04 | Names should be as short as possible while remaining clear. Prefer `.stwid--nav` over `.stwid--navigation` when context is obvious. |
| NAME-05 | Do not create new `#` (ID) selectors for extension elements. SillyTavern's own IDs (`#WorldInfo`, `#wi-holder`, `#WIEntryHeaderTitlesPC`, etc.) are allowed for scoping but must never be created by the extension. |

### Naming Guideline (design judgment — not a checkable rule)

Give each class a name unique enough on its own that no parent scope is needed to distinguish it from similar classes elsewhere. If two classes in different components share a name but have different styles, rename the less-established one rather than relying on parent scoping to disambiguate. Apply during class creation, not as a PASS/FAIL in reviews.

## Formatting (FMT)

| ID | Rule |
|---|---|
| FMT-01 | Use single quotes `'` for attribute selectors and property string values. Use no quotes in `url()`. Exception: `@charset` uses double quotes. |
| FMT-02 | Indent all block content (declarations and nested rules) to reflect hierarchy. |
| FMT-03 | Group style sections with a section comment. Example: `/* 1) Drawer */`. Required. |
| FMT-04 | When a parent selector (e.g., `.stwid--orderTable`, `.stwid--books`) is used as a prefix in more than 3 separate rule blocks, nest those rules inside the parent selector at the top level. This mirrors the existing `#WorldInfo { }` nesting pattern. |

## Properties (PROP)

| ID | Rule |
|---|---|
| PROP-01 | Use shorthand properties where possible. `padding: 0 1em 2em` ✓ over four separate `padding-*` rules ✗. Same for `font`, `margin`, `border`, `background`. |
| PROP-02 | Use 3-character hex color notation where the color permits it. `#ebc` ✓ — `#eebbcc` ✗ |

## Danger (DGR)

| ID | Rule |
|---|---|
| DGR-01 | Never use `!important` without an accompanying `/* override: <reason> */` comment that explains why the override is necessary. Bare `!important` is a violation. |
| DGR-02 | Never use browser hacks or user-agent detection workarounds in CSS. If browser-specific behavior is needed, find a standards-compliant solution first. |
| DGR-03 | Never qualify class selectors with element type names. `.error` ✓ — `div.error` ✗. Exception: when the element type is genuinely required for specificity against vanilla ST styles. |
| DGR-04 | Keep selectors shallow. Flag any selector chain deeper than 3 levels of nesting (e.g. `.a .b .c .d` is a violation). Deeply nested selectors are fragile, hard to override, and signal tight coupling. |

## Guide Mode (writing new CSS)

When writing new CSS for this extension:

1. Apply all applicable rules from the start — do not draft first and fix later.
2. When a rule application is non-obvious, note it with a brief inline comment.
3. Load `references/examples.md` for concrete good/bad examples of each rule.