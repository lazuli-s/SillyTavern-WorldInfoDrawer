import { buildDisplayToolbar } from '../display-tab/display-tab.display-toolbar.js';
import { buildBulkEditRow } from './bulk-edit-row.js';
import { buildFilterPanel }  from '../table/table.filter-panel.js';
import { buildTableHeader }  from '../table/table.header.js';
import { buildTableBody }    from '../table/table.body.js';

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
    
    let cleanupBulkEditRow = null;

    const renderEntryManager = async (book = null)=>{
        if (typeof cleanupBulkEditRow === 'function') {
            cleanupBulkEditRow();
            cleanupBulkEditRow = null;
        }

        
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

        if (entryManagerState.sort === SORT.CUSTOM) {
            const updatedBooks = ensureCustomDisplayIndex(book);
            try {
                for (const bookName of updatedBooks) {
                    await saveWorldInfo(bookName, buildSavePayload(bookName), true);
                }
            } catch (err) {
                console.error('[STWID] Failed to save custom display index:', err);
                toastr.error('Failed to save custom sort order. Check console for details.');
            }
        }
        const entries = getEntryManagerEntries(book);

        
        const body = document.createElement('div');
        body.classList.add('stwid--entryManager');
        body.classList.toggle('stwid--hideKeys', entryManagerState.hideKeys);
        applyEntryManagerColumnVisibility(body);

        

        const filterIndicatorRefs = {};

        const { element: displayToolbarEl, refresh: refreshDisplayToolbar } = buildDisplayToolbar({
            body,
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
        cleanupBulkEditRow = cleanup;

        const entryManagerTabs = (() => {
            const panelTabs = [
                { id:'display', icon:'fa-eye', label:'Display' },
                { id:'bulk-editor', icon:'fa-table-list', label:'Bulk Editor' },
            ];

            const iconTab = document.createElement('div');
            iconTab.classList.add('stwid--iconTab');

            const iconTabBar = document.createElement('div');
            iconTabBar.classList.add('stwid--iconTabBar');
            iconTabBar.setAttribute('role', 'tablist');
            iconTabBar.setAttribute('aria-label', 'Entry Manager tabs');

            const tabButtons = [];
            const tabContents = [];
            const tabContentsById = new Map();

            const setActiveTab = (tabId)=>{
                for (const button of tabButtons) {
                    const isActive = button.dataset.tabId === tabId;
                    button.classList.toggle('active', isActive);
                    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
                }
                for (const content of tabContents) {
                    content.classList.toggle('active', content.dataset.tabId === tabId);
                }
            };

            for (const tab of panelTabs) {
                const button = document.createElement('button');
                button.type = 'button';
                button.classList.add('stwid--iconTabButton');
                button.dataset.tabId = tab.id;
                button.setAttribute('role', 'tab');
                button.setAttribute('aria-selected', 'false');
                button.title = `${tab.label} tab`;
                const icon = document.createElement('i');
                icon.classList.add('fa-solid', 'fa-fw', tab.icon);
                button.append(icon);
                const text = document.createElement('span');
                text.textContent = tab.label;
                button.append(text);
                tabButtons.push(button);
                iconTabBar.append(button);

                const content = document.createElement('div');
                content.classList.add('stwid--iconTabContent');
                content.dataset.tabId = tab.id;
                content.setAttribute('role', 'tabpanel');
                tabContents.push(content);
                tabContentsById.set(tab.id, content);
                iconTab.append(content);

                button.addEventListener('click', ()=>setActiveTab(tab.id));
            }

            tabContentsById.get('display')?.append(displayToolbarEl);
            tabContentsById.get('bulk-editor')?.append(bulkEditRowEl);

            iconTab.prepend(iconTabBar);
            setActiveTab('display');
            return iconTab;
        })();

        const filterEl = buildFilterPanel({
            dom,
            entryManagerState,
            getEntryManagerEntries,
            setEntryManagerRowFilterState,
            SlashCommandParser,
            debounce,
            hljs,
            isTrueBoolean,
        });

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
            onFilterChange: ()=>{ refreshDisplayToolbar(); refreshSelectionCount(); },
        });

        
        
        filterIndicatorRefs.strategy     = refreshStrategyFilterIndicator;
        filterIndicatorRefs.position     = refreshPositionFilterIndicator;
        filterIndicatorRefs.recursion    = refreshRecursionFilterIndicator;
        filterIndicatorRefs.outlet       = refreshOutletFilterIndicator;
        filterIndicatorRefs.automationId = refreshAutomationIdFilterIndicator;
        filterIndicatorRefs.group        = refreshGroupFilterIndicator;

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

        
        const tbl = document.createElement('table');
        tbl.classList.add('stwid--orderTable');
        tbl.append(thead, tbody);

        const wrap = document.createElement('div');
        wrap.classList.add('stwid--orderTableWrap');
        wrap.append(tbl);

        
        refreshDisplayToolbar();
        refreshSelectionCount();

        body.append(entryManagerTabs, filterEl, wrap);

        
        dom.editor.append(body);
    };

    return { renderEntryManager };
};

export { createEntryManagerRenderer };
