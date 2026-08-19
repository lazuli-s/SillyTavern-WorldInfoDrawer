// The Entry Manager's "Filter to Characters or Tags" cell: the read-only
// rendering from ticket 04, plus the inline editing dropdown from ticket 05.
//
// The dropdown is the shared multiselect dropdown in its opt-in in-cell mode —
// not a fork — so `closeOpenMultiselectDropdownMenus` still governs it and two
// dropdowns can never be open at once (R9).

import {
  setTooltip,
  formatCharacterFilter,
  truncateCharacterFilterLines,
  buildCharacterFilterOptions,
  readCharacterFilterSelection,
  applyCharacterFilterSelection,
  setCharacterFilterValue,
  CHARACTER_FILTER_LINE_LIMIT,
  CHARACTER_FILTER_INCLUDE_LABEL,
  CHARACTER_FILTER_EXCLUDE_LABEL,
  CHARACTER_FILTER_EMPTY_STATE,
} from '../entry-manager.utils.js';
import {
  createMultiselectDropdownCheckbox,
  wireMultiselectDropdown,
  MULTISELECT_DROPDOWN_CLOSE_HANDLER,
  MULTISELECT_DROPDOWN_OPTION_SELECTOR,
} from '../../shared/multiselect-dropdown.js';
import { mirrorEntryFieldsToOriginalData } from '../../shared/original-data.js';
import { registerCharacterFilterChangeHook } from '../../shared/wi-update-handler.js';

const CHARACTER_FILTER_COLLAPSED_CLASS = 'stwid--character-filter-options--collapsed';
const CHARACTER_FILTER_MENU_CLASS = 'stwid--character-filter-menu';
// Scoped to #WorldInfo: the WorldInfoEngine extension runs on the same page and
// uses the same `stwid--` prefix (CLAUDE.md §1).
const ACTIVE_MENU_SELECTOR = `#WorldInfo .${CHARACTER_FILTER_MENU_CLASS}.stwid--state-active`;

const EXCLUDE_TOOLTIP =
  'Switch the Character/Tags filter around to exclude the listed characters and tags ' +
  'from matching for this entry';
const TRIGGER_TOOLTIP = 'Edit which characters or tags this entry is filtered to';
const PLACEHOLDER_LABEL = 'No filter';

/**
 * `dataset` key the search box reads an option's searchable text from. Exported
 * so another caller building the same option rows — the Bulk Editor row of
 * ticket 06 — reads it from here rather than repeating the string.
 */
export const CHARACTER_FILTER_SEARCH_TEXT_DATASET_KEY = 'stwidFilterSearchText';

const defaultOptionTooltip = (option) =>
  option.stale
    ? `Stale value --- "${option.value}" refers to something that no longer exists. ` +
      'Untick it to remove it from this entry.'
    : option.kind === 'character'
      ? `Avatar key: ${option.value}`
      : `Tag ID: ${option.value}`;

/* -------------------------------------------------------------------------- */
/* Cell registry                                                              */
/* -------------------------------------------------------------------------- */

// Keyed by book + uid so a World Info update can find the one cell it concerns
// without walking the table. Rows are rebuilt wholesale on every render, so the
// registry is cleared with them (`resetCharacterFilterCells`); an entry whose
// row vanished some other way is pruned lazily on first use.
const characterFilterCells = new Map();

// NUL separator: a book name can hold anything a filename can, so a printable
// one could let two different rows collide on a single key.

const cellKey = (book, uid) => `${book}\u0000${uid}`;

// Ticket 08 — the two filters that read this field (has/hasn't, and the
// character/tag picker) must be re-evaluated for a row whose value just
// changed, or a row edited while one of them is active keeps the visibility it
// had before the edit. This is the convention the other filterable cells follow
// — `table.body.cells.js` re-applies the recursion filter right after its own
// edit. Registered rather than imported: the appliers are closures over the
// Entry Manager's filter state, and `initEntryManager` owns them.
let applyCharacterFilterRowFilters = null;

/** Wires the row-filter re-application. Call once, at Entry Manager setup. */
export const registerCharacterFilterRowFilterHook = (applyToRow) => {
  applyCharacterFilterRowFilters = typeof applyToRow === 'function' ? applyToRow : null;
};

const refreshCharacterFilterRowFilters = (element, entryData) => {
  if (!applyCharacterFilterRowFilters) return;
  const row = element?.closest?.('tr');
  if (row) applyCharacterFilterRowFilters(row, entryData);
};

