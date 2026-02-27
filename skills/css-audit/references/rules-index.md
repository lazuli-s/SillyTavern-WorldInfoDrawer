# CSS Audit — Rules Index

All rule IDs evaluated during a css-audit run. Default priority applies when no specific context overrides it (see SKILL.md for override guidance).

---

## Family: NAME — Naming (from css-rules)

| ID | Priority | Rule |
|---|---|---|
| NAME-01 | Low | All extension-owned classes must start with `.stwid--` (double hyphen). |
| NAME-02 | Low | Use hyphen-separated words: `.stwid--folder-header`. Use `__` to separate component name from element name for component families: `.stwid--list-dropdown__item`. No new camelCase names. |
| NAME-03 | Low | Names must be functional — describe what the element *is* or *does*, not how it looks. `.stwid--entry-list` ✓ — `.stwid--red-box` ✗ |
| NAME-04 | Low | Names as short as possible while remaining clear. Prefer `.stwid--nav` over `.stwid--navigation`. |
| NAME-05 | Medium | Do not create new `#` ID selectors for extension elements. ST's own IDs are allowed for scoping. |

---

## Family: FMT — Formatting (from css-rules)

| ID | Priority | Rule |
|---|---|---|
| FMT-01 | Low | Use single quotes `'` for attribute selectors and string values. No quotes in `url()`. Exception: `@charset` uses double quotes. |
| FMT-02 | Low | Indent all block content to reflect hierarchy. |
| FMT-03 | Low | Group style sections with a section comment: `/* 1) Drawer */`. Required. |
| FMT-04 | Low | When a parent selector is used as a prefix in more than 3 separate rule blocks, nest those rules inside the parent selector. |

---

## Family: PROP — Properties (from css-rules)

| ID | Priority | Rule |
|---|---|---|
| PROP-01 | Low | Use shorthand properties where possible: `padding: 0 1em 2em` over four separate `padding-*` rules. |
| PROP-02 | Low | Use 3-character hex notation where the color permits: `#ebc` ✓ — `#eebbcc` ✗ |

---

## Family: DGR — Danger (from css-rules)

| ID | Priority | Rule |
|---|---|---|
| DGR-01 | High | Never use bare `!important`. Must be accompanied by `/* override: <reason> */`. |
| DGR-02 | Medium | Never use browser hacks or user-agent detection workarounds. |
| DGR-03 | Low | Never qualify class selectors with element types: `.error` ✓ — `div.error` ✗. Exception: when element type is required for specificity against ST styles. |
| DGR-04 | Medium | No selector chain deeper than 3 levels of nesting (e.g. `.a .b .c .d` is a violation). |

---

## Family: RESP — Responsive Units (from css-responsive)

| ID | Priority | Rule |
|---|---|---|
| RESP-01 | Medium | Use fluid units (`%`, `vw`, `vh`, `em`, `rem`) for panel widths/heights. Reserve `px` for borders, padding, gaps, and font sizes. |
| RESP-02 | Medium | Any fixed pixel width on a panel or container must include `max-width: 100%`. |
| RESP-03 | High | Never use `width: Xpx` or `min-width: Xpx` on an element that fills a major layout region. Use `min-width: 0` inside flex containers instead. |

---

## Family: BRK — Breakpoints (from css-responsive)

| ID | Priority | Rule |
|---|---|---|
| BRK-01 | Medium | Mobile overrides inside `@media screen and (max-width: 1000px)`. Small-phone overrides inside `@media screen and (max-width: 768px)`. No other breakpoint values. |
| BRK-02 | High | Add a mobile block for every new CSS section that introduces `flex-direction: row` or `display: flex` on a major panel. |
| BRK-03 | Medium | Never use `min-width` media queries (mobile-first). Desktop-first only. |
| BRK-04 | Low | Place each `@media` block directly after the source section it overrides — not at the end of the file. |

---

## Family: OVF — Overflow (from css-responsive)

