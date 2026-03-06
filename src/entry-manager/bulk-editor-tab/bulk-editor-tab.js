import { buildVisibilityRow } from '../display-tab/visibility-row.js';
import { buildBulkEditRow } from './bulk-edit-row.js';
import { buildFilterPanel }  from '../table/filter-panel.js';
import { buildTableHeader }  from '../table/table-header.js';
import { buildTableBody }    from '../table/table-body.js';

const createOrderHelperRenderer = ({
    dom,
    cache,
    orderHelperState,
    ORDER_HELPER_COLUMNS_STORAGE_KEY,
    ORDER_HELPER_DEFAULT_COLUMNS,
    ORDER_HELPER_HIDE_KEYS_STORAGE_KEY,
    SORT,
    SORT_DIRECTION,
    appendSortOptions,
    ensureCustomDisplayIndex,
    saveWorldInfo,
    buildSavePayload,
    getOrderHelperEntries,
    applyOrderHelperSortToDom,
    updateOrderHelperPreview,
    clearOrderHelperScriptFilters,
    applyOrderHelperColumnVisibility,
    setOrderHelperSort,
    isOrderHelperRowSelected,
    setOrderHelperRowSelected,
    setAllOrderHelperRowSelected,
    updateOrderHelperSelectAllButton,
    applyOrderHelperStrategyFilters,
    applyOrderHelperStrategyFilterToRow,
    applyOrderHelperPositionFilterToRow,
    applyOrderHelperPositionFilters,
    applyOrderHelperRecursionFilterToRow,
    applyOrderHelperRecursionFilters,
    applyOrderHelperOutletFilters,
    applyOrderHelperOutletFilterToRow,
    applyOrderHelperAutomationIdFilters,
    applyOrderHelperGroupFilters,
    setOrderHelperRowFilterState,
    syncOrderHelperStrategyFilters,
    syncOrderHelperPositionFilters,
    syncOrderHelperOutletFilters,
    syncOrderHelperAutomationIdFilters,
    syncOrderHelperGroupFilters,
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
    getOrderHelperRows,
    SlashCommandParser,
    debounce,
    hljs,
    getSortableDelay,
    isTrueBoolean,
    $,
    getEditorPanelApi,
}) => {
    
    let cleanupBulkEditRow = null;

    const renderOrderHelper = async (book = null)=>{
        if (typeof cleanupBulkEditRow === 'function') {
            cleanupBulkEditRow();
            cleanupBulkEditRow = null;
        }

        
        orderHelperState.book = book;

        
        
        syncOrderHelperStrategyFilters();
        syncOrderHelperPositionFilters();
        syncOrderHelperOutletFilters();
        syncOrderHelperAutomationIdFilters();
        syncOrderHelperGroupFilters();

        const editorPanelApi = getEditorPanelApi();
        editorPanelApi.resetEditorState();

        
        dom.order.entries = {};
        dom.order.filter.root = undefined;
        dom.order.filter.preview = undefined;
        dom.order.tbody = undefined;

        if (orderHelperState.sort === SORT.CUSTOM) {
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
        const entries = getOrderHelperEntries(book);

        
        const body = document.createElement('div');
        body.classList.add('stwid--orderHelper');
        body.classList.toggle('stwid--hideKeys', orderHelperState.hideKeys);
        applyOrderHelperColumnVisibility(body);

        

        const filterIndicatorRefs = {};

        const { element: visibilityRowEl, refresh: refreshVisibilityRow } = buildVisibilityRow({
            body,
            orderHelperState,
            dom,
            ORDER_HELPER_HIDE_KEYS_STORAGE_KEY,
            ORDER_HELPER_COLUMNS_STORAGE_KEY,
            ORDER_HELPER_DEFAULT_COLUMNS,
            applyOrderHelperColumnVisibility,
            clearOrderHelperScriptFilters,
            setOrderHelperSort,
            applyOrderHelperSortToDom,
            ensureCustomDisplayIndex,
            saveWorldInfo,
            buildSavePayload,
            appendSortOptions,
            getOrderHelperEntries,
            updateOrderHelperPreview,
            SORT,
            SORT_DIRECTION,
            applyOrderHelperStrategyFilters,
            applyOrderHelperPositionFilters,
            applyOrderHelperRecursionFilters,
            applyOrderHelperOutletFilters,
            applyOrderHelperAutomationIdFilters,
            applyOrderHelperGroupFilters,
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
            orderHelperState,
            cache,
            saveWorldInfo,
            buildSavePayload,
            isOrderHelperRowSelected,
            setAllOrderHelperRowSelected,
            updateOrderHelperSelectAllButton,
            getOrderHelperRows,
            getStrategyOptions,
            applyOrderHelperStrategyFilterToRow,
            getPositionOptions,
            applyOrderHelperPositionFilterToRow,
            isOutletPosition,
            getOutletOptions,
            applyOrderHelperOutletFilterToRow,
            syncOrderHelperOutletFilters,
            filterIndicatorRefs,
            applyOrderHelperRecursionFilterToRow,
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

            tabContentsById.get('display')?.append(visibilityRowEl);
            tabContentsById.get('bulk-editor')?.append(bulkEditRowEl);

            iconTab.prepend(iconTabBar);
            setActiveTab('display');
            return iconTab;
        })();

        const filterEl = buildFilterPanel({
            dom,
            orderHelperState,
            getOrderHelperEntries,
            setOrderHelperRowFilterState,
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
            orderHelperState,
            applyOrderHelperStrategyFilters,
            applyOrderHelperPositionFilters,
            applyOrderHelperRecursionFilters,
            applyOrderHelperOutletFilters,
            applyOrderHelperAutomationIdFilters,
            applyOrderHelperGroupFilters,
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
            onFilterChange: ()=>{ refreshVisibilityRow(); refreshSelectionCount(); },
        });

        
        
        filterIndicatorRefs.strategy     = refreshStrategyFilterIndicator;
        filterIndicatorRefs.position     = refreshPositionFilterIndicator;
        filterIndicatorRefs.recursion    = refreshRecursionFilterIndicator;
        filterIndicatorRefs.outlet       = refreshOutletFilterIndicator;
        filterIndicatorRefs.automationId = refreshAutomationIdFilterIndicator;
        filterIndicatorRefs.group        = refreshGroupFilterIndicator;

        const tbody = buildTableBody({
            entries,
            orderHelperState,
            dom,
            cache,
            refreshOutletFilterIndicator,
            refreshAutomationIdFilterIndicator,
            refreshGroupFilterIndicator,
            isOutletPosition,
            saveWorldInfo,
            buildSavePayload,
            focusWorldEntry,
            isOrderHelperRowSelected,
            setOrderHelperRowSelected,
            updateOrderHelperSelectAllButton,
            refreshSelectionCount,
            setOrderHelperRowFilterState,
            applyOrderHelperStrategyFilterToRow,
            applyOrderHelperPositionFilterToRow,
            applyOrderHelperRecursionFilterToRow,
            applyOrderHelperStrategyFilters,
            applyOrderHelperRecursionFilters,
            applyOrderHelperOutletFilters,
            applyOrderHelperAutomationIdFilters,
            applyOrderHelperGroupFilters,
            syncOrderHelperOutletFilters,
            syncOrderHelperAutomationIdFilters,
            syncOrderHelperGroupFilters,
            getEditorPanelApi,
            entryState,
            getOrderHelperRows,
            setOrderHelperSort,
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

        
        refreshVisibilityRow();
        refreshSelectionCount();

        body.append(entryManagerTabs, filterEl, wrap);

        
        dom.editor.append(body);
    };

    return { renderOrderHelper };
};

export { createOrderHelperRenderer };
