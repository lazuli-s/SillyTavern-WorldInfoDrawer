// Ticket 08 — the "filter to a specific character or tag" menu in the
// "Filter to Characters or Tags" column header (R22).
//
// The column's *other* new filter, the has/hasn't toggle (R21), is a fixed
// two-value set and needs nothing special: it is built by `table.header.js`'s
// generic filter menu, exactly like the recursion filter.
//
// This one is different in two ways, which is why it lives here:
//
// 1. **Its options are characters and tags**, so it reuses the column's own
//    picker parts — the same panel shell, the same option rows, the same stale
//    marking (E6) and the same search box the inline editor and the Bulk Editor
//    row use. Nothing about display-name resolution is reimplemented.
// 2. **Its "off" state is an empty selection**, not a full one. Picking one
//    character out of a roster of hundreds must not mean unticking the rest.

import { CHARACTER_FILTER_EMPTY_STATE, setTooltip } from '../entry-manager.utils.js';
import {
  buildCharacterFilterMenuShell,
  buildCharacterFilterOptionRow,
  CHARACTER_FILTER_SEARCH_TEXT_DATASET_KEY,
} from './table.body.character-filter.js';
import {
  wireMultiselectDropdown,
  MULTISELECT_DROPDOWN_HIDDEN_CLASS,
  MULTISELECT_DROPDOWN_OPTION_SELECTOR,
} from '../../shared/multiselect-dropdown.js';

const ACTIVE_FILTER_CLASS = 'stwid--state-active';
const FILTER_STATE_KEY = 'characterFilterValue';

/** R22 — the "matches both directions" rule, stated in the UI rather than guessed. */
export const CHARACTER_FILTER_VALUE_FILTER_HINT =
  'Matches both include and exclude filters — the entry references the character either way.';

const TRIGGER_TOOLTIP =
  'Filter to a specific character or tag --- shows only entries whose filter references what you pick. ' +
  `${CHARACTER_FILTER_VALUE_FILTER_HINT} Pick nothing to turn the filter off.`;

const MENU_HEADING = 'Filter to a character or tag';

const optionTooltip = (option) =>
  option.stale
    ? `Stale value --- "${option.value}" refers to something that no longer exists. ` +
      'Tick it to find the entries that still reference it.'
    : option.kind === 'character'
      ? `Avatar key: ${option.value}`
      : `Tag ID: ${option.value}`;

/**
 * Builds the column header's character/tag picker filter (R22).
 *
 * @param {object} args
 * @param {object} args.entryManagerState
 * @param {() => Array<object>} args.getOptions Current option list, from
 *   `buildCharacterFilterPickerOptions` — rebuilt on every open, because the
 *   roster, the tags and the stale values the loaded entries reference all
 *   change between one open and the next.
 * @param {() => void} args.applyFilters Re-applies this filter to every row.
 * @param {() => void} args.onFilterChange Toolbar/chip refresh.
 * @returns {{menuWrap: HTMLElement, updateFilterIndicator: () => void}}
 */
export function buildCharacterFilterValueFilterMenu({
  entryManagerState,
  getOptions,
  applyFilters,
  onFilterChange = () => {},
}) {
  const menuWrap = document.createElement('div');
  menuWrap.classList.add('stwid--multiselect-dropdown__wrap');

  const menuButton = document.createElement('div');
  menuButton.classList.add(
    'menu_button',
    'fa-solid',
    'fa-fw',
    'fa-user-tag',
    'stwid--order-filter-button',
    'stwid--multiselect-dropdown__button',
  );
  // Icon-only control: it has no text to name it (ACC-04).
  setTooltip(menuButton, TRIGGER_TOOLTIP, { ariaLabel: 'Filter to a specific character or tag' });
  menuWrap.append(menuButton);

  const { menu, header, list, heading, excludeRow } = buildCharacterFilterMenuShell();
  // This picker chooses what to *look for*, not what to store, so the
  // include/exclude toggle would have nothing to act on — R22 matches both.
  excludeRow.classList.add(MULTISELECT_DROPDOWN_HIDDEN_CLASS);
  heading.textContent = MENU_HEADING;

  const hint = document.createElement('div');
  hint.classList.add('stwid--character-filter-menu__hint');
  hint.textContent = CHARACTER_FILTER_VALUE_FILTER_HINT;
  header.append(hint);

  const getSelected = () => entryManagerState.filters[FILTER_STATE_KEY] ?? [];

  const updateFilterIndicator = () => {
    menuButton.classList.toggle(ACTIVE_FILTER_CLASS, getSelected().length > 0);
  };

  const onToggleOption = (option, isChecked) => {
    const selected = getSelected();
    // Both branches replace the array rather than mutate it in place, so nothing
    // holding the previous one sees the change behind its back.
    entryManagerState.filters[FILTER_STATE_KEY] = !isChecked
      ? selected.filter((value) => value !== option.filterValue)
      : selected.includes(option.filterValue)
        ? selected
        : [...selected, option.filterValue];
    updateFilterIndicator();
    applyFilters();
    onFilterChange();
  };

  const refreshMenu = () => {
    for (const option of list.querySelectorAll(MULTISELECT_DROPDOWN_OPTION_SELECTOR)) {
      option.remove();
    }
    const fragment = document.createDocumentFragment();
    for (const option of getOptions()) {
      fragment.append(buildCharacterFilterOptionRow(option, onToggleOption, optionTooltip));
    }
    list.append(fragment);
  };

  wireMultiselectDropdown(menu, menuButton, menuWrap, {
    listContainer: list,
    // Viewport-positioned like the column's own picker: the header sits inside
    // the Entry Manager's scroll containers, and this is also what caps the
    // menu's height so a 100-character roster still fits on screen.
    inCell: true,
    onBeforeOpen: refreshMenu,
    emptyStateText: CHARACTER_FILTER_EMPTY_STATE,
    search: {
      placeholder: 'Search characters and tags…',
      ariaLabel: 'Search characters and tags',
      noResultsText: 'No matching character or tag.',
      container: header,
      getOptionSearchText: (option) =>
        option.dataset[CHARACTER_FILTER_SEARCH_TEXT_DATASET_KEY] ?? '',
    },
  });

  updateFilterIndicator();
  menuWrap.append(menu);
  return { menuWrap, updateFilterIndicator };
}