| ID | Priority | Rule |
|---|---|---|
| OVF-01 | High | Never allow horizontal overflow at the `<body>` or drawer level. Elements wider than the viewport need `overflow-x: hidden` on their container or `overflow-x: auto` on their scrollable wrapper. |
| OVF-02 | Medium | Wide tables must be wrapped in a container with `overflow-x: auto`. Do not set `overflow-x: auto` directly on `<table>`. |
| OVF-03 | Medium | Long text in constrained containers must have `overflow: hidden` + `text-overflow: ellipsis` + `white-space: nowrap`, or `overflow-wrap: break-word`. Never let text silently push the layout wider. |

---

## Family: LAY — Layout (from css-responsive)

| ID | Priority | Rule |
|---|---|---|
| LAY-01 | High | Any flex container using `flex-direction: row` with side-by-side panels must include `@media (max-width: 1000px)` switching to `flex-direction: column`. |
| LAY-02 | High | On mobile, list and editor panels each become full-width (`width: 100%`, `max-width: none`). Remove fixed pixel widths in the mobile block. |
| LAY-03 | Medium | The vertical splitter (`.stwid--splitter`) must be hidden on mobile (`display: none`). |
| LAY-04 | Medium | Filter, sort, and control rows with `display: flex` must allow wrapping on mobile (`flex-wrap: wrap`). |
| LAY-05 | Medium | On mobile the Order Helper panel is full-width; its inner table container must be block-level with `overflow-x: auto`. |

---

## Family: ANIM — Animation (from css-animation)

| ID | Priority | Rule |
|---|---|---|
| ANIM-01 | High | Never animate layout-tier properties: `width`, `height`, `margin`, `padding`, `max-height`, `top`, `left`, etc. Use `transform` equivalents instead. |
| ANIM-02 | Medium | Never use bare shorthand or `all` in `transition`. Always name a specific property: `transition: opacity 200ms ease` ✓ — `transition: all 200ms ease` ✗ — `transition: 200ms` ✗ |
| ANIM-03 | Low | Use `will-change` only during an active animation. Never apply permanently as a "performance hint". |

---

## Family: ACC — Accessibility (from css-accessibility)

| ID | Priority | Rule |
|---|---|---|
| ACC-01 | High | Never remove a focus indicator without a visible `:focus-visible` replacement (`box-shadow`, `border`, or custom outline). `outline: none` alone is a violation. |
| ACC-02 | High | Every `transition` or `animation` block must be accompanied by a `prefers-reduced-motion` override that disables or reduces it. Opacity-only fades are exempt. |
| ACC-03 | High | Do not use `visibility: hidden` or `display: none` to hide interactive elements that should remain keyboard-operable. |
| ACC-04 | High | Icon-only buttons must have `aria-label`. Flag any `<button>` or interactive element with only an icon and no visible text. Note: ACC-04 applies to HTML markup, not CSS directly — flag if HTML is visible in a template or inline string in a JS file being audited alongside CSS. |
| ACC-05 | High | All interactive elements must be Tab-reachable. No `tabindex` greater than `0`. |

---

## Family: ST-REUSE — SillyTavern Style Reuse (from css-ST)

| ID | Priority | Rule |
|---|---|---|
| ST-01 | Medium | Before writing extension CSS, check if an ST class already covers the need. Flag custom extension styles that duplicate `.menu_button`, `.text_pole`, `.inline-drawer`, `.right_menu_button`, `.mes_button`, `.standoutHeader`, or any other ST component from the css-ST reference. |
| ST-02 | High | Never hardcode hex colors for text, backgrounds, or borders. Use ST CSS variables (`--SmartThemeBodyColor`, `--SmartThemeBorderColor`, `--black50a`, etc.) so the extension respects the active theme. |

---

## Rule count summary

| Family | Count |
|---|---|
| NAME | 5 |
| FMT | 4 |
| PROP | 2 |
| DGR | 4 |
| RESP | 3 |
| BRK | 4 |
| OVF | 3 |
| LAY | 5 |
| ANIM | 3 |
| ACC | 5 |
| ST-REUSE | 2 |
| **Total** | **40** |
