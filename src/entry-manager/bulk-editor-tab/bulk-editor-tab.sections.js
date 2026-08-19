import { buildDisplayToolbar } from '../display-tab/display-tab.display-toolbar.js';
import { buildBulkEditRow } from './bulk-edit-row.js';
import { buildFilterPanel } from '../table/table.filter-panel.js';
import { buildTableHeader } from '../table/table.header.js';
import { buildTableBody } from '../table/table.body.js';

const TAB_ID_DISPLAY = 'display';
const TAB_ID_BULK_EDITOR = 'bulk-editor';

export const buildEntryManagerRootEl = ({
  entryManagerState,
  applyEntryManagerColumnVisibility,
}) => {
  const entryManagerRootEl = document.createElement('div');
  entryManagerRootEl.classList.add('stwid--entry-manager');
  entryManagerRootEl.classList.toggle('stwid--hide-keys', entryManagerState.hideKeys);
  applyEntryManagerColumnVisibility(entryManagerRootEl);
  return entryManagerRootEl;
};

export const buildEntryManagerTopRows = ({
  entryManagerRootEl,
  entryManagerState,
  dom,
  cache,
  ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY,
  ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
  ENTRY_MANAGER_DEFAULT_COLUMNS,
  applyEntryManagerColumnVisibility,
  clearEntryManagerScriptFilters,
  setEntryManagerSort,
  applyEntryManagerSortToDom,
  ensureCustomDisplayIndex,
  saveWorldInfo,
  buildSavePayload,
  appendSortOptions,
  getEntryManagerEntries,
  updateEntryManagerPreview,
  SORT,
  SORT_DIRECTION,
  applyEntryManagerStrategyFilters,
  applyEntryManagerPositionFilters,
  applyEntryManagerRecursionFilters,
  applyEntryManagerOutletFilters,
  applyEntryManagerAutomationIdFilters,
  applyEntryManagerGroupFilters,
  applyEntryManagerCharacterFilterPresenceFilters,
  applyEntryManagerCharacterFilterValueFilters,
  getStrategyOptions,
  getPositionOptions,
  getOutletOptions,
  getAutomationIdOptions,
  getGroupOptions,
  getCharacterFilterPickerOptions,
  getStrategyValues,
  getPositionValues,
  getOutletValues,
  getAutomationIdValues,
  getGroupValues,
  isEntryManagerRowSelected,
  setAllEntryManagerRowSelected,
  updateEntryManagerSelectAllButton,
  getEntryManagerRows,
  applyEntryManagerStrategyFilterToRow,
  applyEntryManagerPositionFilterToRow,
  isOutletPosition,
  applyEntryManagerOutletFilterToRow,
  syncEntryManagerOutletFilters,
  applyEntryManagerRecursionFilterToRow,
  cleanupBulkEditRowRef,
  debounce,
}) => {
  const filterIndicatorRefs = {};

  const { element: displayToolbarEl, refresh: refreshDisplayToolbar } = buildDisplayToolbar({
    body: entryManagerRootEl,
    entryManagerState,
    dom,
    ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY,
    ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
    ENTRY_MANAGER_DEFAULT_COLUMNS,
    applyEntryManagerColumnVisibility,
    clearEntryManagerScriptFilters,
    setEntryManagerSort,
    applyEntryManagerSortToDom,
    ensureCustomDisplayIndex,
    saveWorldInfo,
    buildSavePayload,
    appendSortOptions,
    getEntryManagerEntries,
    updateEntryManagerPreview,
    SORT,
    SORT_DIRECTION,
    applyEntryManagerStrategyFilters,
    applyEntryManagerPositionFilters,
    applyEntryManagerRecursionFilters,
    applyEntryManagerOutletFilters,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilters,
    applyEntryManagerCharacterFilterPresenceFilters,
    applyEntryManagerCharacterFilterValueFilters,
    getStrategyOptions,
    getPositionOptions,
    getOutletOptions,
    getAutomationIdOptions,
    getGroupOptions,
    getCharacterFilterPickerOptions,
    getStrategyValues,
    getPositionValues,
    getOutletValues,
    getAutomationIdValues,
    getGroupValues,
    filterIndicatorRefs,
  });

  const {
    element: bulkEditRowEl,
    refreshSelectionCount,
    cleanup,
  } = buildBulkEditRow({
    dom,
    entryManagerState,
    cache,
    saveWorldInfo,
    buildSavePayload,
    isEntryManagerRowSelected,
    setAllEntryManagerRowSelected,
    updateEntryManagerSelectAllButton,
    getEntryManagerRows,
    getStrategyOptions,
    applyEntryManagerStrategyFilterToRow,
    getPositionOptions,
    applyEntryManagerPositionFilterToRow,
    isOutletPosition,
    getOutletOptions,
    applyEntryManagerOutletFilterToRow,
    syncEntryManagerOutletFilters,
    filterIndicatorRefs,
    applyEntryManagerRecursionFilterToRow,
    debounce,
  });
  cleanupBulkEditRowRef.current = cleanup;

  return {
    displayToolbarEl,
    bulkEditRowEl,
    refreshDisplayToolbar,
    refreshSelectionCount,
    filterIndicatorRefs,
  };
};

