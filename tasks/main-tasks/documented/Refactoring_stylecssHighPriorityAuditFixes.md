# TASK: Fix High-Priority CSS Audit Findings in style.css
*Created: 2026-02-27*

**Type:** REFACTORING
**Status:** IMPLEMENTED
**Source:** CSSAudit_2026-02-27.md

---

## Summary

The CSS audit dated 2026-02-27 found 17 violations across `style.css`. This task fixes the
**5 high-priority issues only** (🔴 High). Medium and low issues are deferred to future tasks.

All 5 issues are in a single file: `style.css`.
No JavaScript files are touched. No feature behavior changes — with one minor visual exception
noted in Issue 3 below.

---

## Issues Being Fixed

### Issue 1 — DGR-01: `!important` declarations without explanation comments

**What the problem is:**
Any time CSS uses `!important` (a forceful override instruction), the style guide requires an
inline comment explaining *why* it is needed. Without the comment, a future maintainer has no
way to know if the `!important` is intentional or can be safely removed. The audit found 6 such
declarations that are missing the required comment.

**Violations and their fixes:**

#### Violation 1 — line 60

Current:
```css
body.stwid-- #WorldInfo.openDrawer {
  display: flex !important;
}
```
Fix — add an inline comment:
```css
body.stwid-- #WorldInfo.openDrawer {
  display: flex !important; /* override: ST's inline-drawer sets display:none by default; must force flex when openDrawer class is applied */
}
```

#### Violation 2 — line 87

Current:
```css
  backdrop-filter: blur(4px) !important;
```
Fix:
```css
  backdrop-filter: blur(4px) !important; /* override: loading overlay must blur regardless of parent backdrop-filter reset */
```

#### Violations 3, 4, 5 — lines 432–434 (three `!important`s in the dropdown active state)

Current:
```css
.stwid--multiselectDropdownMenu.stwid--state-active,
.stwid--bookVisibilityMenu.stwid--state-active {
  display: flex;
  width: max-content;
  opacity: 1 !important;
  background-color: var(--SmartThemeBlurTintColor) !important;
  backdrop-filter: blur(calc(var(--SmartThemeBlurStrength))) !important;
  ...
}
```
Fix — add a comment to each `!important` line:
```css
  opacity: 1 !important;               /* override: ST menu styles set opacity:0 on hidden menus; force visible when state-active */
  background-color: var(--SmartThemeBlurTintColor) !important; /* override: ST button resets may override menu background; force theme blur tint */
  backdrop-filter: blur(calc(var(--SmartThemeBlurStrength))) !important; /* override: parent backdrop-filter context may be cleared; force blur on menu */
```

#### Violation 6 — line 459

Current:
```css
.stwid--multiselectDropdownOption:hover {
  color: var(--customThemeColor) !important;
```
Fix:
```css
  color: var(--customThemeColor) !important; /* override: ST menu_button hover styles may override color; force theme color on hover */
```

#### Violation 7 — line 1064

Current:
```css
.stwid--editor [name='contentAndCharFilterBlock'] {
  flex: 1 1 auto !important;
```
Fix — add a comment block before the rule (matching existing style at line 1015):
```css
/* override: vanilla ST sets a conflicting flex value on [name='contentAndCharFilterBlock'];
   flex:1 is required so the content textarea fills the remaining editor height */
.stwid--editor [name='contentAndCharFilterBlock'] {
  flex: 1 1 auto !important;
```

**Visual/behavior impact:** None. Comment-only changes.

---

### Issue 2 — RESP-03 / RESP-01 / RESP-02: Fixed 300px width on the list panel

**What the problem is:**
The left-side list panel (`.stwid--list`) is set to exactly 300 pixels wide. On viewports that
are wider than average, 300px feels narrow. More critically, on viewports between 300–1000px
(small laptops, tablets), `width: 300px` with no `max-width: 100%` guard could cause the panel
to overflow its container. The `max-width: 100%` guard is also currently absent (RESP-02), which
the style guide requires for any fixed-width major panel.

