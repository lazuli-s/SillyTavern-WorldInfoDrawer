# Code Review: style.css Safe Dedup + Vanilla Reuse Plan

## Review Inputs
- `AGENTS.md`
- `STYLE_GUIDE.md`
- `docs/SillyTavernExtensionsDocumentation.md`
- `FEATURE_MAP.md`
- `ARCHITECTURE.md`
- `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`
- `vendor/SillyTavern/public/scripts/st-context.js`
- Extension CSS target: `style.css`
- Vanilla reference CSS: `vendor/SillyTavern/public/style.css`, `vendor/SillyTavern/public/css/world-info.css`, `vendor/SillyTavern/public/css/popup.css`

## A) CSS Component Inventory

### A1. Extension DOM Class Inventory (from extension JS)
Runtime class names emitted by extension modules (intersection of JS usage and styled selectors):

`stwid--action`, `stwid--actions`, `stwid--actionsDivider`, `stwid--actionsRight`, `stwid--active`, `stwid--applySelected`, `stwid--blocker`, `stwid--body`, `stwid--book`, `stwid--bookSort`, `stwid--bookSortToggle`, `stwid--bookVisibility`, `stwid--bookVisibilityHelp`, `stwid--books`, `stwid--characterFilterOptions`, `stwid--characterFilterRow`, `stwid--clearBookSorts`, `stwid--columnFilter`, `stwid--columnHeader`, `stwid--columnVisibility`, `stwid--columnVisibilityLabel`, `stwid--columnVisibilityText`, `stwid--comment`, `stwid--commentLink`, `stwid--controls`, `stwid--controlsRow`, `stwid--ctxAnchor`, `stwid--editor`, `stwid--enabled`, `stwid--entry`, `stwid--entryList`, `stwid--filter`, `stwid--filter-query`, `stwid--filter-visibility`, `stwid--filterRow`, `stwid--filterRow--search`, `stwid--filterRow--visibility`, `stwid--focus`, `stwid--focusToggle`, `stwid--folder`, `stwid--folderAction`, `stwid--folderActiveToggle`, `stwid--folderBooks`, `stwid--folderCount`, `stwid--folderHeader`, `stwid--folderIcon`, `stwid--folderLabel`, `stwid--folderMenu`, `stwid--folderToggle`, `stwid--head`, `stwid--helpToast`, `stwid--hideKeys`, `stwid--hint`, `stwid--icon`, `stwid--input`, `stwid--inputWrap`, `stwid--isCollapsed`, `stwid--isDragging`, `stwid--isEmpty`, `stwid--isFiltered`, `stwid--isLoading`, `stwid--isSelected`, `stwid--isTarget`, `stwid--key`, `stwid--label`, `stwid--list`, `stwid--listDropdownItem`, `stwid--listDropdownMenu`, `stwid--listDropdownTrigger`, `stwid--main`, `stwid--moveBookContent`, `stwid--moveBookQuickActions`, `stwid--moveBookRow`, `stwid--multiselectDropdownButton`, `stwid--multiselectDropdownMenu`, `stwid--multiselectDropdownOption`, `stwid--multiselectDropdownOptionCheckbox`, `stwid--multiselectDropdownOptionIcon`, `stwid--multiselectDropdownOptionInput`, `stwid--multiselectDropdownWrap`, `stwid--orderControls`, `stwid--orderFilterButton`, `stwid--orderHelper`, `stwid--orderInputTight`, `stwid--orderMove`, `stwid--orderMoveButton`, `stwid--orderSelect`, `stwid--orderTable`, `stwid--orderTable--NumberColumns`, `stwid--orderTableWrap`, `stwid--outlet`, `stwid--position`, `stwid--preview`, `stwid--recursionOptions`, `stwid--recursionRow`, `stwid--script`, `stwid--search`, `stwid--searchEntries`, `stwid--selector`, `stwid--sortableHandle`, `stwid--sourceIcon`, `stwid--sourceLinks`, `stwid--splitter`, `stwid--status`, `stwid--syntax`, `stwid--title`, `stwid--unfocusToggle`, `stwid--visibilityChip`, `stwid--visibilityChips`.

Non-`stwid--` classes intentionally reused from Vanilla ST: `menu_button`, `text_pole`, `popup`, `popup-body`, `popup-content`, `popup-controls`, `popup-button-ok`, `popup-button-cancel`, `checkbox`, `interactable`, plus Font Awesome utility classes.

