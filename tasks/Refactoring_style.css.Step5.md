# Refactoring style.css — Step 5: Markup/Class Harmonization Evaluation

> **Goal:** Evaluate where vanilla SillyTavern CSS classes (`.list-group`, `.list-group-item`, `.interactable`, `.menu_button.toggleable`/`.toggled`, `disabledWIEntry`) can be layered onto extension HTML elements, allowing the extension to inherit ST's built-in styling rather than re-declaring it.

> **This is primarily an evaluation step.** Each candidate is inspected against both the actual markup the extension emits and the actual CSS vanilla provides. Only low-risk, genuinely beneficial changes are included in scope. Everything else is formally deferred with a clear rationale.

---

## Pre-evaluation: Already-harmonized markup (no changes needed)

Before evaluating candidates, an audit of the extension JS files confirms that several harmonizations are **already in place**:

| Element | File | Classes already applied |
|---------|------|------------------------|
| Book visibility trigger `<button>` | `listPanel.filterBar.js` | `menu_button` |
| Create Book `<button>` in Move Book modal | `listPanel.bookMenu.js` | `menu_button interactable` |
| No-folder `<button>` in Move Book modal | `listPanel.bookMenu.js` | `menu_button interactable` |
| All Order Helper "Apply" `<button>` elements | `orderHelperRender.actionBar.js` | `menu_button interactable` |
| Order Helper "Select All" `<button>` | `orderHelperRender.actionBar.js` | `menu_button interactable` |

No action needed for these. They already use vanilla class contracts.

---

## Candidate 5a — `.interactable` on icon action `<div>` buttons

**What vanilla provides:**

```css
.interactable { border-radius: 5px; }
.interactable:focus-visible { outline: 1px solid var(--interactable-outline-color); }
```

**Extension's current icon action elements** (`stwid--action`, `stwid--folderAction`, `stwid--folderMenu`, `stwid--folderToggle`, `stwid--orderFilterButton`) are `<div>` elements created with `document.createElement('div')` in `lorebookFolders.js` and `orderHelperRender.tableHeader.js`.

**Why adding `.interactable` provides no net benefit:**

1. `border-radius: 5px` — The extension already sets `border-radius: var(--stwid-radius-m)` on all these elements via the shared rule at style.css ~788. The extension value wins (more specific selector). Vanilla's value is pointless overhead.
2. `outline: 1px solid var(--interactable-outline-color)` — The extension already has its own consolidated focus-ring rule:
   ```css
   body.stwid-- #WorldInfo :is(.stwid--action, ...):focus-visible {
     outline: var(--stwid-focus-ring);  /* = 2px solid var(--SmartThemeQuoteColor) */
     outline-offset: var(--stwid-focus-ring-offset);
   }
   ```
   The extension rule wins (more specific). `.interactable`'s ring is completely overridden and never seen.

**Verdict: DEFER.** No CSS reduction. No visual improvement. Adding `.interactable` to `<div>` action buttons would be a no-op that adds confusion about intent.

**Note for the future:** Converting `<div>` action icons to semantic `<button>` elements would be the correct accessibility improvement. That is a separate, larger JS refactor and is out of scope for this CSS refactoring pass.

---

## Candidate 5b — `.list-group` / `.list-group-item` on dropdown menus

**What vanilla provides:**

```css
.list-group { overflow: hidden; display: block; }
.list-group-item { opacity: 0.5; }
.list-group-item:hover { opacity: 1; }
```

**Extension's dropdown menus:**

| Extension menu | CSS class | Layout | Item starting opacity |
|---------------|-----------|--------|-----------------------|
| Context (book/folder) menu | `.stwid--listDropdownMenu` | `display: flex; flex-direction: column` | `opacity: 1` (explicit) |
| Multiselect visibility menu | `.stwid--multiselectDropdownMenu` | `display: flex; flex-direction: column` | `opacity: 1` (no dim) |

**Conflicts that would occur:**

1. `display: block` on `.list-group` vs extension's `display: flex; flex-direction: column` — Would break the columnar menu layout. The extension would need a `display: flex !important` override to fight this.
2. `opacity: 0.5` on `.list-group-item` — Extension items intentionally start at full opacity (`opacity: 1`). Adding `.list-group-item` would dim every item, requiring an `opacity: 1 !important` counter-rule on every item. Net result: more CSS, not less.

**Verdict: DEFER.** The extension menu visual contract (full-opacity items, flex column layout, themed background/border) is fundamentally different from vanilla's plain list-group pattern. Adopting vanilla classes here would require more override CSS than it saves.

---

## Candidate 5c — `.menu_button.toggleable` / `.toggled` on toggle controls

**What vanilla provides:**

```css
.menu_button.toggleable { padding-left: 20px; }
.menu_button.toggleable.toggled { border-color: var(--active); }
.menu_button.toggleable:not(.toggled) { filter: brightness(80%); }
.menu_button.toggleable::before {
  font-family: "Font Awesome 6 Free";
  margin-left: 10px;
  /* pseudo-element adds a checkmark/X icon before the button text */
}
.menu_button.toggleable.toggled::before  { content: "\f00c"; color: var(--active); }
.menu_button.toggleable:not(.toggled)::before { content: "\f00d"; color: var(--fullred); }
```