/** Closes the inline dropdown if one is open. Never writes anything (R14b). */
export const closeOpenCharacterFilterDropdown = () => {
  for (const menu of document.querySelectorAll(ACTIVE_MENU_SELECTOR)) {
    menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER]?.();
  }
};

/** Called before the table is rebuilt: drop the old rows' cells and close any dropdown. */
export const resetCharacterFilterCells = () => {
  closeOpenCharacterFilterDropdown();
  characterFilterCells.clear();
};

/**
 * Closes one cell's dropdown and re-renders it from the entry given.
 *
 * Used by the World Info update path below, and by the Bulk Editor row of
 * ticket 06, which writes the same field on many entries at once and has to put
 * the cells it touched back in step with the cache.
 *
 * @param {string} book
 * @param {string|number} uid
 * @param {object} entryData The entry the cell should now show.
 * @returns {boolean} whether a live cell was found and refreshed.
 */
export const refreshCharacterFilterCell = (book, uid, entryData) => {
  const key = cellKey(book, uid);
  const cell = characterFilterCells.get(key);
  if (!cell) return false;
  if (!cell.isConnected()) {
    characterFilterCells.delete(key);
    return false;
  }
  cell.close();
  cell.render(entryData);
  // The value changed under this row, so its own filters are re-evaluated too.
  cell.refreshRowFilters?.(entryData);
  return true;
};

// E8 — an outside edit to the entry being edited closes the dropdown without
// saving and re-renders the cell from the fresh data. `updatedEntry` is passed
// in because the handler runs before `cache[book].entries` is swapped for it.
const handleExternalCharacterFilterChange = (book, uid, updatedEntry) => {
  refreshCharacterFilterCell(book, uid, updatedEntry);
};

/** Wires the WI update path to the cells. Call once, at Entry Manager setup. */
export const registerCharacterFilterUpdateHook = () => {
  registerCharacterFilterChangeHook(handleExternalCharacterFilterChange);
};

/* -------------------------------------------------------------------------- */
/* Read-only rendering (ticket 04)                                            */
/* -------------------------------------------------------------------------- */

function buildCharacterFilterLine(line, { overflow }) {
  const row = document.createElement('div');
  row.classList.add('stwid--character-filter-row', `stwid--character-filter-row--${line.mode}`);
  if (line.stale) row.classList.add('stwid--character-filter-row--stale');
  if (overflow) row.classList.add('stwid--character-filter-row--overflow');
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-fw', line.icon);
  const text = document.createElement('span');
  text.classList.add('stwid--character-filter-label');
  text.textContent = line.label;
  row.append(icon, text);
  setTooltip(row, line.tooltip);
  return row;
}

// R5 — in-place expand: every line is in the DOM, the overflow is collapsed by CSS.
function buildCharacterFilterMoreButton(wrap, hiddenCount, totalCount) {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('stwid--character-filter-more', 'interactable');
  const applyState = (expanded) => {
    wrap.classList.toggle(CHARACTER_FILTER_COLLAPSED_CLASS, !expanded);
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Show less' : `+${hiddenCount} more`;
    setTooltip(
      button,
      expanded
        ? `Show only the first ${CHARACTER_FILTER_LINE_LIMIT} filter values`
        : `Show all ${totalCount} filter values in this cell`,
    );
  };
  button.addEventListener('click', (evt) => {
    // Expanding the cell must not also open the editing dropdown.
    evt.stopPropagation();
    applyState(button.getAttribute('aria-expanded') !== 'true');
  });
  applyState(false);
  return button;
}

// An entry with no filter used to render an empty cell. Now that the cell is the
// editing affordance, an empty one would be an invisible click target, so it
// shows a subdued placeholder instead.
function buildCharacterFilterPlaceholder() {
  const row = document.createElement('div');
  row.classList.add('stwid--character-filter-row', 'stwid--character-filter-row--placeholder');
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-fw', 'fa-plus');
  const text = document.createElement('span');
  text.classList.add('stwid--character-filter-label');
  text.textContent = PLACEHOLDER_LABEL;
  row.append(icon, text);
  return row;
}

function renderCharacterFilterCell(wrap, entryData) {
  wrap.textContent = '';
  wrap.classList.remove(CHARACTER_FILTER_COLLAPSED_CLASS);
  const lines = formatCharacterFilter(entryData);
  if (!lines.length) {
    wrap.append(buildCharacterFilterPlaceholder());
    return;
  }

  const { visible, overflow, hiddenCount } = truncateCharacterFilterLines(lines);
  for (const line of visible) wrap.append(buildCharacterFilterLine(line, { overflow: false }));
  for (const line of overflow) wrap.append(buildCharacterFilterLine(line, { overflow: true }));
  if (hiddenCount > 0) wrap.append(buildCharacterFilterMoreButton(wrap, hiddenCount, lines.length));
}

