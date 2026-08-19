import {
  ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
  ENTRY_MANAGER_DEFAULT_COLUMNS,
  ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY,
  ENTRY_MANAGER_SORT_STORAGE_KEY,
  createEntryManagerState,
  getPositionOptions,
  getPositionValues,
  getStrategyOptions,
  getStrategyValues,
} from './logic/logic.state.js';
import { createEntryManagerFilters } from './logic/logic.filters.js';
import { createDynamicOptionAccessors } from './logic/logic.dynamic-options.js';
import { mirrorEntryFieldsToOriginalData } from '../shared/original-data.js';
import { createEntryManagerRenderer } from './bulk-editor-tab/bulk-editor-tab.js';
import {
  closeOpenCharacterFilterDropdown,
  registerCharacterFilterRowFilterHook,
} from './table/table.body.character-filter.js';
import { registerCharacterFilterSortResolver } from '../shared/sort-helpers.js';
import {
  buildCharacterFilterPickerOptions,
  formatCharacterFilter,
  toCharacterFilterValueKeys,
} from './entry-manager.utils.js';
import { BULK_APPLY_BATCH_SIZE } from './bulk-editor-tab/bulk-edit-row.helpers.js';
import { maybeYieldToEventLoop } from '../shared/utils.js';

const ROW_SELECTED_CLASS = 'stwid--apply-selected';
const ICON_UNCHECKED_CLASS = 'fa-square';
const ICON_CHECKED_CLASS = 'fa-square-check';
const STATE_ACTIVE_CLASS = 'stwid--state-active';
const MOBILE_PANEL_OPEN_CLASS = 'stwid--mobile-panel-open';

const createScopeHelpers = () => {
  const normalizeScope = (scope) => (Array.isArray(scope) ? [...scope].sort() : null);
  const isSameScope = (a, b) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((name, index) => name === b[index]);
  };
  return { normalizeScope, isSameScope };
};

const getMaxDisplayIndex = (entries, getEntryDisplayIndex) => {
  let maxIndex = -1;
  for (const entry of entries) {
    const displayIndex = getEntryDisplayIndex(entry);
    if (Number.isFinite(displayIndex)) {
      maxIndex = Math.max(maxIndex, displayIndex);
    }
  }
  return maxIndex;
};

const getEntryManagerRowData = ({ entryBook, row, cache }) => {
  const uid = row.getAttribute('data-uid');
  if (!uid || !cache[entryBook] || !cache[entryBook].entries[uid]) return null;
  return {
    book: entryBook,
    dom: row,
    data: cache[entryBook].entries[uid],
  };
};

const createEntryAccessors = ({
  cache,
  getSelectedWorldInfo,
  sortEntries,
  entryManagerState,
  getScopedBookNames,
}) => {
  const getEntryDisplayIndex = (entry) => {
    const displayIndex = Number(entry?.extensions?.display_index);
    return Number.isFinite(displayIndex) ? displayIndex : null;
  };

  const compareEntryUid = (a, b) => {
    const auid = Number(a.uid);
    const buid = Number(b.uid);
    if (Number.isFinite(auid) && Number.isFinite(buid) && auid !== buid) return auid - buid;
    return String(a.uid).localeCompare(String(b.uid));
  };

  const getEntryManagerSourceEntries = (book = entryManagerState.book) => {
    const scopeSet = new Set(getScopedBookNames() ?? getSelectedWorldInfo());
    if (book) {
      if (!scopeSet.has(book) || !cache[book]) return [];
      return Object.values(cache[book].entries).map((entryData) => ({ book, data: entryData }));
    }
    return Object.entries(cache)
      .filter(([name]) => scopeSet.has(name))
      .map(([name, data]) =>
        Object.values(data.entries).map((entryData) => ({ book: name, data: entryData })),
      )
      .flat();
  };

  const ensureCustomDisplayIndex = (book = entryManagerState.book) => {
    const source = getEntryManagerSourceEntries(book);
    const entriesByBook = new Map();
    for (const entry of source) {
      if (!entriesByBook.has(entry.book)) {
        entriesByBook.set(entry.book, []);
      }
      entriesByBook.get(entry.book).push(entry.data);
    }
    const updatedBooks = new Set();
    for (const [bookName, entries] of entriesByBook.entries()) {
      const maxIndex = getMaxDisplayIndex(entries, getEntryDisplayIndex);
      let nextIndex = maxIndex + 1;
      const missing = entries
        .filter((entry) => !Number.isFinite(getEntryDisplayIndex(entry)))
        .sort(compareEntryUid);
      for (const entry of missing) {
        entry.extensions ??= {};
        entry.extensions.display_index = nextIndex;
        mirrorEntryFieldsToOriginalData(cache[bookName], entry, ['displayIndex']);
        nextIndex += 1;
        updatedBooks.add(bookName);
      }
    }
    return [...updatedBooks];
  };

  const getEntryManagerEntries = (
    book = entryManagerState.book,
    includeDom = false,
    dom = null,
  ) => {
    const source =
      includeDom && dom?.order?.entries && dom?.order?.tbody
        ? Object.entries(dom.order.entries)
            .map(([entryBook, entries]) =>
              Object.values(entries).map((row) =>
                getEntryManagerRowData({
                  entryBook,
                  row,
                  cache,
                }),
              ),
            )
            .flat()
            .filter(Boolean)
        : getEntryManagerSourceEntries(book);
    return sortEntries(source, entryManagerState.sort, entryManagerState.direction).filter(
      (entry) => !book || entry.book === book,
    );
  };

  return {
    ensureCustomDisplayIndex,
    getEntryManagerEntries,
    getEntryManagerSourceEntries,
  };
};

