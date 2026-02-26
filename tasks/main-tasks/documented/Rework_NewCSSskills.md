# New CSS Skills — Planning Document

Planning document for three new `.claude/skills/` entries: `css-rules` (includes naming),
`css-animation`, and `css-accessibility` — all adapted for the SillyTavern WorldInfoDrawer
extension context. `css-audit` is planned separately in `tasks/NewFeature_CSSAudit.md`.

---

## Background

The extension already has a `style-guide` skill that enforces ST-specific CSS rules
(reuse SillyTavern's own styles first). These new skills are **separate and complementary**:
they enforce universal CSS discipline — naming, formatting, property values, animation
performance, and accessibility — not ST-specific concerns.

Source document: `docs/Google CSS Style Guide.md`
Reference model: `.claude/skills/st-js-best-practices/SKILL.md` (rule family + ID format)

---

## Skill 1: `css-rules` (Naming + Formatting + Properties + Danger)

Modeled after `.claude/skills/st-js-best-practices/SKILL.md` — uses rule families with IDs,
operates in two modes (Guide mode when writing, Review mode when auditing).

### Frontmatter description (trigger text)

Authoring companion enforcing CSS naming, formatting, property value, and danger rules for this
SillyTavern extension, based on the Google CSS Style Guide. Covers four rule families:
Naming (NAME), Formatting (FMT), Properties (PROP), and Danger (DGR). Use when creating new
CSS classes, writing new CSS blocks, cleaning up existing CSS, or explicitly reviewing CSS for
naming, formatting, and property violations. Triggered independently by name — does not
activate automatically for every CSS edit.

### Trigger

Independent — triggered when: creating new CSS classes, writing new CSS blocks, reformatting
CSS, cleaning up CSS, or explicitly invoked as "css-rules".

### Rule Families

#### Naming (NAME)

| ID | Rule |
| --- | --- |
| NAME-01 | All extension-owned classes must start with `.stwid--` (double hyphen, not single). |
| NAME-02 | Words after the prefix must be hyphen-separated. Enforce `.stwid--folder-header` for all new code. Existing camelCase names (e.g. `stwid--multiselectDropdownWrap`) are a known deviation — do not flag them, but do not add new camelCase names even when extending an existing camelCase family. |
| NAME-03 | Names must be meaningful and functional — describe what the element *is* or *does*, not how it looks. `.stwid--entry-list` is good; `.stwid--red-box` or `.stwid--x1` are not. |
| NAME-04 | Names should be as short as possible while remaining clear. Prefer `.stwid--nav` over `.stwid--navigation` when context is obvious. |
| NAME-05 | Do not create new `#` (ID) selectors for extension elements. SillyTavern's own IDs (`#WorldInfo`, `#wi-holder`, `#WIEntryHeaderTitlesPC`, etc.) are allowed for scoping but must never be created by the extension. |

#### Naming Guideline (design judgment — not a checkable rule)

Give each class a name that is unique enough on its own that no parent scope is needed to
distinguish it from similar classes elsewhere. If two classes in different components share
a name but have different styles, rename the less-established one rather than relying on
parent scoping to disambiguate. Apply during class creation, not as a PASS/FAIL in reviews.

#### Formatting (FMT)

| ID | Rule |
| --- | --- |
| FMT-01 | Use a single space after `:` in declarations. `color: red` ✓ — `color:red` ✗ |
| FMT-02 | Use a single space between the last selector and `{`. Opening brace on the same line. `.video {` ✓ — `.video{` or `.video\n{` ✗ |
| FMT-03 | Each selector on its own line. Each declaration on its own line. Never pack multiple selectors or declarations on one line. |
| FMT-04 | End every declaration with a semicolon, including the last one in a block. |
| FMT-05 | Separate rules with a single blank line (one empty line between rule blocks). |
| FMT-06 | Use single quotes `'` for attribute selectors and property string values. Use no quotes in `url()`. Exception: `@charset` uses double quotes. |
| FMT-07 | Indent all block content (declarations and nested rules) to reflect hierarchy. |
| FMT-08 | Group style sections with a section comment. Example: `/* 1) Drawer */`. Required. |
| FMT-09 | When a parent selector (e.g., `.stwid--orderTable`, `.stwid--books`) is used as a prefix in more than 3 separate rule blocks, nest those rules inside the parent selector at the top level. This mirrors the existing `#WorldInfo { }` nesting pattern and improves readability. Example: instead of `.stwid--orderTable thead { }`, `.stwid--orderTable tr { }`, `.stwid--orderTable td { }` as separate blocks, write `.stwid--orderTable { thead { } tr { } td { } }`. This is a forward-looking rule for new CSS only — existing CSS is not refactored. |

#### Properties (PROP)

| ID | Rule |
| --- | --- |
| PROP-01 | Use shorthand properties where possible. `padding: 0 1em 2em` ✓ over four separate `padding-*` rules ✗. Same for `font`, `margin`, `border`, `background`. |
| PROP-02 | Omit the unit after `0` values when not required. `margin: 0` ✓ — `margin: 0px` ✗. Exception: `flex: 0px` (flex-basis requires a unit). |
| PROP-03 | Always include a leading `0` for values between -1 and 1. `font-size: 0.8em` ✓ — `font-size: .8em` ✗ |
| PROP-04 | Use 3-character hex color notation where the color permits it. `#ebc` ✓ — `#eebbcc` ✗ |

#### Danger (DGR)

| ID | Rule |
| --- | --- |
| DGR-01 | Never use `!important` without an accompanying `/* override: <reason> */` comment that explains why the override is necessary. Bare `!important` is a violation. |
| DGR-02 | Never use browser hacks or user-agent detection workarounds in CSS. If browser-specific behavior is needed, find a standards-compliant solution first. |
| DGR-03 | Never qualify class selectors with element type names. `.error` ✓ — `div.error` ✗. Exception: when the element type is genuinely required for specificity against vanilla ST styles. |
| DGR-04 | Keep selectors shallow. Flag any selector chain deeper than 3 levels of nesting (e.g. `.a .b .c .d` is a violation). Deeply nested selectors are fragile, hard to override, and signal tight coupling. |

### Guide Mode (Writing New CSS)

When writing new CSS for this extension:

1. Apply all applicable rules from the start — do not draft first and fix later.
2. When a rule application is non-obvious, note it with a brief inline comment.
3. Load `references/examples.md` (if it exists) for concrete good/bad examples.

### Review Mode (Auditing Existing CSS)

When asked to review or audit CSS for naming/formatting/property/danger issues:

1. Evaluate each rule against the code.
2. Output a structured checklist in the same format as `st-js-best-practices`:
   - `[PASS]`, `[FAIL]`, or `[N/A]` for each rule
   - For FAIL items: exact line/snippet + corrected version
3. Do not use `[N/A]` to avoid flagging a violation. When in doubt, flag it.

---

## Skill 2: `css-animation`

### Frontmatter description (trigger text)

Authoring companion enforcing CSS animation and transition performance rules for this
SillyTavern extension. Defines the performance cost of each transition property tier
(compositor, paint, layout) and blocks risky patterns in new code. Use when writing new
CSS transitions or animations, or when new transitions appear in code being authored or
reviewed. Does not audit pre-existing code. For motion-sensitivity accessibility rules,
see `css-accessibility` (ACC-02).

### Trigger

- Explicit: "css-animation", "writing CSS transitions", "adding CSS animation"
- Automatic: when new CSS transitions or animations are being written (not triggered by reviews of pre-existing code)

### Mode

Authoring guide only — does not audit existing code. Existing violations are addressed
via a separate refactoring task.

### Performance Tiers (define in SKILL.md)

| Tier | Properties | Performance impact | Allowed? |
| --- | --- | --- | --- |
| Compositor | `transform`, `opacity` | Excellent — GPU only, no repaint or layout | Always allowed |
| Paint | `color`, `background-color`, `border-color`, `box-shadow`, `outline-color` | Acceptable — triggers repaint but no layout recalc | Allowed on small/interactive elements |
| Layout | `width`, `height`, `margin`, `padding`, `max-height`, `top`, `left`, etc. | Bad — forces layout recalculation every frame, causes jank | Blocked in new code |

### Rule Families

#### Animation (ANIM)

| ID | Rule |
| --- | --- |
| ANIM-01 | Never animate layout-tier properties in new code. `transition: max-height 250ms` or `transition: margin-bottom 250ms` are violations. Use `transform` equivalents or restructure the markup. |
| ANIM-02 | Never use bare shorthand or `all` in `transition`. `transition: opacity 200ms ease` ✓ — `transition: 200ms` ✗ — `transition: all 200ms ease` ✗. Both forms animate every changing property including layout-triggering ones. Always name a specific property. |
| ANIM-03 | Use `will-change` only during an active animation. Never apply it permanently as a "performance hint". Remove it once the animation is done. |

> **Motion sensitivity:** The `prefers-reduced-motion` rule is owned by `css-accessibility`
> (ACC-02). When writing any animation or transition, always check that skill for the required
> fallback pattern.

### Reference files

`references/examples.md` — before/after CSS snippets for each ANIM rule.

---

## Skill 3: `css-accessibility`

### Frontmatter description (trigger text)

Authoring companion and review tool enforcing accessibility rules for this SillyTavern
extension. Covers CSS focus styles, motion sensitivity, and the minimal HTML/ARIA rules
that apply when the extension creates interactive controls (accessible names for icon
buttons, keyboard reachability). Replaces `fixing-accessibility` for this extension's
scope. Use when writing new CSS or HTML for interactive elements, or automatically during
any code review that touches CSS files.

### Trigger

- Explicit: "css-accessibility", "check focus styles", "CSS accessibility"
- Automatic: during any code review that includes `style.css`

### Mode

Both authoring guide AND review — flags violations in new and existing code.

### Rule Families

#### Accessibility (ACC)

| ID | Rule |
| --- | --- |
| ACC-01 | Never remove a focus indicator without providing a visible replacement. `outline: none` or `outline: 0` alone is a violation. Always pair with a visible `:focus-visible` replacement (e.g. `box-shadow`, `border`, custom outline). Use `:focus-visible`, not `:focus` — it activates only for keyboard navigation, not mouse clicks. |
| ACC-02 | Always provide a `prefers-reduced-motion` media query block that disables or reduces any `transition` or `animation` that moves content. Opacity fades are exempt. This rule applies to both new code and existing code under review. |
| ACC-03 | Do not use CSS to visually hide interactive elements in a way that makes them unreachable by keyboard (e.g. `visibility: hidden` or `display: none` on focused/active controls without intent). |
| ACC-04 | Icon-only buttons and controls must have an accessible name. Add `aria-label` to any button or interactive element that contains only an icon with no visible text label. |
| ACC-05 | All interactive elements added by the extension must be reachable by Tab and operable by keyboard. Do not use `tabindex` values greater than `0`. |

### `css-audit` integration

`css-audit` incorporates ACC rules — accessibility violations appear in the audit report
alongside naming, formatting, and danger violations.

### Reference files

`references/examples.md` — before/after CSS snippets for each ACC rule.

---

## Implementation Order

1. Create `css-rules` skill (naming + formatting + properties + danger, all in one)
2. Create `css-animation` skill (authoring guide, performance tiers, reference file)
3. Create `css-accessibility` skill (authoring + review, ACC rules, reference file)
4. Create `css-audit` skill — see `tasks/NewFeature_CSSAudit.md` for full planning

### Cleanup task (after all skills are created)

- Delete `.agents/skills/fixing-accessibility/` — critical rules absorbed into `css-accessibility` as ACC-04 and ACC-05
- Delete `.agents/skills/fixing-motion-performance/` — superseded by `css-animation`
- Open a separate refactoring task for the existing `style.css` transition violations
  (bare `transition: 200ms`, `transition: all`, `margin-bottom` transition, `max-height` transition)

---

## Known CSS Quirk: `body.stwid-- #WorldInfo` selector prefix

Most rules in `style.css` are prefixed with `body.stwid-- #WorldInfo`. This is intentional but
nuanced — the `css-audit` skill must understand when it is needed vs. redundant.

### What the two parts mean

- **`body.stwid--`** — a class the extension adds to `<body>` the moment it activates
  (`src/drawer.js` line 182). It acts as an "on/off switch": styles under it apply only while
  the extension is running.
- **`#WorldInfo`** — the drawer container element owned by SillyTavern.

### When `body.stwid--` is essential (keep it)

When a rule overrides or hides a SillyTavern-owned element. Without the gate the override would
be permanently active, even if the extension is disabled.

| Selector | Reason |
| --- | --- |
| `body.stwid-- #WorldInfo { }` | Overrides ST's own element size/layout/tokens |
| `body.stwid-- #WorldInfo.openDrawer { }` | Forces `display:flex` on ST's own element |
| `body.stwid-- #WorldInfo #wi-holder { }` | Hides ST's own child `#wi-holder` |

### When `body.stwid--` is redundant (flag it in css-audit)

When a rule only targets `.stwid--*` extension classes. Those classes only exist when the
extension created them, so the gate adds nothing — there is nothing to accidentally match.

```css
/* Redundant — .stwid--list can't exist unless the extension is active */
body.stwid-- #WorldInfo .stwid--list { … }

/* Correct — #WorldInfo is enough scoping */
#WorldInfo .stwid--list { … }
```

### css-audit rule to add

The `css-audit` skill should flag occurrences of `body.stwid-- #WorldInfo .stwid--` as
potentially redundant and suggest simplifying to `#WorldInfo .stwid--`. It must NOT flag the
three "keep" selectors listed above.

A cleanup task for this has been documented at: `tasks/Refactoring_stylecss.md`

---

## Open Questions

None — all decisions captured above.

---

## Status

- [x] Planning complete — all decisions made
- [x] `css-rules` skill created
- [x] `css-animation` skill created
- [x] `css-accessibility` skill created (includes ACC-01 through ACC-05)
- [ ] `.agents/skills/fixing-accessibility/` deleted (rules absorbed into `css-accessibility`)
- [ ] `.agents/skills/fixing-motion-performance/` deleted (superseded by `css-animation`)