**Current code** (line 139–147):
```css
.stwid--list {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 300px;
  min-width: 0;
  min-height: 0;
}
```

**Fix — replace `width: 300px` and add `min-width` + `max-width`:**
```css
.stwid--list {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 20vw;       /* fluid: ~300px at 1500px viewport, scales with screen */
  min-width: 220px;  /* floor: never narrower than 220px even on small screens */
  max-width: 100%;   /* RESP-02: never overflow its container */
  min-height: 0;
}
```

**Visual/behavior impact:** The list panel's default width changes from a fixed 300px to 20% of
the viewport width. At 1500px wide that equals 300px (no visible change). At 1920px it will be
384px (slightly wider). The splitter can still be dragged to adjust the width manually.
The mobile breakpoint already overrides this to `width: 100%`, so mobile is unaffected.

---

### Issue 3 — ANIM-01: Layout-reflow transitions on `.stwid--RowTitle` and `.stwid--rowContentWrap`

**What the problem is:**
Two transitions animate CSS properties that force the browser to recalculate the whole page
layout on every frame (called "layout reflow"). This is significantly more work for the browser
than animating safe properties like `opacity` or `transform`, and can cause jank on slower
devices. The style guide prohibits layout-tier transitions.

- **Line 1470** — `transition: margin-bottom 250ms ease` on `.stwid--RowTitle`
  This animates the gap below the section title when a collapsible controls row opens or closes.
  `margin-bottom` is a layout property → reflow on every frame.

- **Line 1496** — `transition: max-height 250ms ease` on `.stwid--rowContentWrap`
  This transition is currently **inoperative** — there is no `max-height` value set in the CSS
  for `.stwid--rowContentWrap` in either state. The browser has nothing to transition between.
  Removing it has no visible effect.

**Fix for line 1470 — remove the `margin-bottom` transition entirely:**

Current:
```css
.stwid--RowTitle {
  flex: 0 0 100%;
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 1em;
  color: var(--SmartThemeEmColor);
  opacity: 1;
  margin-bottom: 0.5em;
  transition: margin-bottom 250ms ease;
}
```
Fix — remove only the `transition` line:
```css
.stwid--RowTitle {
  flex: 0 0 100%;
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 1em;
  color: var(--SmartThemeEmColor);
  opacity: 1;
  margin-bottom: 0.5em;
}
```

**Fix for line 1496 — remove the inoperative `max-height` transition entirely:**

Current:
```css
.stwid--rowContentWrap {
  flex: 0 0 100%;
  display: flex;
  flex-wrap: wrap;
  gap: inherit;
  transition: max-height 250ms ease;
}
```
Fix — remove only the `transition` line:
```css
.stwid--rowContentWrap {
  flex: 0 0 100%;
  display: flex;
  flex-wrap: wrap;
  gap: inherit;
}
```

**Visual/behavior impact:**
- The chevron rotation animation on `.stwid--collapseChevron` (`transition: transform 250ms ease`)
  is NOT touched — it is a compositor-only property and stays.
- Removing `transition: margin-bottom` means the margin below the row title will jump instantly
  to 0 when collapsing, rather than shrinking smoothly. This is a minor visible change: the
  spacing collapses instantly instead of over 250ms. The chevron still animates.
- Removing `transition: max-height` has no visible effect (the transition was already inactive).

---

### Issue 4 — ACC-02: No `prefers-reduced-motion` override block

**What the problem is:**
Some users configure their operating system to request "reduced motion" — this is an
accessibility setting for people who experience discomfort from animations. CSS can respect that
preference with a special `@media (prefers-reduced-motion: reduce)` block. The style guide
requires this block to be present. The current `style.css` has no such block at all, meaning
users who prefer no motion receive all animations regardless of their system setting.

**Fix — add a new section at the very end of `style.css` (after the current last rule on
line 2071):**

```css

/* -------------------------------------------------------------------------- */

/* 8) Accessibility                                                            */

/* -------------------------------------------------------------------------- */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important; /* override: blanket motion kill for reduced-motion OS preference */
    animation-duration: 0.01ms !important;  /* override: blanket motion kill for reduced-motion OS preference */
  }
}
```

