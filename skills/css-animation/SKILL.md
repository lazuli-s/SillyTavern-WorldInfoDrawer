---
name: css-animation
description: Authoring companion enforcing CSS animation and transition performance rules for this SillyTavern WorldInfoDrawer extension. Defines the performance cost of each transition property tier (compositor, paint, layout) and blocks risky patterns in new code. Use when writing new CSS transitions or @keyframe animations, or when new transitions appear in code being authored or reviewed. For motion-sensitivity accessibility rules, see css-accessibility (ACC-02).
---

# CSS Animation

## Performance Tiers

| Tier | Properties | Impact | Allowed? |
|---|---|---|---|
| Compositor | `transform`, `opacity` | Excellent — GPU only, no repaint or layout | Always |
| Paint | `color`, `background-color`, `border-color`, `box-shadow`, `outline-color` | Acceptable — repaint only, no layout recalc | On small/interactive elements |
| Layout | `width`, `height`, `margin`, `padding`, `max-height`, `top`, `left`, etc. | Bad — forces layout recalc every frame, causes jank | Blocked in new code |

## Rule Family: Animation (ANIM)

| ID | Rule |
|---|---|
| ANIM-01 | Never animate layout-tier properties in new code. `transition: max-height 250ms` or `transition: margin-bottom 250ms` are violations. Use `transform` equivalents or restructure the markup. |
| ANIM-02 | Never use bare shorthand or `all` in `transition`. `transition: opacity 200ms ease` ✓ — `transition: 200ms` ✗ — `transition: all 200ms ease` ✗. Always name a specific property. |
| ANIM-03 | Use `will-change` only during an active animation. Never apply it permanently as a "performance hint". Remove it once the animation completes. |

> **Motion sensitivity:** The `prefers-reduced-motion` rule is owned by `css-accessibility` (ACC-02). When writing any animation or transition, always check that skill for the required fallback pattern.

## Guide Mode (Writing New CSS)

1. Before writing any `transition` or `@keyframes` rule, identify the performance tier of every property you intend to animate.
2. Apply ANIM-01 through ANIM-03 from the start — do not draft first and fix later.
3. Load `references/examples.md` for concrete before/after snippets for each rule.
