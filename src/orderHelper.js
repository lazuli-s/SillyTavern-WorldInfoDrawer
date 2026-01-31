import {
    ORDER_HELPER_COLUMN_WIDTHS_STORAGE_KEY,
    ORDER_HELPER_COLUMNS_STORAGE_KEY,
    ORDER_HELPER_HIDE_KEYS_STORAGE_KEY,
    ORDER_HELPER_SORT_STORAGE_KEY,
    createOrderHelperState,
    getPositionOptions,
    getPositionValues,
    getStrategyOptions,
    getStrategyValues,
} from './orderHelperState.js';
import { createOrderHelperFilters } from './orderHelperFilters.js';
import { createOrderHelperRenderer } from './orderHelperRender.js';

export const initOrderHelper = ({
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
    debounce,
    isTrueBoolean,
    SlashCommandParser,
    getSortableDelay,
    entryState,
    isOutletPosition,
    hljs,
    $,
}) => {
    const orderHelperState = createOrderHelperState({ SORT, SORT_DIRECTION });
    const OUTLET_NONE_VALUE = '';
    const AUTOMATION_ID_NONE_VALUE = '';
    const GROUP_NONE_VALUE = '';

    const getEntryDisplayIndex = (entry)=>{
        const displayIndex = Number(entry?.extensions?.display_index);
        return Number.isFinite(displayIndex) ? displayIndex : null;
    };

    const compareEntryUid = (a, b)=>{
        const auid = Number(a.uid);
        const buid = Number(b.uid);
        if (Number.isFinite(auid) && Number.isFinite(buid) && auid !== buid) return auid - buid;
        return String(a.uid).localeCompare(String(b.uid));
    };

    const getOrderHelperSourceEntries = (book = orderHelperState.book)=>Object.entries(cache)
        .filter(([name])=>getSelectedWorldInfo().includes(name))
        .map(([name,data])=>Object.values(data.entries).map(it=>({ book:name, data:it })))
        .flat()
        .filter((entry)=>!book || entry.book === book);

    const ensureCustomDisplayIndex = (book = orderHelperState.book)=>{
        const source = getOrderHelperSourceEntries(book);
        const entriesByBook = new Map();
        for (const entry of source) {
            if (!entriesByBook.has(entry.book)) {
                entriesByBook.set(entry.book, []);
            }
            entriesByBook.get(entry.book).push(entry.data);
        }
        const updatedBooks = new Set();
        for (const [bookName, entries] of entriesByBook.entries()) {
            let maxIndex = -1;
            for (const entry of entries) {
                const displayIndex = getEntryDisplayIndex(entry);
                if (Number.isFinite(displayIndex)) {
                    maxIndex = Math.max(maxIndex, displayIndex);
                }
            }
            let nextIndex = maxIndex + 1;
            const missing = entries
                .filter((entry)=>!Number.isFinite(getEntryDisplayIndex(entry)))
                .sort(compareEntryUid);
            for (const entry of missing) {
                entry.extensions ??= {};
                entry.extensions.display_index = nextIndex;
                nextIndex += 1;
                updatedBooks.add(bookName);
            }
        }
        return [...updatedBooks];
    };

    const getOrderHelperEntries = (book = orderHelperState.book, includeDom = false)=>{
        const source = includeDom && dom.order.entries && dom.order.tbody
            ? Object.entries(dom.order.entries)
                .map(([entryBook, entries])=>Object.values(entries).map(tr=>({
                    book: entryBook,
                    dom: tr,
                    data: cache[entryBook].entries[tr.getAttribute('data-uid')],
                })))
                .flat()
            : getOrderHelperSourceEntries(book);
        return sortEntries(source, orderHelperState.sort, orderHelperState.direction)
            .filter((entry)=>!book || entry.book === book);
    };

    const getOutletValueForEntry = (entry)=>{
        if (!isOutletPosition(entry?.position)) {
            return OUTLET_NONE_VALUE;
        }
        const outletName = entry?.outletName;
        if (outletName == null) return OUTLET_NONE_VALUE;
        const normalized = String(outletName).trim();
        return normalized || OUTLET_NONE_VALUE;
    };

    const getOutletOptions = (book = orderHelperState.book)=>{
        const entries = getOrderHelperEntries(book);
        const values = new Set();
        for (const entry of entries) {
            values.add(getOutletValueForEntry(entry.data));
        }
        const labels = [...values].filter((value)=>value !== OUTLET_NONE_VALUE);
        labels.sort((a, b)=>a.localeCompare(b));
        return [
            { value: OUTLET_NONE_VALUE, label: '(none)' },
            ...labels.map((label)=>({ value: label, label })),
        ];
    };

    const getOutletValues = (book = orderHelperState.book)=>getOutletOptions(book).map((option)=>option.value);

    const getAutomationIdValueForEntry = (entry)=>{
        const automationId = entry?.automationId;
        if (automationId == null) return AUTOMATION_ID_NONE_VALUE;
        const normalized = String(automationId).trim();
        return normalized || AUTOMATION_ID_NONE_VALUE;
    };

    const getAutomationIdOptions = (book = orderHelperState.book)=>{
        const entries = getOrderHelperEntries(book);
        const values = new Set();
        for (const entry of entries) {
            values.add(getAutomationIdValueForEntry(entry.data));
        }
        const labels = [...values].filter((value)=>value !== AUTOMATION_ID_NONE_VALUE);
        labels.sort((a, b)=>a.localeCompare(b));
        return [
            { value: AUTOMATION_ID_NONE_VALUE, label: '(none)' },
            ...labels.map((label)=>({ value: label, label })),
        ];
    };

    const getAutomationIdValues = (book = orderHelperState.book)=>getAutomationIdOptions(book).map((option)=>option.value);

    const splitGroupValues = (value)=>String(value ?? '').split(/,\s*/).filter(Boolean);

    const getGroupValueForEntry = (entry)=>{
        const groupValue = entry?.group;
        if (groupValue == null) return [GROUP_NONE_VALUE];
        const groups = splitGroupValues(groupValue);
        return groups.length ? groups : [GROUP_NONE_VALUE];
    };

    const getGroupOptions = (book = orderHelperState.book)=>{
        const entries = getOrderHelperEntries(book);
        const values = new Set();
        for (const entry of entries) {
            for (const value of getGroupValueForEntry(entry.data)) {
                values.add(value);
            }
        }
        const labels = [...values].filter((value)=>value !== GROUP_NONE_VALUE);
        labels.sort((a, b)=>a.localeCompare(b));
        return [
            { value: GROUP_NONE_VALUE, label: '(none)' },
            ...labels.map((label)=>({ value: label, label })),
        ];
    };

    const getGroupValues = (book = orderHelperState.book)=>getGroupOptions(book).map((option)=>option.value);

    const updateOrderHelperPreview = (entries)=>{
        if (!dom.order.filter.preview) return;
        const previewEntry = entries[0];
        if (!previewEntry) {
            dom.order.filter.preview.textContent = '';
            return;
        }
        dom.order.filter.preview.textContent = JSON.stringify(Object.assign({ book:previewEntry.book }, previewEntry.data), null, 2);
    };

    const getOrderHelperRows = ()=>[...(dom.order.tbody?.querySelectorAll('tr') ?? [])];

    const isOrderHelperRowSelected = (row)=>row?.classList.contains('stwid--applySelected');

    const setOrderHelperRowSelected = (row, selected)=>{
        if (!row) return;
        row.classList.toggle('stwid--applySelected', selected);
        row.setAttribute('aria-selected', selected ? 'true' : 'false');
        const icon = row.querySelector('.stwid--orderSelect .stwid--icon');
        if (icon) {
            icon.classList.toggle('fa-square', !selected);
            icon.classList.toggle('fa-square-check', selected);
        }
    };

    const setAllOrderHelperRowSelected = (selected)=>{
        for (const row of getOrderHelperRows()) {
            setOrderHelperRowSelected(row, selected);
        }
    };

    const updateOrderHelperSelectAllButton = ()=>{
        if (!dom.order.selectAll) return;
        const rows = getOrderHelperRows();
        const allSelected = rows.length > 0 && rows.every(isOrderHelperRowSelected);
        dom.order.selectAll.classList.toggle('stwid--active', allSelected);
        dom.order.selectAll.classList.toggle('fa-square-check', allSelected);
        dom.order.selectAll.classList.toggle('fa-square', !allSelected);
    };

    const applyOrderHelperSortToDom = ()=>{
        if (!dom.order.tbody) return;
        const entries = getOrderHelperEntries(orderHelperState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            if (row) {
                dom.order.tbody.append(row);
            }
        }
        updateOrderHelperPreview(entries);
    };

    const setOrderHelperSort = (sort, direction)=>{
        orderHelperState.sort = sort;
        orderHelperState.direction = direction;
        const value = JSON.stringify({ sort, direction });
        localStorage.setItem(ORDER_HELPER_SORT_STORAGE_KEY, value);
        if (dom.order.sortSelect) {
            dom.order.sortSelect.value = value;
        }
    };

    const applyOrderHelperColumnVisibility = (root)=>{
        if (!root) return;
        for (const [key, visible] of Object.entries(orderHelperState.columns)) {
            root.classList.toggle(`stwid--hide-col-${key}`, !visible);
        }
    };

    const {
        applyOrderHelperRecursionFilterToRow,
        applyOrderHelperRecursionFilters,
        applyOrderHelperPositionFilterToRow,
        applyOrderHelperPositionFilters,
        applyOrderHelperStrategyFilterToRow,
        applyOrderHelperStrategyFilters,
        applyOrderHelperOutletFilterToRow,
        applyOrderHelperOutletFilters,
        applyOrderHelperAutomationIdFilterToRow,
        applyOrderHelperAutomationIdFilters,
        applyOrderHelperGroupFilterToRow,
        applyOrderHelperGroupFilters,
        clearOrderHelperScriptFilters,
        normalizePositionFilters,
        normalizeStrategyFilters,
        normalizeOutletFilters,
        normalizeAutomationIdFilters,
        normalizeGroupFilters,
        setOrderHelperRowFilterState,
        syncOrderHelperOutletFilters,
        syncOrderHelperAutomationIdFilters,
        syncOrderHelperGroupFilters,
        syncOrderHelperPositionFilters,
        syncOrderHelperStrategyFilters,
    } = createOrderHelperFilters({
        dom,
        orderHelperState,
        entryState,
        getOrderHelperEntries,
        getStrategyValues,
        getPositionValues,
        getOutletValues,
        getOutletValue: getOutletValueForEntry,
        getAutomationIdValues,
        getAutomationIdValue: getAutomationIdValueForEntry,
        getGroupValues,
        getGroupValue: getGroupValueForEntry,
    });

    const focusWorldEntry = (book, uid)=>{
        const entryDom = cache?.[book]?.dom?.entry?.[uid]?.root;
        if (!entryDom) return;
        const listPanelApi = getListPanelApi();
        listPanelApi.setBookCollapsed(book, false);
        entryDom.scrollIntoView({ behavior:'smooth', block:'center' });
        entryDom.click();
    };

    const { renderOrderHelper } = createOrderHelperRenderer({
        dom,
        cache,
        orderHelperState,
        ORDER_HELPER_COLUMN_WIDTHS_STORAGE_KEY,
        ORDER_HELPER_COLUMNS_STORAGE_KEY,
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
        applyOrderHelperOutletFilterToRow,
        applyOrderHelperOutletFilters,
        applyOrderHelperAutomationIdFilterToRow,
        applyOrderHelperAutomationIdFilters,
        applyOrderHelperGroupFilterToRow,
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
    });

    const openOrderHelper = (book = null)=>{
        if (!dom.order.toggle) return;
        dom.order.toggle.classList.add('stwid--active');
        renderOrderHelper(book);
    };

    return { openOrderHelper };
};