**Visual/behavior impact:** No change for most users. Users who have the "reduce motion" setting
enabled in their operating system will see all transitions and animations disabled (instant
instead of animated). Opacity fades, chevron rotations, hover color transitions, and all other
transitions in the file are suppressed for those users.

---

### Issue 5 — ST-02: Hardcoded hex color values

**What the problem is:**
The style guide requires all colors to use SillyTavern CSS variables (e.g.
`var(--SmartThemeQuoteColor)`) so the extension respects the user's chosen theme. Two lines
use hardcoded hex colors as fallback values, meaning if the ST variable is unavailable, a
hard-coded color is used instead of another theme-appropriate variable.

#### Violation 1 — line 1584

Current:
```css
.stwid--orderHelper :is(.stwid--thinContainer, .stwid--bulkEditContainer) .stwid--applyDirty {
  color: var(--warning-color, #e8a97f);
}
```
`--warning-color` is not a standard ST variable. The fallback `#e8a97f` (warm amber) is
hardcoded. The fix is to define a project-level CSS token in the existing token block
(inside `body.stwid-- #WorldInfo { }` around line 20), then use that token:

**Step A — add a token to the token block** (inside `body.stwid-- #WorldInfo`, after the last
existing token around line 46):
```css
  /* Semantic tokens */
  --stwid-warning-color: var(--warning-color, var(--SmartThemeQuoteColor));
```

**Step B — update line 1584 to use the token:**
```css
  color: var(--stwid-warning-color);
```

#### Violation 2 — line 1855

Current:
```css
.stwid--characterFilterRow--exclude {
  color: var(--SmartThemeErrorColor, #e57373);
}
```
`--SmartThemeErrorColor` is a valid ST variable. The fallback `#e57373` (red) is hardcoded.
Replace the hardcoded fallback with another ST variable:

Fix:
```css
.stwid--characterFilterRow--exclude {
  color: var(--SmartThemeErrorColor, var(--SmartThemeQuoteColor));
}
```

**Visual/behavior impact:** No change for users on any standard ST theme (the primary ST
variable resolves correctly). Only affects users on unusual themes where ST doesn't define
`--warning-color` or `--SmartThemeErrorColor` — those users will now see the theme's quote color
instead of a hardcoded amber/red.

---

## Implementation Plan

Work through issues in this order: Issue 1 first (comment-only, safest), then Issue 5
(comment and variable), then Issue 2 (width change), then Issue 3 (remove transitions), then
Issue 4 (add new block at end).

---

### Step 1 — Fix Issue 1: add override comments to `!important` declarations

- [x] Open `style.css`.
- [x] **Line 60**: add the override comment inline after `display: flex !important;`
      (see Issue 1 › Violation 1 for exact text).
- [x] **Line 87**: add the override comment inline after `backdrop-filter: blur(4px) !important;`
      (see Issue 1 › Violation 2 for exact text).
- [x] **Line 432**: add the override comment inline after `opacity: 1 !important;`
      (see Issue 1 › Violations 3–5 for exact text).
- [x] **Line 433**: add the override comment inline after the `background-color !important;` line.
- [x] **Line 434**: add the override comment inline after the `backdrop-filter !important;` line.
- [x] **Line 459**: add the override comment inline after `color: var(--customThemeColor) !important;`
      (see Issue 1 › Violation 6 for exact text).
- [x] **Line 1063**: add the block comment *above* the `.stwid--editor [name='contentAndCharFilterBlock']`
      rule (see Issue 1 › Violation 7 for exact text).

---

### Step 2 — Fix Issue 5: replace hardcoded hex colors

- [x] **Token block** (inside `body.stwid-- #WorldInfo { }`, around line 46): add the new
      `--stwid-warning-color` token on a new line after the last existing token
      (see Issue 5 › Violation 1 › Step A for exact text).
- [x] **Line ~1584**: replace `color: var(--warning-color, #e8a97f);` with
      `color: var(--stwid-warning-color);`