/* -------------------------------------------------------------------------- */
/* Inline editing dropdown (ticket 05)                                        */
/* -------------------------------------------------------------------------- */

/**
 * One tickable character/tag row for a character-filter dropdown.
 *
 * Exported so the Bulk Editor row (ticket 06) shows the same option list the
 * cell does — same icons, same stale marking, same search text — instead of a
 * second, drifting copy of it.
 *
 * @param {object} option From `buildCharacterFilterOptions`.
 * @param {(option: object, isChecked: boolean) => unknown} onToggle
 * @param {(option: object) => string} [getTooltip] Overrides the tooltip, whose
 *   wording is caller-specific ("this entry" vs "the selected entries").
 * @returns {HTMLLabelElement}
 */
export function buildCharacterFilterOptionRow(option, onToggle, getTooltip = defaultOptionTooltip) {
  const row = document.createElement('label');
  row.classList.add('stwid--multiselect-dropdown__option', 'stwid--menu-item');
  if (option.stale) row.classList.add('stwid--character-filter-option--stale');
  const control = createMultiselectDropdownCheckbox(option.selected);
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-fw', option.icon, 'stwid--multiselect-dropdown__option-icon');
  const label = document.createElement('span');
  // Same class the cell's lines use: it carries the wrapping behaviour, and the
  // stale strike-through hangs off it so colour is never the only signal (R6).
  label.classList.add('stwid--character-filter-label');
  label.textContent = option.label;
  row.append(control.input, control.checkbox, icon, label);
  // R10 — a character is reachable by display name or avatar key; the visible
  // label carries only one of the two.
  row.dataset[CHARACTER_FILTER_SEARCH_TEXT_DATASET_KEY] = option.searchText;
  setTooltip(row, getTooltip(option));
  control.input.addEventListener('change', () => {
    void onToggle(option, control.input.checked);
  });
  return row;
}

/**
 * The dropdown panel a character/tag picker hangs in: a sticky header carrying
 * the heading and the include/exclude toggle, and a scrolling option list.
 *
 * Exported for the Bulk Editor row (ticket 06), which needs the identical panel
 * with different wording.
 *
 * @param {object} [args]
 * @param {string} [args.excludeTooltip]
 * @returns {{menu: HTMLElement, header: HTMLElement, list: HTMLElement,
 *   heading: HTMLElement, excludeRow: HTMLElement, excludeInput: HTMLInputElement}}
 */
export function buildCharacterFilterMenuShell({ excludeTooltip = EXCLUDE_TOOLTIP } = {}) {
  const menu = document.createElement('div');
  menu.classList.add(
    'stwid--multiselect-dropdown__menu',
    'stwid--menu',
    CHARACTER_FILTER_MENU_CLASS,
  );

  // The menu is its own scroll container, so the mode toggle and the search box
  // live in a header that stays put while the list scrolls under them.
  const header = document.createElement('div');
  header.classList.add('stwid--character-filter-menu__header');

  const heading = document.createElement('div');
  heading.classList.add('stwid--character-filter-menu__heading');

  const excludeRow = document.createElement('label');
  excludeRow.classList.add('stwid--option-check-row', 'stwid--character-filter-exclude');
  const excludeInput = document.createElement('input');
  excludeInput.type = 'checkbox';
  excludeInput.classList.add('checkbox');
  setTooltip(excludeInput, excludeTooltip);
  const excludeLabel = document.createElement('span');
  excludeLabel.textContent = 'Exclude';
  excludeRow.append(excludeInput, excludeLabel);

  const headingRow = document.createElement('div');
  headingRow.classList.add('stwid--character-filter-menu__heading-row');
  headingRow.append(heading, excludeRow);
  header.append(headingRow);

  const list = document.createElement('div');
  list.classList.add('stwid--character-filter-menu__list');

  menu.append(header, list);
  return { menu, header, list, heading, excludeRow, excludeInput };
}

/**
 * Builds one cell of the "Filter to Characters or Tags" column, with its inline
 * editing dropdown.
 *
 * @param {object} args
 * @param {{book: string, data: object}} args.entryRow
 * @param {object} args.cache Extension book cache.
 * @param {(bookName: string) => Promise<void>} args.enqueueSave Per-book save queue (R11).
 * @returns {HTMLTableCellElement}
 */
