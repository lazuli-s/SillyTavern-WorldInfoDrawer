import { buildDisplayToolbar } from '../display-tab/display-tab.display-toolbar.js';
import { buildBulkEditRow } from './bulk-edit-row.js';
import { buildFilterPanel }  from '../table/table.filter-panel.js';
import { buildTableHeader }  from '../table/table.header.js';
import { buildTableBody }    from '../table/table.body.js';

const TAB_ID_DISPLAY = 'display';
const TAB_ID_BULK_EDITOR = 'bulk-editor';

const resetBulkEditRow = (cleanupBulkEditRowRef) => {
    if (typeof cleanupBulkEditRowRef.current === 'function') {
        cleanupBulkEditRowRef.current();
        cleanupBulkEditRowRef.current = null;
    }
};

const resetEntryManagerStateForRender = ({
    book,
    entryManagerState,
    dom,
    syncEntryManagerStrategyFilters,
    syncEntryManagerPositionFilters,
    syncEntryManagerOutletFilters,
    syncEntryManagerAutomationIdFilters,
    syncEntryManagerGroupFilters,
    getEditorPanelApi,
}) => {
    entryManagerState.book = book;

    syncEntryManagerStrategyFilters();
    syncEntryManagerPositionFilters();
    syncEntryManagerOutletFilters();
    syncEntryManagerAutomationIdFilters();
    syncEntryManagerGroupFilters();

    const editorPanelApi = getEditorPanelApi();
    editorPanelApi.resetEditorState();

    dom.order.entries = {};
    dom.order.filter.root = undefined;
    dom.order.filter.preview = undefined;
    dom.order.tbody = undefined;
};

const saveCustomDisplayIndexForBooks = async ({ updatedBooks, saveWorldInfo, buildSavePayload }) => {
    for (const bookName of updatedBooks) {
        await saveWorldInfo(bookName, buildSavePayload(bookName), true);
    }
};

const persistCustomSortOrderIfNeeded = async ({
    book,
    entryManagerState,
    SORT,
    ensureCustomDisplayIndex,
    saveWorldInfo,
    buildSavePayload,
}) => {
    if (entryManagerState.sort !== SORT.CUSTOM) return;

    const updatedBooks = ensureCustomDisplayIndex(book);
    try {
        await saveCustomDisplayIndexForBooks({
            updatedBooks,
            saveWorldInfo,
            buildSavePayload,
        });
    } catch (err) {
        console.error('[STWID] Failed to save custom display index:', err);
        toastr.error('Failed to save custom sort order. Check console for details.');
    }
};

const buildEntryManagerRootEl = ({ entryManagerState, applyEntryManagerColumnVisibility }) => {
    const entryManagerRootEl = document.createElement('div');
    entryManagerRootEl.classList.add('stwid--entryManager');
    entryManagerRootEl.classList.toggle('stwid--hideKeys', entryManagerState.hideKeys);
    applyEntryManagerColumnVisibility(entryManagerRootEl);
    return entryManagerRootEl;
};