- [x] **Line ~1855**: replace `color: var(--SmartThemeErrorColor, #e57373);` with
      `color: var(--SmartThemeErrorColor, var(--SmartThemeQuoteColor));`

---

### Step 3 — Fix Issue 2: replace fixed panel width on `.stwid--list`

- [x] **Lines 139–147**: in the `.stwid--list` rule, replace `width: 300px;` with
      `width: 20vw;`, add `min-width: 220px;` on a new line below it, and add
      `max-width: 100%;` on a new line below that.
      (see Issue 2 for the complete corrected block).

---

### Step 4 — Fix Issue 3: remove layout-reflow transitions

- [x] **Line ~1470**: in `.stwid--RowTitle { }`, delete the line
      `transition: margin-bottom 250ms ease;` entirely.
- [x] **Line ~1496**: in `.stwid--rowContentWrap { }`, delete the line
      `transition: max-height 250ms ease;` entirely.
- [x] Confirm that **`.stwid--collapseChevron { transition: transform 250ms ease; }`** is
      untouched (this transition is safe and must stay).

---

### Step 5 — Fix Issue 4: add `prefers-reduced-motion` block

- [x] At the very end of `style.css` (after line 2071, the current last line), add the new
      Section 8 block (see Issue 4 for the exact block to insert).

---

### Step 6 — Verify

- [ ] Reload the World Info drawer in the browser. Confirm:
  - The list panel still appears and is roughly the same width as before.
  - Collapsible control rows (sorting, search, etc.) still open and close — the chevron
    still animates; the spacing change is instant (no smooth margin transition).
  - Hover colors on dropdown options still change to the theme color.
  - The "Apply" button in Order Helper still shows a warm color when inputs are dirty.
  - "Exclude" rows in the character filter still show in a red/quote color.
  - The loading overlay still blurs when a book loads.
- [ ] If your OS has "reduce motion" enabled (optional): confirm that transitions no longer
  play.

---

## After Implementation

*Implemented: February 27, 2026*

### What changed

`style.css`
- Added required inline explanation comments for all targeted `!important` overrides.
- Replaced hardcoded fallback colors with theme-backed variables and introduced `--stwid-warning-color`.
- Updated the list panel width block, removed two layout-heavy transitions, and added a reduced-motion media block at the end of the file.

`tasks/main-tasks/documented/Refactoring_stylecssHighPriorityAuditFixes.md`
- Marked Steps 1-5 checklist items complete as each code change was applied.
- Updated task status to `IMPLEMENTED`.
- Replaced this section with implementation notes, risks, and manual checks.

### Risks / What might break
- This touches list panel sizing, so the panel may feel wider or narrower than expected on some desktop widths.
- This removes one spacing animation, so the controls row collapse behavior may feel more abrupt than before.
- The reduced-motion block is global within this stylesheet, so users with reduced-motion enabled will lose all transitions in this extension UI.

### Manual checks
- Not run in this environment: reload the World Info drawer and confirm the list panel still appears at a usable width and remains resizable.
- Not run in this environment: open and close collapsible control rows and confirm chevron rotation still animates while spacing changes instantly.
- Not run in this environment: verify dropdown hover color, Order Helper dirty Apply color, character exclude color, and loading blur still match theme behavior.
- Optional check not run in this environment: with OS reduced-motion enabled, confirm transitions/animations are effectively disabled.

## Follow-up Tweaks (2026-02-27)

### What changed

- Added the existing thin-container hint icon (`fa-solid fa-fw fa-circle-question stwid--thinContainerLabelHint`) to the `Lorebooks` and `Settings` control groups in `src/drawer.js`, matching the existing `Folders` pattern.
- Updated `.stwid--small-check-row` to `font-size: 0.85em;` in `style.css`.
- Updated `.stwid--comment` to `font-size: 1.03em;` in `style.css`, and aligned the Order Helper comment-link override to the same size.
- Applied `.stwid--smallSelectTextPole` to the five requested Order Helper selects in `src/orderHelperRender.actionBar.js` and `src/orderHelperRender.tableBody.js` (action-bar sort select, bulk Strategy select, bulk Position select, row Strategy select, row Position select).
- Updated `style.css` so `.stwid--smallSelectTextPole` is class-scoped (not limited to the sorting row), allowing the same compact select sizing wherever the class is applied.