// Option lists are order-independent (buildDynamicOptions dedupes into a Set and
// sorts labels itself), so they read the unsorted source rather than paying for
// getEntryManagerEntries' full sort on every recompute.
const createDynamicOptionHelpers = ({
  getEntryManagerSourceEntries,
  entryManagerState,
  isOutletPosition,
}) => {
  const OUTLET_NONE_VALUE = '';
  const AUTOMATION_ID_NONE_VALUE = '';
  const GROUP_NONE_VALUE = '';

  const getOutletValueForEntry = (entry) => {
    if (!isOutletPosition(entry?.position)) {
      return OUTLET_NONE_VALUE;
    }
    const outletName = entry?.outletName;
    if (outletName === null || outletName === undefined) return OUTLET_NONE_VALUE;
    const normalized = String(outletName).trim();
    return normalized || OUTLET_NONE_VALUE;
  };

  const getAutomationIdValueForEntry = (entry) => {
    const automationId = entry?.automationId;
    if (automationId === null || automationId === undefined) return AUTOMATION_ID_NONE_VALUE;
    const normalized = String(automationId).trim();
    return normalized || AUTOMATION_ID_NONE_VALUE;
  };

  const splitGroupValues = (value) =>
    String(value ?? '')
      .split(/,\s*/)
      .filter(Boolean);

  const getGroupValueForEntry = (entry) => {
    const groupValue = entry?.group;
    if (groupValue === null || groupValue === undefined) return [GROUP_NONE_VALUE];
    const groups = splitGroupValues(groupValue);
    return groups.length ? groups : [GROUP_NONE_VALUE];
  };

  const { getOptions: getOutletOptions, getValues: getOutletValues } = createDynamicOptionAccessors(
    {
      getEntries: (book = entryManagerState.book) => getEntryManagerSourceEntries(book),
      getValueForEntry: getOutletValueForEntry,
      noneValue: OUTLET_NONE_VALUE,
    },
  );

  const { getOptions: getAutomationIdOptions, getValues: getAutomationIdValues } =
    createDynamicOptionAccessors({
      getEntries: (book = entryManagerState.book) => getEntryManagerSourceEntries(book),
      getValueForEntry: getAutomationIdValueForEntry,
      noneValue: AUTOMATION_ID_NONE_VALUE,
    });

  const { getOptions: getGroupOptions, getValues: getGroupValues } = createDynamicOptionAccessors({
    getEntries: (book = entryManagerState.book) => getEntryManagerSourceEntries(book),
    getValueForEntry: getGroupValueForEntry,
    noneValue: GROUP_NONE_VALUE,
  });

  return {
    getAutomationIdOptions,
    getAutomationIdValueForEntry,
    getAutomationIdValues,
    getGroupOptions,
    getGroupValueForEntry,
    getGroupValues,
    getOutletOptions,
    getOutletValueForEntry,
    getOutletValues,
  };
};

