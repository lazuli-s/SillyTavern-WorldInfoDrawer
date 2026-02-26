# CSS Workflow Guide

Entry point for all CSS and UI work in this extension. Read this before making any UI or CSS change.

## When to Use Which Skill

| Situation | What to do |
| --- | --- |
| Investigating a UI/visual question before writing any code | Use `workflows/explore-css.md` |
| Making any UI or CSS change | Run `css-ST` + `css-responsive` |
| Writing new CSS classes or blocks | Run `css-rules` |
| Writing CSS transitions or animations | Run `css-animation` |
| Writing CSS for interactive elements (buttons, inputs) | Run `css-accessibility` |
| Full audit of `style.css` for quality violations | Run `css-audit` *(coming soon)* |

## Skill Run Order

For any CSS change, run skills in this order:

1. **Investigation** — if you need to define the visual change first, use `workflows/explore-css.md` before writing any code
2. **`css-ST`** — confirms ST styles are reused and extension CSS contracts are followed
3. **`css-responsive`** — confirms mobile compatibility

When writing new CSS classes or blocks, additionally run:

1. **`css-rules`** — naming, formatting, property values, danger rules
2. **`css-animation`** — only when writing transitions or animations
3. **`css-accessibility`** — only when writing CSS for interactive elements

## All CSS Skills

| Skill | File | Status | Description |
| --- | --- | --- | --- |
| `css-ST` | `skills/css-ST/SKILL.md` | Active | ST component reference — reuse before adding new extension CSS |
| `css-responsive` | `skills/css-responsive/SKILL.md` | Active | Enforce mobile/responsive rules (RESP, BRK, OVF, LAY) |
| `css-rules` | `skills/css-rules/SKILL.md` | Active | Naming, formatting, property values, danger rules |
| `css-animation` | `skills/css-animation/SKILL.md` | Active | Transition/animation performance: compositor vs. paint vs. layout tiers |
| `css-accessibility` | `skills/css-accessibility/SKILL.md` | Active | Focus styles, motion sensitivity, ARIA for icon-only buttons |
| `css-audit` | — | Coming soon | Full `style.css` audit combining css-rules + css-accessibility |

## Investigation Mode

See `workflows/explore-css.md` — a guided analysis process for defining visual changes before writing any code.
