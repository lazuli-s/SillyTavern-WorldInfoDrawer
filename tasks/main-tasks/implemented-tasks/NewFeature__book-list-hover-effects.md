# NEW FEATURE: Book List Hover Effects
*Created: March 9, 2026*

**Type:** NewFeature
**Status:** IMPLEMENTED

---

## Summary

Adds polished hover effects to the book list in the Book Browser panel: a subtle background highlight when hovering over a book row, and a gentle "lift" effect (slight upward shift + deeper shadow) when hovering over a folder header. Both effects use the existing SillyTavern theme color tokens so they automatically adapt to any theme. A `prefers-reduced-motion` fallback disables all motion for users who have requested it in their system settings.

## Current Behavior

- Hovering over a **book row header** produces no visual feedback — the row looks identical whether the cursor is over it or not.
- Hovering over a **folder header** produces no visual feedback — the row already has a CSS transition defined but no `:hover` state is set, so the transition never fires.

## Expected Behavior

- Hovering over a **book row header** softly tints the background using the existing `--stwid-state-hover-bg` token (resolves to `--white20a`). A smooth transition animates the change in and out.
- Hovering over a **folder header** causes it to lift slightly: the row shifts 2px upward (`transform: translateY(-2px)`) and the drop shadow deepens. Both animate with a smooth transition.
- Users who have enabled **"Reduce motion"** in their operating system or browser get no animation — the hover color still appears instantly, but no movement or transition plays.

## Agreed Scope

Changes are CSS-only, touching only `style.css`.

Affected selectors:
- `.stwid--books .stwid--book .stwid--head` — book row header (add transition + `:hover` rule)
- `.stwid--folder .stwid--folderHeader` — folder header (extend existing transition to include `transform`, add `:hover` rule)
- `@media (prefers-reduced-motion: reduce)` block — disable transitions and transforms for both

## Out of Scope

- Entry rows (`.stwid--entry`) — not requested.
- Any hover effects on buttons or action icons within book/folder rows — those already have their own hover states.
- Dark-mode / light-mode CSS mirror block (lines ~3075+) — must be updated in sync with the primary block.

## Implementation Plan

### Step 1 — Book head: add transition

In the existing rule `.stwid--books .stwid--book .stwid--head` (around line 1378 in `style.css`), add a `transition` property:

```css
transition: background-color 150ms ease;
```

### Step 2 — Book head: add `:hover` rule

Directly after that rule block, insert a new rule:

```css
.stwid--books .stwid--book .stwid--head:hover {
  background-color: var(--stwid-state-hover-bg);
}
```

### Step 3 — Folder header: extend existing transition to include `transform`

The existing rule `.stwid--folder .stwid--folderHeader` (around line 1251) already has:
```css
transition: background-color 150ms ease, box-shadow 150ms ease;
```
Change it to:
```css
transition: background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
```

### Step 4 — Folder header: add `:hover` rule

Directly after the `.stwid--folder .stwid--folderHeader` rule block, insert a new rule:

```css
.stwid--folder .stwid--folderHeader:hover {
  transform: translateY(-2px);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--SmartThemeBorderColor) 65%, transparent),
              0 4px 10px rgb(0 0 0 / 28%);
}
```

The `transform: translateY(-2px)` is a compositor-only operation (no repaint) — it is the safe choice for smooth animation (ANIM-01 compliant). The `box-shadow` change is paint-tier (ANIM-02 acceptable — same as the existing transition already includes).

### Step 5 — Reduced-motion fallback

Locate the existing `@media (prefers-reduced-motion: reduce)` block in `style.css` and add inside it:

```css
.stwid--books .stwid--book .stwid--head,
.stwid--folder .stwid--folderHeader {
  transition: none;
}

.stwid--folder .stwid--folderHeader:hover {
  transform: none;
}
```

This ensures users who prefer reduced motion see no animation (ACC-02 compliant). The hover background tint on book heads still appears instantly (no motion involved).

### Step 6 — Mirror changes in the dark-mode / light-mode block

`style.css` contains a second copy of the folder and book rules starting around line 3075 (inside a media query or theme block). Apply the same changes from Steps 1–5 to those mirrored rules so both theme variants behave identically.

- [x] Step 1: Add `transition: background-color 150ms ease` to `.stwid--books .stwid--book .stwid--head`
- [x] Step 2: Insert `.stwid--books .stwid--book .stwid--head:hover` rule with `background-color: var(--stwid-state-hover-bg)`
- [x] Step 3: Extend `.stwid--folder .stwid--folderHeader` transition to include `transform 150ms ease`
- [x] Step 4: Insert `.stwid--folder .stwid--folderHeader:hover` rule with `translateY(-2px)` + deeper `box-shadow`
- [x] Step 5: Add `prefers-reduced-motion` fallback rules for both elements
- [x] Step 6: Repeat Steps 1–5 for the mirrored rule block (~line 3075+) in `style.css`

---

## After Implementation
*Implemented: March 9, 2026*

### What changed

**style.css**

- Book row headers (`.stwid--books .stwid--book .stwid--head`) now smoothly tint their background when hovered, using the existing `--stwid-state-hover-bg` token. The color change animates in and out over 150ms.
- Folder headers (`.stwid--folder .stwid--folderHeader`) now gently lift 2px upward and deepen their drop shadow on hover. The existing transition on that rule was extended to include `transform`, so the lift animates smoothly.
- Both changes were applied to the primary CSS block and to its mirrored copy (the second set of rules used for the alternate theme variant).
- A `prefers-reduced-motion` block was added to each section disabling all transitions on both elements and preventing the folder header from shifting position — so users who have "Reduce motion" enabled in their OS see no animation and no movement.

### Risks / What might break

- The folder header lift (`translateY(-2px)`) slightly shifts the header upward on hover. If a folder header sits at the very top of the scroll container with no padding above it, the 2px shift might clip at the edge.
- The `--stwid-state-hover-bg` token resolves to `--white20a`. On very light or very white themes, this tint may be almost invisible on book headers.
- The existing malformed `prefers-reduced-motion` block at line ~2927 (which has stray `}';;` characters) was left untouched. The new fallback rules were added as a separate clean block directly after it, which means there are now two `prefers-reduced-motion` blocks in the primary section. This is harmless but the original malformed block is a pre-existing issue.

### Manual checks

1. Open the extension, hover over a book row header — the row should softly tint (slightly lighter/darker background). Moving the cursor away should fade the tint back. The change should animate smoothly.
2. Hover over a folder header — the entire folder header row should visibly lift upward by a couple of pixels and the shadow beneath it should deepen slightly. Moving the cursor away should smoothly return it to its original position.
3. If your OS or browser has "Reduce motion" / "Prefers reduced motion" enabled: hover over both elements — the tint on book headers should appear instantly (no fade), and the folder header should show no upward movement at all.
4. Verify that buttons and icons inside book and folder headers still respond to hover normally (their own existing hover states should be unaffected).