const createSelectionAndPreviewHelpers = ({ dom }) => {
  const updateEntryManagerPreview = (entries) => {
    if (!dom.order.filter.preview) return;
    const previewEntry = entries[0];
    if (!previewEntry) {
      dom.order.filter.preview.textContent = '';
      return;
    }
    dom.order.filter.preview.textContent = JSON.stringify(
      Object.assign({ book: previewEntry.book }, previewEntry.data),
      null,
      2,
    );
  };

  const getEntryManagerRows = () => [...(dom.order.tbody?.querySelectorAll('tr') ?? [])];

  const isEntryManagerRowSelected = (row) => row?.classList.contains(ROW_SELECTED_CLASS);

  const setEntryManagerRowSelected = (row, selected) => {
    if (!row) return;
    row.classList.toggle(ROW_SELECTED_CLASS, selected);
    row.setAttribute('aria-selected', selected ? 'true' : 'false');
    const icon = row.querySelector('.stwid--order-select .stwid--icon');
    if (icon) {
      icon.classList.toggle(ICON_UNCHECKED_CLASS, !selected);
      icon.classList.toggle(ICON_CHECKED_CLASS, selected);
    }
  };

  const setAllEntryManagerRowSelected = async (selected, rows = getEntryManagerRows()) => {
    for (let i = 0; i < rows.length; i++) {
      setEntryManagerRowSelected(rows[i], selected);
      await maybeYieldToEventLoop(i, BULK_APPLY_BATCH_SIZE);
    }
  };

  const updateEntryManagerSelectAllButton = (rows) => {
    if (!dom.order.selectAll) return;
    const rowList = rows ?? getEntryManagerRows();
    const allSelected = rowList.length > 0 && rowList.every(isEntryManagerRowSelected);
    dom.order.selectAll.classList.toggle(STATE_ACTIVE_CLASS, allSelected);
    dom.order.selectAll.classList.toggle(ICON_CHECKED_CLASS, allSelected);
    dom.order.selectAll.classList.toggle(ICON_UNCHECKED_CLASS, !allSelected);
  };

  return {
    getEntryManagerRows,
    isEntryManagerRowSelected,
    setAllEntryManagerRowSelected,
    setEntryManagerRowSelected,
    updateEntryManagerPreview,
    updateEntryManagerSelectAllButton,
  };
};

const initEntryManagerFilters = (args) => createEntryManagerFilters(args);

const initEntryManagerRenderer = (args) => createEntryManagerRenderer(args);

const createEntryManagerOpeners = ({
  dom,
  entryManagerState,
  getCurrentEditor,
  getEditorPanelApi,
  renderEntryManager,
  normalizeScope,
  isSameScope,
  syncEntryManagerStrategyFilters,
  syncEntryManagerPositionFilters,
  getScopedBookNames,
  setScopedBookNames,
}) => {
  const openEntryManager = async (book = null, scope = null) => {
    if (!dom.order.toggle) return;
    const currentEditor = getCurrentEditor?.();
    const dirty = Boolean(
      currentEditor && getEditorPanelApi()?.isDirty?.(currentEditor.name, currentEditor.uid),
    );
    if (dirty) {
      toastr.warning(
        'Unsaved edits detected. Save or discard changes before opening Entry Manager.',
      );
      return;
    }

    syncEntryManagerStrategyFilters();
    syncEntryManagerPositionFilters();

    setScopedBookNames(normalizeScope(scope));
    dom.order.toggle.classList.add(STATE_ACTIVE_CLASS);
    try {
      await renderEntryManager(book);
      dom.drawer.body?.classList?.add(MOBILE_PANEL_OPEN_CLASS);
    } catch (error) {
      dom.order.toggle.classList.remove(STATE_ACTIVE_CLASS);
      console.error('Failed to open Entry Manager.', error);
      toastr.error('Failed to open Entry Manager.');
    }
  };

  const refreshEntryManagerScope = (scope = null) => {
    if (!dom.order.toggle?.classList.contains(STATE_ACTIVE_CLASS)) return;
    if (entryManagerState.book) return;
    const nextScope = normalizeScope(scope);
    if (isSameScope(getScopedBookNames(), nextScope)) return;
    setScopedBookNames(nextScope);
    renderEntryManager(null);
  };

  return { openEntryManager, refreshEntryManagerScope };
};

