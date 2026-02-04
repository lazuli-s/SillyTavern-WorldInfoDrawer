# CSS Refactoring Plan (SillyTavern-WorldInfoDrawer)

## Task list (concise)
- [ ] Phase 1: Reorganize `style.css` into clear sections; remove only proven duplicates.
- [ ] Phase 2: Introduce small, extension-scoped CSS tokens; replace repeated magic numbers.
- [ ] Phase 3: Normalize layout/overflow for drawer/list/editor/splitter (no behavior change).
- [ ] Phase 4: Standardize component styles (menus, buttons, column controls).
- [ ] Phase 5: Make state + focus styles consistent; accessibility polish.
- [ ] Phase 6: Cleanup pass (dedupe + reduce specificity only when proven safe).

Goal: make `style.css` easier to read and safer to change, reduce duplication/inconsistency, and **preserve current UI behavior**. This plan is intentionally **multi-phase** so each phase can ship safely.

Constraints honored:
- No JS changes.
- No new dependencies/frameworks.
- No class name changes that JS relies on.
- No behavior/layout changes unless explicitly called out.

---

## Phase 1 — Organization + safe micro-dedup (lowest risk)

**Status**: ✅ Implemented

**Scope**
- `style.css` only.
- Reordered into clear sections:
  1) Drawer
  2) List Panel
  3) Splitter
  4) Editor Panel
  5) Context Menu + Modals
  6) Order Helper (actions, filter, table)
  7) Misc

**What changed (high level)**
- Reordered rules into the sections above.
- Added section headers + short explanatory comments.
- Safe micro-dedup: combined a few selectors where declarations were identical.
- Ran `stylelint --fix` to satisfy repo lint rules (no behavioral intent).

**Definition of Done**
- File reads top-to-bottom as a UI tour.
- No declaration changes intended (except removal of exact duplicates / safe combining).
- No missing rules; no new selectors that could override existing ones.

**Manual verification checklist**
- Open World Info drawer.
- Confirm drawer still opens full screen and core `#wi-holder` is hidden.
- List panel:
  - Folders collapse/expand.
  - Books collapse/expand.
  - Search hides/shows matches.
  - Multi-select entries still highlights and allows drag.
- Splitter: drag to resize list/editor.
- Editor: open an entry; focus/unfocus toggles still work.
- Context menu: open book menu and folder menu; confirm it positions correctly.
- Order helper:
  - Toggle open/close.
  - Column visibility menu opens.
  - Filter panel toggles.
  - Table rows highlight on hover.

**Risk level**: Low

---

## Phase 2 — Local design tokens (consistency without layout changes)

**Status**: ✅ Implemented

**Scope**
- Add a small set of CSS custom properties under `body.stwid-- #WorldInfo` to keep them extension-scoped.
- Replace repeated “magic numbers” with tokens where safe.

**What changed (high level)**
- Added a small set of extension-scoped tokens on `body.stwid-- #WorldInfo` (gaps, radii, control height, splitter sizing).
- (This phase intentionally keeps behavior/visuals unchanged and avoids touching JS.)

**Definition of Done**
- Repeated values (e.g., `0.25em`, `0.5em`, `6px`, `2.35em`, common radii) are centralized.
- Visual output unchanged.

**Manual verification checklist**
- Same as Phase 1.
- Spot check: controls row heights, menu padding, folder/book headers.

**Risk level**: Low–Medium (variables can have subtle cascade impact if scoped incorrectly)

---

## Phase 3 — Layout stability pass (flex/overflow normalization)

**Scope**
- Drawer root layout (`#WorldInfo`, `.stwid--body`, `.stwid--list`, `.stwid--editor`, `.stwid--splitter`).
- Overflow and min-size rules.

**Allowed changes**
- Normalize flex patterns and `min-height: 0` / `min-width: 0` where needed to prevent scroll bugs.
- Keep existing min widths and overall proportions.

**Definition of Done**
- No accidental double scrollbars.
- Editor and list scroll areas behave predictably on small screens.

**Manual verification checklist**
- Resize the browser window narrow/wide.
- Drag splitter to min and max.
- Confirm list scroll and order table scroll still function.

**Risk level**: Medium

---

## Phase 4 — Component polish (menus, buttons, column controls)

**Scope**
- `.stwid--blocker`, `.stwid--menu`, `.stwid--item`
- Move-to-folder modal styles
- Order helper column visibility dropdown and filter UI

**Allowed changes**
- Consolidate duplicated hover/focus/active patterns.
- Standardize padding and hit targets using tokens.

**Definition of Done**
- All menus feel consistent (hover/focus/active).
- No change to positioning logic.

**Manual verification checklist**
- Open each menu type and confirm:
  - hover highlight
  - focus-visible outline
  - click outside closes
  - modal centered

**Risk level**: Medium

---

## Phase 5 — State classes + accessibility consistency

**Scope**
- `.stwid--active`, `.stwid--isSelected`, `.stwid--isTarget`, `.stwid--isFiltered`, `.stwid--focus`.
- Keyboard focus visibility (`:focus-visible`) across clickable controls.

**Allowed changes**
- Add missing `:focus-visible` outlines where clearly absent.
- Ensure disabled-looking states are consistent.

**Definition of Done**
- Keyboard navigation shows focus for interactive elements without breaking the theme.

**Manual verification checklist**
- Use Tab/Shift+Tab through controls and menus.
- Confirm focus ring is visible and not clipped.

**Risk level**: Medium

---

## Phase 6 — Cleanup and specificity reduction (only if proven safe)

**Scope**
- Reduce repetitive `body.stwid-- #WorldInfo ...` where safe.
- Merge repeated selectors; remove redundancy.

**Allowed changes**
- Carefully reduce specificity by introducing a safe “root scope” wrapper selector (still within one file) *only if it doesn’t change winners*.

**Definition of Done**
- Fewer lines, fewer repeated long selectors.
- Stylelint passes (if used) with no new warnings.

**Manual verification checklist**
- Full regression of Phases 1–5.

**Risk level**: Medium–High
