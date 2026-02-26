# CSS Animation — Rule Examples

Before/after CSS snippets for every ANIM rule ID.

---

## ANIM-01: Never animate layout-tier properties

Layout-tier properties (`width`, `height`, `margin`, `padding`, `max-height`, `top`, `left`, etc.) force the browser to recalculate layout on every animation frame, causing visible jank.

```css
/* FAIL — max-height is a layout-tier property */
.stwid--panel {
  transition: max-height 250ms ease;
}

/* FAIL — margin is a layout-tier property */
.stwid--entry {
  transition: margin-bottom 200ms ease;
}
```

```css
/* PASS — opacity is compositor-tier; achieves a fade effect with no layout cost */
.stwid--panel {
  transition: opacity 200ms ease;
}

/* PASS — transform: scaleY() achieves a visual collapse/expand without touching layout */
.stwid--panel {
  transform-origin: top;
  transition: transform 200ms ease, opacity 200ms ease;
}
/* To "collapse": set transform: scaleY(0) opacity: 0; to "expand": scaleY(1) opacity: 1 */

/* PASS — transform: translateY() achieves a slide-in without animating margin */
.stwid--entry {
  transition: transform 200ms ease;
}
/* Start hidden: transform: translateY(8px); revealed: transform: translateY(0) */
```

> When the desired effect seems to require a layout property (e.g. animating an accordion open/close),
> restructure the markup. Common patterns: clip-path for reveals, scaleY for collapses,
> or a JS-driven height snapshot that snaps to a compositor-safe transition.

---

## ANIM-02: Always name a specific property in `transition`

Bare `transition: 200ms` and `transition: all` are violations. Both animate every changing
property on the element — including layout-tier properties — which defeats ANIM-01.

```css
/* FAIL — bare shorthand: no property named */
.stwid--button {
  transition: 200ms;
}

/* FAIL — 'all' animates every changing property, including layout-tier ones */
.stwid--button {
  transition: all 200ms ease;
}

/* FAIL — 'all' with a longer duration is still a violation */
.stwid--folder-header {
  transition: all 300ms ease-in-out;
}
```

```css
/* PASS — single property named explicitly */
.stwid--button {
  transition: opacity 200ms ease;
}

/* PASS — multiple properties named individually */
.stwid--button {
  transition: opacity 150ms ease, transform 150ms ease;
}

/* PASS — paint-tier property named explicitly (acceptable on small interactive elements) */
.stwid--chip {
  transition: background-color 120ms ease, color 120ms ease;
}
```

---

## ANIM-03: Apply `will-change` only during an active animation

`will-change` tells the browser to promote an element to its own GPU layer ahead of time.
Leaving it on permanently wastes GPU memory and can degrade overall performance.

```css
/* FAIL — permanent will-change, always consuming GPU resources */
.stwid--panel {
  will-change: transform;
}

/* FAIL — set on the base class, active for the element's entire lifetime */
.stwid--drawer {
  will-change: opacity, transform;
}
```

```css
/* PASS — applied only on the state that triggers the animation (hover or JS-added class).
   The browser promotes the layer just before the transition starts, then releases it. */
.stwid--button:hover {
  will-change: transform;
}

/* PASS — JS pattern: add before transition, remove on transitionend */
/*
  element.style.willChange = 'transform';
  element.classList.add('is-animating');
  element.addEventListener('transitionend', () => {
    element.style.willChange = 'auto';
  }, { once: true });
*/

/* PASS — set on the transitioning state class only */
.stwid--panel.is-open {
  will-change: transform;
}
/* Remove the class in JS once the transition completes */
```

> If `will-change` is not providing a measurable improvement after profiling, remove it entirely.
> It is an optimization of last resort, not a default to reach for.