**Extension's toggle controls:**

| Control | Current appearance | Toggle state |
|---------|-------------------|-------------|
| `.stwid--bookSortToggle` (sort button) | Icon button, accent color on active | Uses `.stwid--active` class |
| `.stwid--visibilityChip` (filter chips in list) | Chip with border + tint on active | Display-only, not togglable |
| `.stwid--multiselectDropdownOption` (filter items) | Row item with accent text on active | Uses `.stwid--active` class |
| Folder `.stwid--folderActiveToggle` (`<input>`) | Tri-state checkbox input | Native checked state |

**Why this is incompatible:**

Vanilla's `.toggleable` pattern adds a `::before` pseudo-element with a checkmark or X icon. This is visually a "labeled toggle button" with prepended icon. The extension's toggle controls are:
- Icon-only buttons (no room or intent for a prepended `::before` icon)
- Chips with custom border/tint states
- A tri-state checkbox input (native element; pseudo-element behavior differs)

Adding `.toggleable` to any of these would inject an unwanted checkmark/X icon and `padding-left: 20px` that would break the extension's compact icon-button and chip layouts.

**Verdict: DEFER.** The vanilla toggle visual contract is incompatible with the extension's toggle UX. The extension uses `.stwid--active` as its own toggle state class, which is a clean, private contract.

---

## Candidate 5d — `disabledWIEntry` on disabled entry rows

**What vanilla provides (world-info.css):**

```css
.disabledWIEntry { opacity: 0.4; filter: grayscale(1); }
.disabledWIEntry:not(input):hover { opacity: 1; filter: grayscale(0.5); }
```

**Extension's current approach (style.css):**

```css
body.stwid-- #WorldInfo .stwid--books .stwid--entry:has(.stwid--enabled.fa-toggle-off) {
  opacity: var(--stwid-state-disabled-opacity);  /* = 0.5 */
}
```

**Why the approaches differ:**

1. **Class vs `:has()`** — Vanilla requires a JS class (`disabledWIEntry`) to be added to the element when it becomes disabled. The extension uses a pure CSS `:has()` query to detect the disabled state from the toggle icon's class, requiring no JS class management.
2. **Scope** — In vanilla, `disabledWIEntry` is applied to individual editor form fields (`.world_entry_edit` descendants). In the extension, the disabled opacity targets the entire entry row (`.stwid--entry`) which is extension-rendered markup, not vanilla markup.
3. **Opacity value** — Vanilla uses `0.4`; extension uses `--stwid-state-disabled-opacity` (currently `0.5`). These are different.
4. **Hover behavior** — Vanilla's `disabledWIEntry:not(input):hover` restores full opacity/color on hover. The extension does not currently restore opacity on hover for disabled entries. Adopting vanilla's class would silently add this hover behavior, which may or may not be desired.
5. **`filter: grayscale(1)`** — Vanilla applies grayscale to disabled entries. The extension does not. This is a visual change that was not reviewed or requested.

**Verdict: DEFER.** The two disabled-state implementations serve different scopes and have different visual contracts. Adopting `disabledWIEntry` would require JS changes (adding/removing the class on entry state change), would introduce unrequested visual changes (grayscale), and would not reduce the extension's CSS (the `:has()` rule would still be needed for any extension-only behavior).

---

## Step 5 Decision Summary

| Candidate | Verdict | Key reason |
|-----------|---------|-----------|
| `.interactable` on `<div>` action icons | **DEFER** | Extension CSS wins on all properties; `.interactable` would be a no-op |
| `.list-group`/`.list-group-item` on dropdown menus | **DEFER** | Conflicts with flex layout and item opacity; would require more overrides than it saves |
| `.menu_button.toggleable`/`.toggled` | **DEFER** | `::before` icon and `padding-left` would break compact icon-button and chip layouts |
| `disabledWIEntry` on entry rows | **DEFER** | Different JS contract, different scope, adds unrequested grayscale effect |

**No code changes are made in Step 5.** The step is complete as an evaluation pass.

**Pre-existing harmonization confirmed:** Create/no-folder buttons, Order Helper apply buttons, and the book visibility trigger already use `menu_button`/`interactable` correctly. No gaps found that require closing.

---

## Recommendations for future work (out of scope for this refactoring)

These were identified during the evaluation and are worth tracking separately:

1. **Convert `<div>` action icon buttons to `<button>` elements** — Would improve keyboard accessibility (native tab order, Enter/Space), eliminate the need for custom `tabIndex` management, and make `.interactable` usable in the future. Scope: JS markup changes in `lorebookFolders.js`, `listPanel.bookMenu.js`, `orderHelperRender.tableHeader.js`.

2. **Review disabled-entry hover behavior** — Decide whether disabled entry rows should restore opacity on hover (matching vanilla's `disabledWIEntry:not(input):hover` pattern). If yes, add a `:hover` override to the existing `:has()` rule. Small, isolated CSS change.

---

## Step 5 Final Checks

- [x] All four harmonization candidates evaluated
- [x] Existing harmonization confirmed as already present (no gaps)
- [x] No code changes made — all candidates deferred with rationale
- [ ] Main task file (`Refactoring_style.css.md`) updated with Step 5 status