const setActiveEntryManagerTab = ({ tabButtons, tabPanels, tabId }) => {
  for (const tabButtonEl of tabButtons) {
    const isActive = tabButtonEl.dataset.tabId === tabId;
    tabButtonEl.classList.toggle('active', isActive);
    tabButtonEl.setAttribute('aria-selected', isActive ? 'true' : 'false');
  }
  for (const tabPanelEl of tabPanels) {
    tabPanelEl.classList.toggle('active', tabPanelEl.dataset.tabId === tabId);
  }
};

export const buildEntryManagerTabs = ({ displayToolbarEl, bulkEditRowEl }) => {
  const panelTabs = [
    { id: TAB_ID_DISPLAY, icon: 'fa-eye', label: 'Display' },
    { id: TAB_ID_BULK_EDITOR, icon: 'fa-table-list', label: 'Bulk Editor' },
  ];

  const iconTab = document.createElement('div');
  iconTab.classList.add('stwid--icon-tab');

  const iconTabBar = document.createElement('div');
  iconTabBar.classList.add('stwid--icon-tab__bar');
  iconTabBar.setAttribute('role', 'tablist');
  iconTabBar.setAttribute('aria-label', 'Entry Manager tabs');

  const tabButtons = [];
  const tabPanels = [];
  const tabPanelsById = new Map();

  for (const tab of panelTabs) {
    const tabButtonEl = document.createElement('button');
    tabButtonEl.type = 'button';
    tabButtonEl.classList.add('stwid--icon-tab__button');
    tabButtonEl.dataset.tabId = tab.id;
    tabButtonEl.setAttribute('role', 'tab');
    tabButtonEl.setAttribute('aria-selected', 'false');
    tabButtonEl.title = `${tab.label} tab`;

    const tabIconEl = document.createElement('i');
    tabIconEl.classList.add('fa-solid', 'fa-fw', tab.icon);
    tabButtonEl.append(tabIconEl);

    const tabLabelEl = document.createElement('span');
    tabLabelEl.textContent = tab.label;
    tabButtonEl.append(tabLabelEl);

    tabButtons.push(tabButtonEl);
    iconTabBar.append(tabButtonEl);

    const tabPanelEl = document.createElement('div');
    tabPanelEl.classList.add('stwid--icon-tab__content');
    tabPanelEl.dataset.tabId = tab.id;
    tabPanelEl.setAttribute('role', 'tabpanel');
    tabPanels.push(tabPanelEl);
    tabPanelsById.set(tab.id, tabPanelEl);
    iconTab.append(tabPanelEl);

    tabButtonEl.addEventListener('click', () =>
      setActiveEntryManagerTab({ tabButtons, tabPanels, tabId: tab.id }),
    );
  }

  tabPanelsById.get(TAB_ID_DISPLAY)?.append(displayToolbarEl);
  tabPanelsById.get(TAB_ID_BULK_EDITOR)?.append(bulkEditRowEl);

  iconTab.prepend(iconTabBar);
  setActiveEntryManagerTab({ tabButtons, tabPanels, tabId: TAB_ID_DISPLAY });
  return iconTab;
};

export const buildEntryManagerFilterPanel = ({
  dom,
  entryManagerState,
  getEntryManagerEntries,
  setEntryManagerRowFilterState,
  SlashCommandParser,
  debounce,
  hljs,
  isTrueBoolean,
}) =>
  buildFilterPanel({
    dom,
    entryManagerState,
    getEntryManagerEntries,
    setEntryManagerRowFilterState,
    SlashCommandParser,
    debounce,
    hljs,
    isTrueBoolean,
  });