### A2. CSS Components and Patterns
| Component | Main Selectors | UI Controlled | Repeated Patterns |
|---|---|---|---|
| Drawer shell | `style.css:15`, `style.css:20`, `style.css:69`, `style.css:79` | Replaces vanilla WI drawer body, root layout sizing, loading overlay | `display:flex`, `flex:1 1 auto`, `overflow:hidden`, `min-width:0`, `min-height:0` repeated in list/editor/order helper roots |
| List panel controls/filter | `style.css:100`, `style.css:111`, `style.css:153`, `style.css:182` | Primary controls row, sort controls, search row, visibility UI | Shared control sizing and inline-flex alignment repeated across toggle buttons and text inputs |
| Multiselect dropdowns + visibility chips | `style.css:192`, `style.css:199`, `style.css:211`, `style.css:237`, `style.css:304`, `style.css:315` | Book visibility menu and chips; also reused by Order Helper filters | Menu container/item structure close to context list dropdown styles |
| Folder UI | `style.css:338`, `style.css:344`, `style.css:375`, `style.css:415`, `style.css:426`, `style.css:432` | Folder row, header actions, tri-state active toggle, collapse behavior | Folder action icon styles duplicate book action icon styles |
| Book UI | `style.css:437`, `style.css:460`, `style.css:469`, `style.css:478`, `style.css:499`, `style.css:523` | Book head row, source icons, actions, collapsed entries | Action icon base/hover pattern duplicated with folder actions |
| Entry list row | `style.css:533`, `style.css:551`, `style.css:585`, `style.css:610`, `style.css:628`, `style.css:665` | Entry selection, hover/active, disabled opacity, selector column, body text, status controls | Text truncation styles duplicated between `.stwid--comment` and `.stwid--key` |
| Splitter | `style.css:692` | Resizable divider between list and editor | Self-contained; no notable reuse candidates beyond color variables |
| Editor panel + focus mode | `style.css:713`, `style.css:742`, `style.css:777`, `style.css:794`, `style.css:801`, `style.css:825` | Embedded core world entry editor, focus mode, inline drawer adaptations | Repeats same column/flex/min-height stack as drawer/list/order helper |
| Context menu + Move Book modal | `style.css:846`, `style.css:865`, `style.css:905`, `style.css:925`, `style.css:969` | Custom anchored list dropdown and move dialog content layout | List dropdown container/item styles near-duplicate multiselect menu styles |
| Order Helper shell/actions/filters/table | `style.css:991`, `style.css:1062`, `style.css:1128`, `style.css:1156`, `style.css:1248`, `style.css:1320` | Bulk reorder table, filter strip, per-column menus, row controls | Repeated flex+alignment clusters; repeated hide-column selectors; repeated number column sizing selectors |
| Misc | `style.css:1568` | Help toast content | Minimal |

## B) Redundancy Report

### B1. Exact Duplicate Declarations
1. Full-block duplicate layout shell:
- `style.css:713` (`body.stwid-- #WorldInfo .stwid--editor`)
- `style.css:991` (`.stwid--orderHelper`)
- Same declaration set: `display:flex; flex-direction:column; flex:1 1 auto; overflow:hidden; min-width:0; min-height:0`.

2. Full-block duplicate scroll wrapper:
- `style.css:331` (`body.stwid-- #WorldInfo .stwid--list .stwid--books`)
- `style.css:1241` (`.stwid--orderTableWrap`)
- Same declaration set: `flex:1 1 auto; min-height:0; overflow:auto`.

3. Repeated focus outline declaration:
- `style.css:261`, `style.css:426`, `style.css:859`, `style.css:946`, `style.css:1457`
- Repeated: `outline: var(--stwid-focus-ring)` plus offset.

4. Repeated border radius token declaration:
- `style.css:204`, `style.css:208`, `style.css:217`, `style.css:856`, `style.css:917`, `style.css:939`
- Repeated: `border-radius: var(--stwid-radius-m)`.

5. Repeated icon-action affordance declaration:
- `style.css:415`, `style.css:506`, `style.css:1417`
- Repeated base behavior: `cursor:pointer`, `opacity:0.5`, `transition:200ms`, with matching hover-to-1 behavior.

6. Repeated quote accent color declaration:
- Example selectors: `style.css:148`, `style.css:257`, `style.css:326`, `style.css:682`, `style.css:1151`, `style.css:1465`, `style.css:1557`
- Repeated: `color: var(--SmartThemeQuoteColor)`.

### B2. Near-Duplicates (same groups with minor variation)
1. Folder action buttons vs book action buttons:
- Folder: `style.css:415`, `style.css:422`
- Book: `style.css:506`, `style.css:519`
- Shared properties are almost identical; only selector depth differs.

