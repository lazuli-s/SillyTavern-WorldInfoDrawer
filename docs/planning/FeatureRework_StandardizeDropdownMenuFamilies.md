# FEATURE REWORK: Standardize Dropdown Menu Families

## DESCRIPTION

### User Report
  > "Standardize dropdowns into two clear families. First, a multiselect dropdown used by Order Helper column visibility and filter menus; it must support top presets that are independent (not multiselect), rename the full `stwid--columnMenu` family to `stwid--multiselectDropdown`, and use Font Awesome square-style checkbox icons for clarity. Second, an independent action-list dropdown (not select/multiselect), and rename the full `stwid--menu` family to `stwid--listDropdown`, including future single-action list menus. Also document both dropdown styles in the style guide, document the default `stwid--visibilityChips`, close dropdowns on outside click, and enforce single-open behavior (opening one closes others)."

### Mental Map
1. The extension currently has two real UI menu behaviors but mixed naming: a dropdown with selectable options used in Book Visibility and Order Helper (`stwid--columnMenu` family), and contextual action menus for books/folders (`stwid--menu` family). The user sees this as inconsistent and wants naming to reflect behavior.
2. The multiselect behavior already exists in multiple places, but class names are tied to legacy wording (`columnMenu`) instead of intent. This makes styles and future maintenance harder because the same pattern appears as a “column” menu even when it is not about columns.
3. The Book Visibility dropdown in `src/listPanel.js` already supports two preset-style options (`All Books`, `All Active`) plus independent multi-select source options (`Global`, `Chat`, `Persona`, `Character`). The requested model keeps this behavior but formalizes it as a first-class “multiselect dropdown” pattern.
4. The preset rule is now explicit: presets must be top-of-list items and are not part of the multi-select checkbox set. In practice, presets act like one-click mode switches, while the remaining options are true multi-select toggles.
5. The user wants checkbox affordance clarity for multi-select options using Font Awesome square icons, not ambiguous visuals. The intent is immediate recognition that options can be selected in combination.
6. The user wants full-family renaming for consistency, not just one class. This means the naming contract should be coherent across trigger, container, option, and related sub-classes for both menu types.
7. The independent action menu family should represent any present and future action list menu surface (not only current book/folder menus). This is a design-system naming decision, not a one-off local rename.
8. Outside-click behavior must be standardized globally: if any dropdown is open and the user clicks elsewhere, it closes. This applies across panels and menu instances to avoid lingering open menus and mixed interaction rules.
9. The user also wants a global single-open interaction: opening one dropdown should close any other open dropdown. This keeps focus clear and prevents stacked open overlays.
10. Styling expectations are documentation-level too: both menu families and the default `stwid--visibilityChips` style need to be codified in `STYLE_GUIDE.md` so future UI work follows the same pattern.
11. This rework is extension-owned UI/controller behavior and stays within repository boundaries (no changes under `/vendor/SillyTavern`), preserving SillyTavern ownership of data truth/persistence while standardizing extension presentation and interaction semantics.

## PLAN

### Goal
Standardize all extension dropdowns into two explicit UI families (multiselect dropdowns and action-list dropdowns), fully replace legacy class-family names, preserve current feature behavior (including Book Visibility presets), and make close behavior consistent (outside-click close + single-open rule), while documenting the resulting style contract in `STYLE_GUIDE.md`.

### Extension Modules
- `src/listPanel.js`: owns Book Visibility multiselect dropdown markup/state wiring and book-level action menu markup; class-family renames and open/close behavior must be updated here without changing filter logic semantics.
- `src/orderHelperRender.js`: owns Order Helper column visibility and column filter multiselect dropdowns; class-family renames and open/close behavior must be updated across all repeated dropdown builders.
- `src/lorebookFolders.js`: owns folder action menu markup; list-dropdown family rename and behavior parity.
- `style.css`: owns styling for current `stwid--columnMenu*`, `stwid--menu`, and `stwid--visibilityChips`; selectors must be migrated to the new class families with equivalent visuals.
- `STYLE_GUIDE.md`: must add documented patterns for the two dropdown families and baseline `stwid--visibilityChips` usage/style expectations.

### ST Context
- `eventSource` / `event_types` from ST context are not a change target for this rework; dropdown behavior is extension-local DOM interaction.
- Host-provided Font Awesome classes are available in runtime and are the required source for multiselect square/check-square affordances.
- Known globals used by this extension (`$`, `toastr`, `hljs`) remain unchanged; no new ST API integration is required for this feature rework.

### Decision Points
- Class-family boundary: rename the full multiselect family (`wrap`, `button`, `menu`, `option`, option icon/checkbox classes) and full action-list family (`trigger`, `menu`, `item`) everywhere, with no backward alias classes.
- Preset semantics: in multiselect dropdowns, preset rows stay at the top and remain independent (no multiselect checkbox behavior); non-preset rows remain combinable selections.
- Icon semantics: use Font Awesome square/check-square indicators for multiselect options while keeping existing selected/unselected logic unchanged.
- Single-open rule: opening any dropdown must close other open dropdowns first, including across list panel and Order Helper surfaces.
- Outside-click rule: clicking outside an open dropdown closes it; existing blocker-based action menus already satisfy this and should be preserved.
- Scope guardrail: rename-only plus interaction standardization; no changes to world-info data ownership, persistence, source-link derivation, or filter computation rules.

### Evidence-based fix
1. Replace legacy class-family names in DOM construction sites (`src/listPanel.js`, `src/orderHelperRender.js`, `src/lorebookFolders.js`) and in all matching query selectors that currently target legacy names.
2. Migrate corresponding CSS selectors in `style.css` from `stwid--columnMenu*` and `stwid--menu*` patterns to new family names, preserving current layout/spacing/hover/focus behavior and existing style tokens.
3. Update multiselect option rendering in Book Visibility and Order Helper dropdowns so selectable rows expose Font Awesome square/check-square state clearly, while preset rows remain non-multiselect action rows.
4. Standardize open/close flow by reusing existing per-dropdown open/close handlers and adding a shared close-other-open-dropdown step before opening a new one (single-open), without rewriting feature logic.
5. Keep blocker-based list/action menus behavior intact and align naming to the new list-dropdown family, ensuring outside-click close remains consistent.
6. Add `STYLE_GUIDE.md` sections that define: multiselect dropdown family, list dropdown family, and default `stwid--visibilityChips` pattern (intent, where to use, and baseline style contract).

### Risks/cons
1. A full class-family rename can miss a selector/query edge, causing one menu variant to lose styling or close behavior until all references are updated.
2. Single-open enforcement can accidentally close a dropdown during internal interactions if close conditions are too broad, especially in menus with nested controls.
3. Converting multiselect indicators to Font Awesome icons can desync visual state from underlying checked state if update paths are not unified.

## TASK CHECKLIST
Smallest Change Set Checklist:
- [ ] Rename the full multiselect dropdown class family in `src/listPanel.js` and `src/orderHelperRender.js`, including all render/query references.
- [ ] Rename the full list-dropdown class family in `src/listPanel.js` and `src/lorebookFolders.js`, including trigger/menu/item references.
- [ ] Migrate all affected menu selectors in `style.css` to new family names without changing visual behavior.
- [ ] Apply Font Awesome square/check-square affordance for multiselect option rows while keeping preset rows non-multiselect.
- [ ] Add single-open enforcement in existing dropdown open handlers and keep outside-click close behavior working for every dropdown surface.
- [ ] Document both dropdown families and default `stwid--visibilityChips` in `STYLE_GUIDE.md`.