export const buildEntryManagerTable = async ({
  entries,
  entryManagerState,
  dom,
  cache,
  isOutletPosition,
  saveWorldInfo,
  buildSavePayload,
  focusWorldEntry,
  isEntryManagerRowSelected,
  setEntryManagerRowSelected,
  updateEntryManagerSelectAllButton,
  refreshSelectionCount,
  setEntryManagerRowFilterState,
  applyEntryManagerStrategyFilterToRow,
  applyEntryManagerPositionFilterToRow,
  applyEntryManagerRecursionFilterToRow,
  applyEntryManagerStrategyFilters,
  applyEntryManagerPositionFilters,
  applyEntryManagerRecursionFilters,
  applyEntryManagerOutletFilters,
  applyEntryManagerAutomationIdFilters,
  applyEntryManagerGroupFilters,
  applyEntryManagerCharacterFilterPresenceFilters,
  applyEntryManagerCharacterFilterValueFilters,
  syncEntryManagerOutletFilters,
  syncEntryManagerAutomationIdFilters,
  syncEntryManagerGroupFilters,
  getEditorPanelApi,
  entryState,
  getEntryManagerRows,
  setEntryManagerSort,
  SORT,
  SORT_DIRECTION,
  getSortableDelay,
  $,
  normalizeStrategyFilters,
  normalizePositionFilters,
  normalizeOutletFilters,
  normalizeAutomationIdFilters,
  normalizeGroupFilters,
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
  refreshDisplayToolbar,
  filterIndicatorRefs,
}) => {
  const {
    thead,
    refreshStrategyFilterIndicator,
    refreshPositionFilterIndicator,
    refreshRecursionFilterIndicator,
    refreshOutletFilterIndicator,
    refreshAutomationIdFilterIndicator,
    refreshGroupFilterIndicator,
    refreshCharacterFilterPresenceIndicator,
    refreshCharacterFilterValueIndicator,
  } = buildTableHeader({
    entryManagerState,
    applyEntryManagerStrategyFilters,
    applyEntryManagerPositionFilters,
    applyEntryManagerRecursionFilters,
    applyEntryManagerOutletFilters,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilters,
    normalizeStrategyFilters,
    normalizePositionFilters,
    normalizeOutletFilters,
    normalizeAutomationIdFilters,
    normalizeGroupFilters,
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
    applyEntryManagerCharacterFilterPresenceFilters,
    applyEntryManagerCharacterFilterValueFilters,
    getCharacterFilterPickerOptions,
    onFilterChange: () => {
      refreshDisplayToolbar();
      refreshSelectionCount();
    },
  });

  filterIndicatorRefs.strategy = refreshStrategyFilterIndicator;
  filterIndicatorRefs.position = refreshPositionFilterIndicator;
  filterIndicatorRefs.recursion = refreshRecursionFilterIndicator;
  filterIndicatorRefs.outlet = refreshOutletFilterIndicator;
  filterIndicatorRefs.automationId = refreshAutomationIdFilterIndicator;
  filterIndicatorRefs.group = refreshGroupFilterIndicator;
  filterIndicatorRefs.characterFilterPresence = refreshCharacterFilterPresenceIndicator;
  filterIndicatorRefs.characterFilterValue = refreshCharacterFilterValueIndicator;

  const tbody = await buildTableBody({
    entries,
    entryManagerState,
    dom,
    cache,
    refreshOutletFilterIndicator,
    refreshAutomationIdFilterIndicator,
    refreshGroupFilterIndicator,
    isOutletPosition,
    saveWorldInfo,
    buildSavePayload,
    focusWorldEntry,
    isEntryManagerRowSelected,
    setEntryManagerRowSelected,
    updateEntryManagerSelectAllButton,
    refreshSelectionCount,
    setEntryManagerRowFilterState,
    applyEntryManagerStrategyFilterToRow,
    applyEntryManagerPositionFilterToRow,
    applyEntryManagerRecursionFilterToRow,
    applyEntryManagerStrategyFilters,
    applyEntryManagerRecursionFilters,
    applyEntryManagerOutletFilters,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilters,
    applyEntryManagerCharacterFilterPresenceFilters,
    applyEntryManagerCharacterFilterValueFilters,
    syncEntryManagerOutletFilters,
    syncEntryManagerAutomationIdFilters,
    syncEntryManagerGroupFilters,
    getEditorPanelApi,
    entryState,
    getEntryManagerRows,
    setEntryManagerSort,
    SORT,
    SORT_DIRECTION,
    getSortableDelay,
    $,
  });

  const orderTableEl = document.createElement('table');
  orderTableEl.classList.add('stwid--order-table');
  orderTableEl.append(thead, tbody);

  const orderTableWrapEl = document.createElement('div');
  orderTableWrapEl.classList.add('stwid--order-table-wrap');
  orderTableWrapEl.append(orderTableEl);

  return orderTableWrapEl;
};