2. Dropdown menu containers:
- Multiselect: `style.css:211`, active variant `style.css:226`
- Context list menu: `style.css:905`
- Both define border, radius, background tint, flex-column layout, and popup-like layering; differences are position model and active state mechanics.

3. Dropdown menu items:
- Multiselect option: `style.css:237`
- List dropdown item: `style.css:925`
- Shared row/flex alignment, gap, cursor, rounding, hover/focus interactions with slight typography/height differences.

4. Flex-column container shells:
- List root `style.css:100`, editor root `style.css:713`, order helper root `style.css:991`, filter panes `style.css:1167`.
- Same structural declarations repeated across many selectors.

5. Entry text truncation blocks:
- Comment `style.css:640`
- Key `style.css:654`
- Shared truncation stack (`overflow`, `text-overflow`, `white-space`, `height`) with only typography differences.

6. Order Helper action label groups:
- `.stwid--inputWrap` at `style.css:1079`
- `.stwid--columnVisibility` at `style.css:1092`
- Shared `display:flex`, `align-items:center`, `gap`, muted color, smaller font.

7. State highlighting rules repeated across list rows and table rows:
- List entries/books: `style.css:441`, `style.css:551`, `style.css:585`
- Order table rows: `style.css:1275`, `style.css:1284`, `style.css:1271`
- Parallel state patterns (target/selected/hover) implemented separately.

### B3. Over-Specific Selectors
1. Deep book-entry chains are repeated and fragile:
- Example: `style.css:648` (`body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book .stwid--entry .stwid--body .stwid--key`)
- Same visual outcome can be scoped with shorter extension-local selectors (for example `#WorldInfo .stwid--entry .stwid--key`) without behavior change.

2. Repeated `body.stwid-- #WorldInfo` prefix on almost all selectors:
- Present throughout `style.css` (for example `style.css:100`, `style.css:533`, `style.css:713`)
- Can be reduced via grouped base scope selectors while retaining drawer-only scoping.

3. Contextual chains include unnecessary intermediates:
- Example: `style.css:298` (`... .stwid--bookVisibility .stwid--bookVisibilityHelp`)
- `stwid--` names are unique enough to avoid full ancestor chains in many cases.

4. Editor internals use brittle structural selectors:
- Example: `style.css:809` (`> :nth-child(1)`)
- Works currently but high maintenance risk if core template ordering changes.

## C) Vanilla Reuse Map

### C1. Reuse Opportunities by Component
| Component | Vanilla Selectors/Files | CSS-only reuse (no markup/class changes) | Needs markup/class changes |
|---|---|---|---|
| Buttons and icon controls | `.menu_button` and hover/active/disabled in `vendor/SillyTavern/public/style.css:3755`, `vendor/SillyTavern/public/style.css:3777`, `vendor/SillyTavern/public/style.css:3025` | Remove extension declarations that restate default button color/border/background/hover behavior where element already has `menu_button` | Add `.interactable` and/or `.menu_button.toggleable`/`.toggled` (`vendor/SillyTavern/public/style.css:292`, `vendor/SillyTavern/public/style.css:3033`) to custom toggle-like controls for built-in focus/toggle styling |
| Inputs/selects | `.text_pole` in `vendor/SillyTavern/public/style.css:2606` and focus rules in `vendor/SillyTavern/public/style.css:307` | Keep only extension-specific sizing constraints; avoid re-declaring base border, radius, background, typography for `text_pole` | Optional: normalize more controls to `text_pole` if currently plain inputs/div controls |
| Popups/dialogs (Move Book modal) | `.popup`, `.popup-body`, `.popup-content`, `.popup-controls`, `.popup-button-ok` in `vendor/SillyTavern/public/css/popup.css:9`, `vendor/SillyTavern/public/css/popup.css:49`, `vendor/SillyTavern/public/css/popup.css:62`, `vendor/SillyTavern/public/css/popup.css:171`, `vendor/SillyTavern/public/css/popup.css:182` | Keep extension CSS to modal-specific layout only (`.stwid--moveBookContent` block); rely on vanilla dialog skinning | Add optional dialogue variant classes (`wide_dialogue_popup`, etc.) for consistent host sizing behaviors |
| Editor embedding / WI form internals | `.world_entry`, `.world_entry_edit`, `.world_entry_form_control`, `.checkbox`, `#wiCheckboxes` in `vendor/SillyTavern/public/css/world-info.css:76`, `vendor/SillyTavern/public/css/world-info.css:214`, `vendor/SillyTavern/public/css/world-info.css:303`; inline drawer defaults in `vendor/SillyTavern/public/style.css:5393` | Prefer vanilla world-entry and inline-drawer defaults; keep only fullscreen-specific overrides required by drawer split layout | If desired, add vanilla state class usage such as `disabledWIEntry` (`vendor/SillyTavern/public/css/world-info.css:222`) instead of custom disabled opacity logic |
| Action list menus | `.list-group` and `.list-group-item` in `vendor/SillyTavern/public/style.css:1100`, `vendor/SillyTavern/public/style.css:1142`, `vendor/SillyTavern/public/style.css:1158` | Reuse design tokens and spacing rhythm; reduce custom declaration volume by aligning values to vanilla menu defaults | Apply `list-group`/`list-group-item` classes on extension menu markup to inherit hover/opacity/border shell directly |
| Drawer shell | `.drawer-content` and `#WorldInfo` in `vendor/SillyTavern/public/style.css:5413`, `vendor/SillyTavern/public/style.css:5473` | Retain only fullscreen sizing/splitting overrides that differ from vanilla drawer behavior | None required |
| Focus handling | `.interactable:focus-visible`, native field focus in `vendor/SillyTavern/public/style.css:297`, `vendor/SillyTavern/public/style.css:307` | For native controls, rely on vanilla focus rules; reduce custom focus declarations where redundant | Add `.interactable` to non-native focusable controls for consistent keyboard focus |

