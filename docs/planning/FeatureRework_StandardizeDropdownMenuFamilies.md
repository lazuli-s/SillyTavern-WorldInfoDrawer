# [FEATURE REWORK]: Standardize Dropdown Menu Families

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