### Why it changed

- Requested UI consistency: all three top control groups now include the same help hint icon treatment.
- Requested typography tuning for compact check rows and comment text readability.
- Requested consistent compact sizing for those five specific Order Helper dropdown controls.

### Verification status

- Not run in this environment: browser reload and visual confirmation of the new Lorebooks/Settings hint icons and the two font-size adjustments.
- Not run in this environment: browser reload and visual confirmation that the five targeted Order Helper selects now share the `.stwid--smallSelectTextPole` compact sizing.

## Follow-up Tweaks (2026-02-27, sorting/visibility spacing)

### What changed

- Removed `font-size: smaller;` from the shared Order Helper action-bar wrapper rule:
  `.stwid--order-action-bar .stwid--inputWrap, .stwid--order-action-bar .stwid--columnVisibility`.
- Updated `.stwid--smallSelectTextPole` so `width: 9em` is no longer global.
- Added a sorting-row-only width rule:
  `.stwid--sortingRow .stwid--smallSelectTextPole { width: 9em; }`
- Updated sorting/visibility thin-container spacing in `style.css`:
  - kept `gap: 1.1em`
  - removed `min-width: 45%`
  - changed to `flex-wrap: nowrap`
  - added `padding-left: 1.5em` and `padding-right: 1.5em`
- Updated list filter row spacing:
  `.stwid--list .stwid--searchRow, .stwid--list .stwid--visibilityRow`
  now uses `gap: 1.5em` and `justify-content: center`.
- Added `margin-top: 1em` to `.stwid--visibilityRow`.

### Why it changed

- Requested UI tuning for tighter control over where compact select widths apply.
- Requested more horizontal breathing room and centered layout in sorting/search/visibility rows.
- Requested removal of smaller text sizing in the specific Order Helper action-bar grouping rule.

### Verification status

- Not run in this environment: browser reload and visual confirmation of updated spacing, select widths, and visibility-row top margin.

## Follow-up Tweaks (2026-02-27, order helper visibility containers)

### What changed

- `src/orderHelperRender.actionBar.js`
  - Wrapped the Keys eye-toggle control in a `.stwid--thinContainer` group with a `Keys` label and hint icon.
  - Wrapped the column-visibility dropdown in a `.stwid--thinContainer` group with a `Columns` label and hint icon.
  - Wrapped the table-sort select in a `.stwid--thinContainer` group with a `Table Sorting` label and hint icon.
  - Renamed the visibility-row sort label wrapper class from `.stwid--inputWrap` to `.stwid--table-sort`.
  - Removed the inline `Column Visibility` text block so the new thin-container label is the single label for that control.
- `style.css`
  - Kept `.stwid--sortingRow .stwid--smallSelectTextPole { width: 9em; }` scoped to sorting row controls.
  - Updated Order Helper visibility-row styling to target `.stwid--table-sort` instead of `.stwid--inputWrap`.
  - Removed now-unused `.stwid--columnVisibilityLabel` / `.stwid--columnVisibilityText` visibility-row styling.
  - Removed `gap: 0.1em;` from `.stwid--orderStartSpacingPair`.

### Why it changed

- Requested UI grouping: Keys, Columns, and Table Sorting controls should use the same thin-container + label + hint pattern used elsewhere in the extension.
- Requested selector/class targeting updates for the visibility-row sorting control.
- Requested cleanup of spacing (`.stwid--orderStartSpacingPair`) and obsolete visibility-row label styles.

### Verification status

- Not run in this environment: browser reload and visual confirmation that the Order Helper visibility row now shows three labeled thin containers (`Keys`, `Columns`, `Table Sorting`) with working hint icons.
- Not run in this environment: browser reload and confirmation that key toggle, column visibility menu, and table sorting behavior are unchanged functionally.
