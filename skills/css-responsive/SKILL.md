---
name: css-responsive
description: 'Authoring companion and review tool enforcing responsive/mobile CSS rules for this SillyTavern WorldInfoDrawer extension. Covers four rule families: Responsive Units (RESP), Breakpoints (BRK), Overflow (OVF), and Layout (LAY). Use when writing new CSS, modifying existing CSS, or auditing style.css for mobile/responsive violations. Triggers automatically every time any CSS is added or changed — run alongside the css-ST skill.'
metadata:
  sync:
    version: 2
    hash: sha256-23523a29efb7f936787e5b4573df002166ea135a33b2de33802ce8ff0550070c
---

# CSS Responsive

## Breakpoints (mirror SillyTavern exactly)

| Name | Value | ST source |
|---|---|---|
| Mobile | `max-width: 1000px` | `style.css` — main mobile threshold (`@media screen and (max-width: 1000px)`) |
| Small phone | `max-width: 768px` | `style.css` — model-card / narrow-popup threshold |

Always use these exact pixel values. Do not introduce other breakpoints.

## Rule Families

### RESP — Responsive Units

| ID | Rule |
|---|---|
| RESP-01 | Use fluid units (`%`, `vw`, `vh`, `em`, `rem`) for panel widths and heights. Reserve `px` for borders, padding, gaps, and font sizes. |
| RESP-02 | Any fixed pixel width on a panel or container must be accompanied by `max-width: 100%` so it cannot exceed the viewport on small screens. |
| RESP-03 | Never use `width: Xpx` or `min-width: Xpx` on an element that fills a major layout region (drawer, list panel, editor panel, Order Helper). Use `min-width: 0` to allow shrinking inside flex containers instead. |

### BRK — Breakpoints

| ID | Rule |
|---|---|
| BRK-01 | Place all mobile overrides inside `@media screen and (max-width: 1000px) { }`. Place small-phone overrides inside `@media screen and (max-width: 768px) { }`. |
| BRK-02 | Add a mobile block for every new CSS section that introduces a `flex-direction: row` or `display: flex` layout on a major panel. |
| BRK-03 | Never use `min-width` media queries (mobile-first breakpoints) — this codebase uses the same desktop-first pattern as SillyTavern. |
| BRK-04 | Place each `@media` block directly after the source section it overrides, not at the end of the file. This keeps related rules co-located. |

### OVF — Overflow

| ID | Rule |
|---|---|
| OVF-01 | Never allow horizontal overflow at the `<body>` or drawer level. Any element that could be wider than the viewport must have `overflow-x: hidden` on its container or `overflow-x: auto` on its own scrollable wrapper. |
| OVF-02 | Wide tables (e.g. the Order Helper table) must be wrapped in a container with `overflow-x: auto` — do not set `overflow-x: auto` directly on the `<table>`. |
| OVF-03 | Long text in constrained containers must have `overflow: hidden` + `text-overflow: ellipsis` + `white-space: nowrap`, or allow wrapping with `overflow-wrap: break-word`. Never let text silently push the layout wider. |

### LAY — Layout

| ID | Rule |
|---|---|
| LAY-01 | Any flex container using `flex-direction: row` that contains the list panel and editor/Order Helper side by side **must** include a `@media (max-width: 1000px)` override switching it to `flex-direction: column`. |
| LAY-02 | On mobile, the list panel and editor panel each become full-width (`width: 100%`, `max-width: none`). Remove any fixed pixel width from both in the mobile block. |
| LAY-03 | The vertical splitter (`.stwid--splitter`, used for horizontal left/right resizing) must be hidden on mobile (`display: none`). A separate horizontal splitter element handles top/bottom resizing on mobile. |
| LAY-04 | Filter rows, sort rows, and control rows that use `display: flex` must allow wrapping on mobile (`flex-wrap: wrap`) so controls don't clip off-screen. |
| LAY-05 | On mobile, the Order Helper panel inherits full-width and stacks below the list. Its inner table container must be a block-level element with `overflow-x: auto`. |

## Guide Mode (writing new CSS)

When authoring new CSS for this extension:

1. Apply all applicable RESP, BRK, OVF, and LAY rules from the start.
2. After writing any new rule that affects panel widths, heights, or flex direction, immediately add the corresponding mobile block (BRK-04: place it directly after the source section).
3. When in doubt about a unit, prefer a fluid value and add a comment explaining the constraint.
4. Load `references/examples.md` for concrete before/after examples of each rule.

## Review Mode (auditing existing CSS)

When asked to review or audit CSS for responsive violations:

1. Evaluate each rule against the code.
2. Output a structured checklist:
   - `[PASS]`, `[FAIL]`, or `[N/A]` for each rule ID
   - For FAIL items: exact line or snippet + corrected version
3. Do not use `[N/A]` to avoid flagging a violation. When in doubt, flag it as `[FAIL]`.

## Resources

- `references/examples.md` — before/after CSS snippets for every rule ID. Load when a rule application is unclear.