### C2. Summary by Reuse Type
CSS-only reuse candidates (safe first pass):
- Consolidate extension shared layout rules and keep only deltas from `menu_button`, `text_pole`, `popup`, `world_entry` defaults.
- Merge repeated extension-local style clusters (focus ring, action icon affordances, shell flex stacks, truncation blocks).
- Align custom menu tokens with Vanilla menu/list values to reduce declaration count.

Needs markup/class changes (second pass):
- Adopt `.list-group`/`.list-group-item` for context/action dropdown menus.
- Use `.interactable` and `menu_button` toggle classes for more built-in hover/focus/toggle states.
- Optionally reuse vanilla disabled-row class semantics where equivalent.

## Refactor Plan (No Code Changes Yet)

1. Baseline and safety checks.
- Snapshot current UI states before edits: drawer open, folder/book actions, visibility menu, editor focus mode, order helper table/filter.
- Keep all changes extension-local; do not modify `vendor/SillyTavern`.

2. CSS-only dedup pass (behavior-preserving).
- Create shared grouped selectors for repeated shell layouts:
  - `display:flex`, `flex-direction:column`, `flex:1 1 auto`, `overflow:hidden`, `min-width:0`, `min-height:0`.
- Create shared grouped selectors for action-icon micro-controls:
  - `cursor:pointer`, `opacity:0.5`, `transition:200ms` and hover behavior.
- Consolidate repeated focus outline declarations into one grouped rule for extension controls.
- Merge identical truncation stacks for entry text rows; keep typography differences in minimal override rules.

3. CSS-only Vanilla-first pass.
- Audit every rule touching elements already carrying `menu_button`, `text_pole`, popup classes, and inline-drawer/world-entry classes.
- Remove declarations that duplicate vanilla defaults unless they intentionally differ for extension behavior.
- Keep a short comments log for each retained non-vanilla declaration explaining why it cannot be removed.

4. Over-specific selector reduction.
- Shorten deeply nested selectors where `stwid--` uniqueness already guarantees scope.
- Preserve `body.stwid-- #WorldInfo` boundary but reduce repeated full chains via grouped selectors.
- Avoid brittle structural selectors where a stable class-based selector can be used.

5. Optional markup/class harmonization pass.
- Evaluate adding `.list-group`/`.list-group-item` to dropdown markup and `.interactable` to keyboard-focusable controls.
- Evaluate using vanilla toggle/disabled class contracts for controls/rows where semantics match.

6. Validation matrix after each pass.
- List panel: controls, filters, chips, folder/book/entry interaction states.
- Menus: multiselect and list dropdown keyboard/mouse interactions.
- Editor: focus mode, inline drawer behavior, activation settings layout.
- Order Helper: action bar, filter menus, column visibility, row selection/drag states.
- Theme sanity: SmartTheme colors, blur, border, focus visibility.

## Expected Outcome
- Smaller `style.css` footprint with fewer repeated declarations and flatter selector complexity.
- Higher consistency with Vanilla SillyTavern visual system and focus behavior.
- Lower maintenance risk for future upstream ST UI changes.