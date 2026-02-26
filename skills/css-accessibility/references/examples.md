# CSS Accessibility — Rule Examples

Before/after CSS and HTML snippets for every ACC rule ID.

---

## ACC-01: Never remove a focus indicator without a visible replacement

The browser's default `:focus` ring is the only visual cue keyboard users have for where they are on the page. Removing it without a replacement makes navigation invisible.

```css
/* FAIL — removes the focus ring with nothing to replace it */
.stwid--btn:focus {
  outline: none;
}

/* FAIL — outline: 0 is the same as outline: none */
.stwid--entry-title:focus {
  outline: 0;
}
```

```css
/* PASS — uses :focus-visible only (keyboard navigation gets a ring; mouse clicks do not) */
.stwid--btn:focus-visible {
  outline: 2px solid var(--SmartThemeBodyColor);
  outline-offset: 2px;
}

/* PASS — replaces outline with box-shadow on :focus-visible */
.stwid--btn:focus {
  outline: none; /* remove browser default */
}
.stwid--btn:focus-visible {
  box-shadow: 0 0 0 2px var(--SmartThemeQuoteColor);
}
```

> Use `:focus-visible` (not `:focus`) for the replacement. `:focus-visible` activates for keyboard
> navigation only — not mouse clicks — matching how focus rings are expected to behave.

---

## ACC-02: Always pair transitions and animations with `prefers-reduced-motion`

Some users configure their OS to reduce or eliminate motion because it causes discomfort or vestibular disorders. The `prefers-reduced-motion: reduce` media query lets the extension respect that setting.

**Opacity fades are exempt** — they are not "motion" and do not need a fallback.

```css
/* FAIL — transition moves content (transform) with no motion-sensitivity fallback */
.stwid--entry-item {
  transition: opacity 200ms ease, transform 200ms ease;
}

/* FAIL — @keyframes animation with no fallback */
@keyframes stwid-slide-in {
  from { transform: translateX(-8px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
.stwid--entry-item {
  animation: stwid-slide-in 200ms ease forwards;
}
```

```css
/* PASS — motion transition with reduced-motion block placed directly after */
.stwid--entry-item {
  transition: opacity 200ms ease, transform 200ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .stwid--entry-item {
    transition: opacity 200ms ease; /* opacity fade is exempt; transform removed */
  }
}

/* PASS — @keyframes with reduced-motion fallback that disables motion */
@keyframes stwid-slide-in {
  from { transform: translateX(-8px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
.stwid--entry-item {
  animation: stwid-slide-in 200ms ease forwards;
}

@media (prefers-reduced-motion: reduce) {
  .stwid--entry-item {
    animation: none;
    opacity: 1; /* ensure the element is visible when animation is skipped */
  }
}
```

> Place the `@media (prefers-reduced-motion: reduce)` block directly after the rule it overrides
> (BRK-04 from css-responsive applies here too — keep related rules co-located).

---

## ACC-03: Do not use CSS to hide interactive elements in a way that removes keyboard access

`visibility: hidden` removes an element from the tab order entirely — a keyboard user cannot reach it even if it is supposed to be usable. `display: none` does the same. Reserve these for elements that are genuinely inactive.

```css
/* FAIL — button is "active" but hidden with visibility:hidden;
   a keyboard user cannot reach it */
.stwid--action-row .stwid--delete-btn {
  visibility: hidden;
}

/* FAIL — interactive control hidden with display:none when it should be operable */
.stwid--confirm-btn {
  display: none; /* but the button is still logically active */
}
```

```css
/* PASS — display:none is correct when the element is genuinely inactive */
.stwid--confirm-btn[hidden] {
  display: none; /* hidden attribute signals the control is not currently active */
}

/* PASS — use opacity for visual hiding when the element must remain keyboard-reachable */
.stwid--action-btn[data-pending='true'] {
  opacity: 0.3;
  pointer-events: none; /* visual only; element stays in tab order */
}
```

> If you need to hide something visually while keeping it accessible to screen readers,
> use the `.sr-only` / `.visually-hidden` pattern (position absolute, 1×1px, clipped).
> That pattern is for screen-reader-only text — not for interactive controls.

---

## ACC-04: Icon-only buttons must have an accessible name

Screen readers announce buttons by their text content. An icon-only button with no `aria-label` is announced as an unlabeled button — a keyboard user cannot know what it does.

```html
<!-- FAIL — icon-only, no accessible name -->
<button class="stwid--btn">
  <i class="fa-solid fa-trash"></i>
</button>

<!-- FAIL — tooltip title is not an accessible name for a button -->
<button class="stwid--btn" title="Delete entry">
  <i class="fa-solid fa-trash"></i>
</button>
```

```html
<!-- PASS — aria-label provides the accessible name -->
<button class="stwid--btn" aria-label="Delete entry">
  <i class="fa-solid fa-trash"></i>
</button>

<!-- PASS — button with visible text needs no aria-label -->
<button class="stwid--btn">
  <i class="fa-solid fa-plus"></i>
  Add Entry
</button>
```

> `title` is not a reliable accessible name — screen readers do not consistently expose it,
> and it is invisible to keyboard users who do not hover. Always use `aria-label`.

---

## ACC-05: All interactive elements must be reachable by Tab — no `tabindex > 0`

`tabindex` values greater than `0` break the natural tab order by forcing focus to jump to that element before all `tabindex="0"` and natural elements. This makes keyboard navigation unpredictable.

```html
<!-- FAIL — tabindex > 0 disrupts the natural focus order -->
<button class="stwid--btn" tabindex="3">Save</button>

<!-- FAIL — tabindex > 0 on a control that should simply be in the natural order -->
<div class="stwid--entry-row" role="button" tabindex="5">Entry</div>
```

```html
<!-- PASS — no tabindex: element is naturally reachable in DOM order -->
<button class="stwid--btn">Save</button>

<!-- PASS — tabindex="0" adds a non-native element to the tab order without disrupting it -->
<div class="stwid--entry-row" role="button" tabindex="0">Entry</div>
```

> `tabindex="-1"` is allowed — it makes an element programmatically focusable (via JS `.focus()`)
> without placing it in the tab order. Use it only for elements that should receive focus under
> program control (e.g. a dialog container) but should not be reached by Tab navigation.
