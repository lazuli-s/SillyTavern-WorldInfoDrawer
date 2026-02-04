# CSS Refactoring Plan (SillyTavern-WorldInfoDrawer)

## Task list (concise)
- [x] Phase 1: Reorganize `style.css` into clear sections; remove only proven duplicates.
- [x] Phase 2: Introduce small, extension-scoped CSS tokens; replace repeated magic numbers.
- [x] Phase 3: Normalize layout/overflow for drawer/list/editor/splitter (no behavior change).
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

**Status**: ✅ Implemented

**Scope**
- Drawer root layout (`#WorldInfo`, `.stwid--body`, `.stwid--list`, `.stwid--editor`, `.stwid--splitter`).
- Overflow and min-size rules.

**Decision**
- ✅ **Inner content scrolls**: the drawer frame stays fixed (`overflow: hidden`), and the list/editor internal regions own scrolling.

**What changed (high level)**
- Added `min-width: 0` / `min-height: 0` normalization to the drawer root, main split, list, editor, and key editor inner flex wrappers to prevent flexbox overflow/scroll bugs.
- Ensured the list book area remains the scroll container (`.stwid--books { overflow: auto; min-height: 0; }`).
- Switched splitter sizing to use Phase 2 tokens (`--stwid-splitter-width`, `--stwid-splitter-margin-x`) (no visual intent).

**Definition of Done**
- No accidental double scrollbars.
- Editor and list scroll areas behave predictably on small screens.

**Manual verification checklist**
- Resize the browser window narrow/wide.
- Drag splitter to min and max.
- Confirm list scroll and order table scroll still function.
- Open an entry with a long content field; confirm the content area scrolls without the entire drawer scrolling.

**Risk level**: Medium

---

## Phase 4 — Component polish (menus, buttons, column controls)

**Status**: ✅ Implemented

**Scope**
- `.stwid--blocker`, `.stwid--menu`, `.stwid--item`
- Move-to-folder modal styles
- Order helper column visibility dropdown and filter UI

**What changed (high level)**
- Added small, extension-scoped component tokens on `body.stwid-- #WorldInfo` for hit padding + focus ring.
- Consolidated focus-visible styling for the most common clickable “icon button” controls.
- Standardized menu item transitions + radii and added keyboard focus ring support for menu items.
- Tweaked Order Helper column menu + filter toggle hit targets (padding) without changing layout/positioning logic.

**Allowed changes**
- Consolidate duplicated hover/focus/active patterns.
- Standardize padding and hit targets using tokens.

**Definition of Done**
- All menus feel consistent (hover/focus/active).
- No change to positioning logic.

**Manual verification checklist**
- Open each menu type and confirm:
  - hover highlight
  - focus-visible outline (Tab navigation)
  - click outside closes
  - modal centered

**Risk level**: Medium

---

## Phase 5 — State classes + accessibility consistency

**Status**: ✅ Implemented

**Scope**
- `.stwid--active`, `.stwid--isSelected`, `.stwid--isTarget`, `.stwid--isFiltered`, `.stwid--focus`.
- Keyboard focus visibility (`:focus-visible`) across clickable controls.

**What changed (high level)**
- Added extension-scoped CSS state tokens for target/selected/hover/disabled styling under `body.stwid-- #WorldInfo`.
- Standardized “target” highlight to `SmartThemeQuoteColor` across folder headers + Order Helper row states.
- Added missing `:focus-visible` outlines for key Order Helper table controls (move buttons, drag handle, select toggle).
- Normalized disabled opacity for list entries + Order Helper rows via a shared token.

**Allowed changes**
- Add missing `:focus-visible` outlines where clearly absent.
- Ensure disabled-looking states are consistent.

**Definition of Done**
- Keyboard navigation shows focus for interactive elements without breaking the theme.

**Manual verification checklist**
- Use Tab/Shift+Tab through controls and menus.
- In Order Helper, Tab onto row controls (move buttons / select); confirm focus ring is visible.
- Drag over folder/book/Order Helper rows; confirm target highlight is consistent.

**Risk level**: Medium

---

## Phase 6 — Cleanup and specificity reduction (only if proven safe)

**Scope**
- Reduce repetitive `body.stwid-- #WorldInfo ...` where safe.
- Merge repeated selectors; remove redundancy.

### Phase 6.1: merge exact duplicate selectors
**Goal**: Reduce noise by combining blocks that are *byte-for-byte identical* (same selector list and same declarations).

**Rules (to preserve behavior)**
- Only merge when declarations are identical (including `!important`).
- Do **not** reorder declarations inside a block.
- Do **not** reorder blocks across sections if it could affect later overrides.
- Keep the merged block at the earliest occurrence; delete later duplicates.

**Steps**
1) Find duplicates (same selector + same declarations).
2) Verify there is no nearby override that depended on the duplicate being later.
3) Keep the first copy, delete the rest.
4) Re-run a quick visual sweep of the affected component(s).

### Phase 6.2: consolidate focus-visible rules
**Goal**: Replace scattered `:focus-visible` rules for similar controls with a small number of shared patterns.

**Rules**
- Keep selectors explicit enough to avoid accidentally styling non-interactive elements.
- Prefer grouping selectors in-place (local consolidation) rather than creating global “utility” classes (no JS changes).

**Steps**
1) Inventory all `:focus-visible` blocks inside the extension scope.
2) Group identical outlines into shared rules.
3) Ensure focus ring token usage stays consistent with Phase 4/5.

### Phase 6.3: consolidate icon-button primitives
**Goal**: Make “icon button” controls (folder/book/menu buttons, small action icons) share the same hit target, alignment, and hover/focus behavior.

**Rules**
- Do not change class names or DOM expectations.
- Prefer `:is(...)` selector grouping to avoid duplication.

**Steps**
1) Identify all icon-button-like selectors.
2) Consolidate identical `display`, `align-items`, padding, hover/focus rules.
3) Confirm no layout shift (especially in headers with `margin-left: auto`).

### Phase 6.4: local grouping to reduce repetition
**Goal**: Reduce repetitive long selectors while keeping cascade winners unchanged.

**Rules**
- Group *within the same section/component* (List / Editor / Order Helper), not across unrelated areas.
- Avoid “big” scope changes that could alter specificity.

**Steps**
1) Within a component section, introduce a local prefix comment and group adjacent rules that share the same long prefix.
2) Use `:is()`/`:where()` only if it does not reduce specificity in a way that changes winners.

### Phase 6.5: remove redundant var redeclarations (if safe)
**Goal**: Remove repeated `--stwid-*` custom property declarations that are identical and already defined higher in the intended scope.

**Rules**
- Only remove if the variable is already defined in a strictly broader scope that always applies.
- Ensure no theme or nested component intentionally overrides that variable.

**Steps**
1) Grep for repeated `--stwid-` definitions.
2) Confirm the cascade path (where it’s defined, where it’s used).
3) Remove only proven redundant redeclarations.

**Allowed changes**
- Carefully reduce specificity by introducing a safe “root scope” wrapper selector (still within one file) *only if it doesn’t change winners*.

**Definition of Done**
- Fewer lines, fewer repeated long selectors.
- Stylelint passes (if used) with no new warnings.

**Manual verification checklist**
- Full regression of Phases 1–5.

**Risk level**: Medium–High