const buildEntryManagerTopRows = ({
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
    getStrategyOptions,
    getPositionOptions,
    getOutletOptions,
    getAutomationIdOptions,
    getGroupOptions,
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
        getStrategyOptions,
        getPositionOptions,
        getOutletOptions,
        getAutomationIdOptions,
        getGroupOptions,
        getStrategyValues,
        getPositionValues,
        getOutletValues,
        getAutomationIdValues,
        getGroupValues,
        filterIndicatorRefs,
        initialCollapsed: false,
    });

    const { element: bulkEditRowEl, refreshSelectionCount, cleanup } = buildBulkEditRow({
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

const buildEntryManagerTabs = ({ displayToolbarEl, bulkEditRowEl }) => {
    const panelTabs = [
        { id: TAB_ID_DISPLAY, icon: 'fa-eye', label: 'Display' },
        { id: TAB_ID_BULK_EDITOR, icon: 'fa-table-list', label: 'Bulk Editor' },
    ];

    const iconTab = document.createElement('div');
    iconTab.classList.add('stwid--iconTab');

    const iconTabBar = document.createElement('div');
    iconTabBar.classList.add('stwid--iconTabBar');
    iconTabBar.setAttribute('role', 'tablist');
    iconTabBar.setAttribute('aria-label', 'Entry Manager tabs');

    const tabButtons = [];
    const tabPanels = [];
    const tabPanelsById = new Map();

    for (const tab of panelTabs) {
        const tabButtonEl = document.createElement('button');
        tabButtonEl.type = 'button';
        tabButtonEl.classList.add('stwid--iconTabButton');
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
        tabPanelEl.classList.add('stwid--iconTabContent');
        tabPanelEl.dataset.tabId = tab.id;
        tabPanelEl.setAttribute('role', 'tabpanel');
        tabPanels.push(tabPanelEl);
        tabPanelsById.set(tab.id, tabPanelEl);
        iconTab.append(tabPanelEl);

        tabButtonEl.addEventListener('click', () => setActiveEntryManagerTab({ tabButtons, tabPanels, tabId: tab.id }));
    }

    tabPanelsById.get(TAB_ID_DISPLAY)?.append(displayToolbarEl);
    tabPanelsById.get(TAB_ID_BULK_EDITOR)?.append(bulkEditRowEl);

    iconTab.prepend(iconTabBar);
    setActiveEntryManagerTab({ tabButtons, tabPanels, tabId: TAB_ID_DISPLAY });
    return iconTab;
};

const buildEntryManagerFilterPanel = ({
    dom,
    entryManagerState,
    getEntryManagerEntries,
    setEntryManagerRowFilterState,
    SlashCommandParser,
    debounce,
    hljs,
    isTrueBoolean,
}) => buildFilterPanel({
    dom,
    entryManagerState,
    getEntryManagerEntries,
    setEntryManagerRowFilterState,
    SlashCommandParser,
    debounce,
    hljs,
    isTrueBoolean,
});

const buildEntryManagerTable = ({
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
        onFilterChange: () => { refreshDisplayToolbar(); refreshSelectionCount(); },
    });

    filterIndicatorRefs.strategy = refreshStrategyFilterIndicator;
    filterIndicatorRefs.position = refreshPositionFilterIndicator;
    filterIndicatorRefs.recursion = refreshRecursionFilterIndicator;
    filterIndicatorRefs.outlet = refreshOutletFilterIndicator;
    filterIndicatorRefs.automationId = refreshAutomationIdFilterIndicator;
    filterIndicatorRefs.group = refreshGroupFilterIndicator;

    const tbody = buildTableBody({
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
    orderTableEl.classList.add('stwid--orderTable');
    orderTableEl.append(thead, tbody);

    const orderTableWrapEl = document.createElement('div');
    orderTableWrapEl.classList.add('stwid--orderTableWrap');
    orderTableWrapEl.append(orderTableEl);

    return orderTableWrapEl;
};

const renderEntryManager = async ({
    book = null,
    cleanupBulkEditRowRef,
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
    applyEntryManagerOutletFilters,
    applyEntryManagerOutletFilterToRow,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilters,
    setEntryManagerRowFilterState,
    syncEntryManagerStrategyFilters,
    syncEntryManagerPositionFilters,
    syncEntryManagerOutletFilters,
    syncEntryManagerAutomationIdFilters,
    syncEntryManagerGroupFilters,
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
}) => {
    resetBulkEditRow(cleanupBulkEditRowRef);

    resetEntryManagerStateForRender({
        book,
        entryManagerState,
        dom,
        syncEntryManagerStrategyFilters,
        syncEntryManagerPositionFilters,
        syncEntryManagerOutletFilters,
        syncEntryManagerAutomationIdFilters,
        syncEntryManagerGroupFilters,
        getEditorPanelApi,
    });

    await persistCustomSortOrderIfNeeded({
        book,
        entryManagerState,
        SORT,
        ensureCustomDisplayIndex,
        saveWorldInfo,
        buildSavePayload,
    });

    const entries = getEntryManagerEntries(book);
    const entryManagerRootEl = buildEntryManagerRootEl({
        entryManagerState,
        applyEntryManagerColumnVisibility,
    });

    const {
        displayToolbarEl,
        bulkEditRowEl,
        refreshDisplayToolbar,
        refreshSelectionCount,
        filterIndicatorRefs,
    } = buildEntryManagerTopRows({
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
        getStrategyOptions,
        getPositionOptions,
        getOutletOptions,
        getAutomationIdOptions,
        getGroupOptions,
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
    });

    const entryManagerTabs = buildEntryManagerTabs({ displayToolbarEl, bulkEditRowEl });
    const filterEl = buildEntryManagerFilterPanel({
        dom,
        entryManagerState,
        getEntryManagerEntries,
        setEntryManagerRowFilterState,
        SlashCommandParser,
        debounce,
        hljs,
        isTrueBoolean,
    });
    const orderTableWrapEl = buildEntryManagerTable({
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
        refreshDisplayToolbar,
        filterIndicatorRefs,
    });

    refreshDisplayToolbar();
    refreshSelectionCount();

    entryManagerRootEl.append(entryManagerTabs, filterEl, orderTableWrapEl);
    dom.editor.append(entryManagerRootEl);
};

const createEntryManagerRenderer = ({
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
    applyEntryManagerOutletFilters,
    applyEntryManagerOutletFilterToRow,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilters,
    setEntryManagerRowFilterState,
    syncEntryManagerStrategyFilters,
    syncEntryManagerPositionFilters,
    syncEntryManagerOutletFilters,
    syncEntryManagerAutomationIdFilters,
    syncEntryManagerGroupFilters,
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
}) => {
    const cleanupBulkEditRowRef = { current: null };

    const renderEntryManagerForBook = async (book = null) => renderEntryManager({
        book,
        cleanupBulkEditRowRef,
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
        applyEntryManagerOutletFilters,
        applyEntryManagerOutletFilterToRow,
        applyEntryManagerAutomationIdFilters,
        applyEntryManagerGroupFilters,
        setEntryManagerRowFilterState,
        syncEntryManagerStrategyFilters,
        syncEntryManagerPositionFilters,
        syncEntryManagerOutletFilters,
        syncEntryManagerAutomationIdFilters,
        syncEntryManagerGroupFilters,
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

    return { renderEntryManager: renderEntryManagerForBook };
};

export { createEntryManagerRenderer };
