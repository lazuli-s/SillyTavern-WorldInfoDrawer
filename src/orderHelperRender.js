import { buildVisibilityRow, buildBulkEditRow } from './orderHelperRender.actionBar.js';
import { buildFilterPanel }  from './orderHelperRender.filterPanel.js';
import { buildTableHeader }  from './orderHelperRender.tableHeader.js';
import { buildTableBody }    from './orderHelperRender.tableBody.js';

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

    const renderOrderHelper = (book = null)=>{

        // ── Init ──────────────────────────────────────────────────────────────
        orderHelperState.book = book;

        // Sync filter option lists to the current book scope before building any UI.
        // This ensures header filter menus reflect the entries that will be rendered.
        syncOrderHelperStrategyFilters();
        syncOrderHelperPositionFilters();
        syncOrderHelperOutletFilters();
        syncOrderHelperAutomationIdFilters();
        syncOrderHelperGroupFilters();

        const editorPanelApi = getEditorPanelApi();
        editorPanelApi.resetEditorState();

        // Clear stale DOM refs so partial renders do not persist across reopens.
        dom.order.entries = {};
        dom.order.filter.root = undefined;
        dom.order.filter.preview = undefined;
        dom.order.tbody = undefined;

        if (orderHelperState.sort === SORT.CUSTOM) {
            const updatedBooks = ensureCustomDisplayIndex(book);
            for (const bookName of updatedBooks) {
                void saveWorldInfo(bookName, buildSavePayload(bookName), true);
            }
        }
        const entries = getOrderHelperEntries(book);

        // ── Body container ────────────────────────────────────────────────────
        const body = document.createElement('div');
        body.classList.add('stwid--orderHelper');
        body.classList.toggle('stwid--hideKeys', orderHelperState.hideKeys);
        applyOrderHelperColumnVisibility(body);

        // ── Section builders ──────────────────────────────────────────────────

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
        });

        const { element: bulkEditRowEl, refreshSelectionCount } = buildBulkEditRow({
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
            applyOrderHelperRecursionFilterToRow,
        });

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
            onFilterChange: ()=>refreshVisibilityRow(),
        });

        // Populate filterIndicatorRefs after tableHeader is built so chip X
        // handlers in buildVisibilityRow can call these at click time.
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

        // ── Assemble table ────────────────────────────────────────────────────
        const tbl = document.createElement('table');
        tbl.classList.add('stwid--orderTable');
        tbl.append(thead, tbody);

        const wrap = document.createElement('div');
        wrap.classList.add('stwid--orderTableWrap');
        wrap.append(tbl);

        // Initial counts after tbody is built.
        refreshVisibilityRow();
        refreshSelectionCount();

        body.append(visibilityRowEl, bulkEditRowEl, filterEl, wrap);

        // ── Mount ─────────────────────────────────────────────────────────────
        dom.editor.append(body);
    };

    return { renderOrderHelper };
};

export { createOrderHelperRenderer };