export function buildCharacterFilterCell({ entryRow, cache, enqueueSave }) {
  const td = document.createElement('td');
  td.setAttribute('data-col', 'characterFilter');

  const cellWrap = document.createElement('div');
  cellWrap.classList.add('stwid--character-filter-cell');

  const trigger = document.createElement('div');
  trigger.classList.add(
    'stwid--colwrap',
    'stwid--character-filter-options',
    'stwid--character-filter-trigger',
    'interactable',
  );
  setTooltip(trigger, TRIGGER_TOOLTIP);

  const getEntryData = () => cache[entryRow.book]?.entries?.[entryRow.data.uid] ?? entryRow.data;
  const renderCell = (entryData = getEntryData()) => renderCharacterFilterCell(trigger, entryData);
  renderCell(entryRow.data);

  const { menu, header, list, heading, excludeInput } = buildCharacterFilterMenuShell();

  let selection = readCharacterFilterSelection(entryRow.data);

  const updateHeading = () => {
    heading.textContent = selection.isExclude
      ? CHARACTER_FILTER_EXCLUDE_LABEL
      : CHARACTER_FILTER_INCLUDE_LABEL;
  };

  // R11 — same path as every other editable cell: write the cache, mirror the
  // shadow copy, re-render this cell only (R14), then enqueue the book's save.
  const commit = async () => {
    const entryData = cache[entryRow.book]?.entries?.[entryRow.data.uid];
    if (!entryData) {
      // The entry went away between the menu opening and this tick. Nothing to
      // write, but the checkbox now shows a state no file holds — say so rather
      // than leave the user reading a lie off the screen.
      console.warn(
        '[STWID] Character/tag filter edit dropped: entry',
        entryRow.data.uid,
        'is no longer in book',
        entryRow.book,
      );
      closeMenu();
      return;
    }
    const next = applyCharacterFilterSelection(entryData, selection);
    // The row holds its own snapshot of the entry; keep it in step, as the
    // other editable cells do.
    if (entryRow.data !== entryData) setCharacterFilterValue(entryRow.data, next);
    // R25b — a deleted key mirrors as `undefined`, exactly as the host does.
    mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['characterFilter']);
    renderCell(entryData);
    refreshCharacterFilterRowFilters(td, entryData);
    // The edit can filter this very row out — that is the point of ticket 08's
    // filters. The dropdown lives inside the row, so it collapses to nothing
    // with it; close it rather than leave an unusable menu holding focus.
    if (td.closest('tr')?.classList.contains('stwid--state-filtered')) closeMenu();
    await enqueueSave(entryRow.book);
  };

  const onToggleOption = async (option, isChecked) => {
    const bucket = option.kind === 'character' ? 'names' : 'tags';
    if (isChecked) {
      if (!selection[bucket].includes(option.value)) selection[bucket].push(option.value);
    } else {
      selection[bucket] = selection[bucket].filter((value) => value !== option.value);
    }
    await commit();
  };

  excludeInput.addEventListener('change', () => {
    selection.isExclude = excludeInput.checked;
    updateHeading();
    // R13 — deliberately no prune-stale-names pass here, unlike the host.
    void commit();
  });

  // The pickable list depends on the host rosters and on what the entry stores
  // right now, so it is rebuilt on every open rather than once per row.
  const refreshMenu = () => {
    const entryData = getEntryData();
    selection = readCharacterFilterSelection(entryData);
    excludeInput.checked = selection.isExclude;
    updateHeading();
    for (const option of list.querySelectorAll(MULTISELECT_DROPDOWN_OPTION_SELECTOR)) {
      option.remove();
    }
    const fragment = document.createDocumentFragment();
    for (const option of buildCharacterFilterOptions(entryData)) {
      fragment.append(buildCharacterFilterOptionRow(option, onToggleOption));
    }
    list.append(fragment);
  };
  updateHeading();

  const closeMenu = wireMultiselectDropdown(menu, trigger, cellWrap, {
    listContainer: list,
    inCell: true,
    onBeforeOpen: refreshMenu,
    // The mode toggle is not an option, so Tab would skip it inside the trap.
    getExtraTabStops: () => [excludeInput],
    // E3 — with nothing to pick the list is empty, but the header (and so the
    // include/exclude toggle) stays usable.
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

  characterFilterCells.set(cellKey(entryRow.book, entryRow.data.uid), {
    isConnected: () => cellWrap.isConnected,
    close: closeMenu,
    render: renderCell,
    refreshRowFilters: (entryData) => refreshCharacterFilterRowFilters(td, entryData),
  });

  cellWrap.append(trigger, menu);
  td.append(cellWrap);
  return td;
}