export const initEntryManager = ({
  dom,
  cache,
  SORT,
  SORT_DIRECTION,
  sortEntries,
  appendSortOptions,
  saveWorldInfo,
  buildSavePayload,
  getSelectedWorldInfo,
  getListPanelApi,
  getEditorPanelApi,
  getCurrentEditor,
  debounce,
  isTrueBoolean,
  SlashCommandParser,
  getSortableDelay,
  entryState,
  isOutletPosition,
  hljs,
  $,
}) => {
  // Ticket 07 — the character/tag filter sort key reuses ticket 04's label
  // resolution, which lives in this feature folder. `shared/` stays free of
  // feature-folder imports (ARCHITECTURE.md), so the formatter is handed to the
  // sorter here rather than imported by it.
  registerCharacterFilterSortResolver(formatCharacterFilter);

  const entryManagerState = createEntryManagerState({ SORT, SORT_DIRECTION });
  let scopedBookNames = null;
  const { normalizeScope, isSameScope } = createScopeHelpers();
  const getScopedBookNames = () => scopedBookNames;
  const setScopedBookNames = (scope) => {
    scopedBookNames = scope;
  };
  const {
    ensureCustomDisplayIndex,
    getEntryManagerEntries: getBaseEntryManagerEntries,
    getEntryManagerSourceEntries,
  } = createEntryAccessors({
    cache,
    getSelectedWorldInfo,
    sortEntries,
    entryManagerState,
    getScopedBookNames,
  });
  const getEntryManagerEntries = (book = entryManagerState.book, includeDom = false) =>
    getBaseEntryManagerEntries(book, includeDom, dom);
  // Ticket 08 — what the R22 picker offers: every character and tag, plus the
  // stale values the loaded entries still reference (E6). Read from the
  // unsorted source, like the other dynamic option lists.
  const getCharacterFilterPickerOptions = () =>
    buildCharacterFilterPickerOptions({
      entries: getEntryManagerSourceEntries().map((entry) => entry.data),
      selected: entryManagerState.filters.characterFilterValue,
    });
  const getCharacterFilterValueKeys = () =>
    toCharacterFilterValueKeys(getCharacterFilterPickerOptions());
  const {
    getAutomationIdOptions,
    getAutomationIdValueForEntry,
    getAutomationIdValues,
    getGroupOptions,
    getGroupValueForEntry,
    getGroupValues,
    getOutletOptions,
    getOutletValueForEntry,
    getOutletValues,
  } = createDynamicOptionHelpers({
    getEntryManagerSourceEntries,
    entryManagerState,
    isOutletPosition,
  });
  const {
    getEntryManagerRows,
    isEntryManagerRowSelected,
    setAllEntryManagerRowSelected,
    setEntryManagerRowSelected,
    updateEntryManagerPreview,
    updateEntryManagerSelectAllButton,
  } = createSelectionAndPreviewHelpers({
    dom,
  });

  const applyEntryManagerSortToDom = () => {
    if (!dom.order.tbody) return;
    // R14b — rows are about to move; an in-cell dropdown is positioned against
    // the cell it belongs to, so it closes rather than following it.
    closeOpenCharacterFilterDropdown();
    const entries = getEntryManagerEntries(entryManagerState.book, true);
    for (const entry of entries) {
      const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
      if (row) {
        dom.order.tbody.append(row);
      }
    }
    updateEntryManagerPreview(entries);
  };

  const setEntryManagerSort = (sort, direction) => {
    entryManagerState.sort = sort;
    entryManagerState.direction = direction;
    const value = JSON.stringify({ sort, direction });
    localStorage.setItem(ENTRY_MANAGER_SORT_STORAGE_KEY, value);
    if (dom.order.sortSelect) {
      dom.order.sortSelect.value = value;
    }
  };

  const applyEntryManagerColumnVisibility = (root) => {
    if (!root) return;
    for (const [key, visible] of Object.entries(entryManagerState.columns)) {
      root.classList.toggle(`stwid--hide-col-${key}`, !visible);
    }
  };

  const {
    applyEntryManagerRecursionFilterToRow,
    applyEntryManagerRecursionFilters,
    applyEntryManagerPositionFilterToRow,
    applyEntryManagerPositionFilters,
    applyEntryManagerStrategyFilterToRow,
    applyEntryManagerStrategyFilters,
    applyEntryManagerOutletFilterToRow,
    applyEntryManagerOutletFilters,
    applyEntryManagerAutomationIdFilterToRow,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilterToRow,
    applyEntryManagerGroupFilters,
    applyEntryManagerCharacterFilterPresenceFilterToRow,
    applyEntryManagerCharacterFilterPresenceFilters,
    applyEntryManagerCharacterFilterValueFilterToRow,
    applyEntryManagerCharacterFilterValueFilters,
    syncEntryManagerCharacterFilterValueFilters,
    clearEntryManagerScriptFilters,
    normalizePositionFilters,
    normalizeStrategyFilters,
    normalizeOutletFilters,
    normalizeAutomationIdFilters,
    normalizeGroupFilters,
    setEntryManagerRowFilterState,
    syncEntryManagerOutletFilters,
    syncEntryManagerAutomationIdFilters,
    syncEntryManagerGroupFilters,
    syncEntryManagerPositionFilters,
    syncEntryManagerStrategyFilters,
  } = initEntryManagerFilters({
    dom,
    entryManagerState,
    entryState,
    getEntryManagerEntries,
    getStrategyValues,
    getPositionValues,
    getOutletValues,
    getOutletValue: getOutletValueForEntry,
    getAutomationIdValues,
    getAutomationIdValue: getAutomationIdValueForEntry,
    getGroupValues,
    getGroupValue: getGroupValueForEntry,
    getCharacterFilterValueKeys,
  });

  // Ticket 08 — an inline or bulk edit of this field changes which side of the
  // two new filters its row falls on, so the row is re-judged right after the
  // write, the way every other filterable cell does it.
  registerCharacterFilterRowFilterHook((row, entryData) => {
    applyEntryManagerCharacterFilterPresenceFilterToRow(row, entryData);
    applyEntryManagerCharacterFilterValueFilterToRow(row, entryData);
  });

  const focusWorldEntry = (book, uid) => {
    const entryDom = cache?.[book]?.dom?.entry?.[uid]?.root;
    if (!entryDom) return;
    const listPanelApi = getListPanelApi();
    listPanelApi.setBookCollapsed(book, false);
    entryDom.scrollIntoView({ behavior: 'smooth', block: 'center' });
    entryDom.click();
  };

  const { renderEntryManager } = initEntryManagerRenderer({
    dom,
    cache,
    entryManagerState,
    ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
    ENTRY_MANAGER_DEFAULT_COLUMNS,
    ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY,
    SORT,
    SORT_DIRECTION,
    appendSortOptions,
    ensureCustomDisplayIndex,
    saveWorldInfo,
    buildSavePayload,
    getEntryManagerEntries,
    applyEntryManagerSortToDom,
    updateEntryManagerPreview,
    clearEntryManagerScriptFilters,
    applyEntryManagerColumnVisibility,
    setEntryManagerSort,
    isEntryManagerRowSelected,
    setEntryManagerRowSelected,
    setAllEntryManagerRowSelected,
    updateEntryManagerSelectAllButton,
    applyEntryManagerStrategyFilters,
    applyEntryManagerStrategyFilterToRow,
    applyEntryManagerPositionFilterToRow,
    applyEntryManagerPositionFilters,
    applyEntryManagerRecursionFilterToRow,
    applyEntryManagerRecursionFilters,
    applyEntryManagerOutletFilterToRow,
    applyEntryManagerOutletFilters,
    applyEntryManagerAutomationIdFilterToRow,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilterToRow,
    applyEntryManagerGroupFilters,
    applyEntryManagerCharacterFilterPresenceFilters,
    applyEntryManagerCharacterFilterValueFilters,
    setEntryManagerRowFilterState,
    syncEntryManagerStrategyFilters,
    syncEntryManagerPositionFilters,
    syncEntryManagerOutletFilters,
    syncEntryManagerAutomationIdFilters,
    syncEntryManagerGroupFilters,
    syncEntryManagerCharacterFilterValueFilters,
    focusWorldEntry,
    entryState,
    isOutletPosition,
    getStrategyOptions,
    getStrategyValues,
    getPositionOptions,
    getPositionValues,
    getOutletOptions,
    getOutletValues,
    getAutomationIdOptions,
    getAutomationIdValues,
    getGroupOptions,
    getGroupValues,
    getCharacterFilterPickerOptions,
    normalizeStrategyFilters,
    normalizePositionFilters,
    normalizeOutletFilters,
    normalizeAutomationIdFilters,
    normalizeGroupFilters,
    getEntryManagerRows,
    SlashCommandParser,
    debounce,
    hljs,
    getSortableDelay,
    isTrueBoolean,
    $,
    getEditorPanelApi,
  });

  const { openEntryManager, refreshEntryManagerScope } = createEntryManagerOpeners({
    dom,
    entryManagerState,
    getCurrentEditor,
    getEditorPanelApi,
    renderEntryManager,
    normalizeScope,
    isSameScope,
    syncEntryManagerStrategyFilters,
    syncEntryManagerPositionFilters,
    getScopedBookNames,
    setScopedBookNames,
  });

  return { openEntryManager, refreshEntryManagerScope };
};
