import {
    ORDER_HELPER_COLUMNS_STORAGE_KEY,
    ORDER_HELPER_DEFAULT_COLUMNS,
    ORDER_HELPER_HIDE_KEYS_STORAGE_KEY,
    ORDER_HELPER_SORT_STORAGE_KEY,
    createOrderHelperState,
    getPositionOptions,
    getPositionValues,
    getStrategyOptions,
    getStrategyValues,
} from './logic/logic.state.js';
import { createOrderHelperFilters } from './logic/logic.filters.js';
import { createOrderHelperRenderer } from './bulk-editor/bulk-editor.js';

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
    const orderHelperState = createOrderHelperState({ SORT, SORT_DIRECTION });
    const OUTLET_NONE_VALUE = '';
    const AUTOMATION_ID_NONE_VALUE = '';
    const GROUP_NONE_VALUE = '';
    let scopedBookNames = null;
    const normalizeScope = (scope)=>Array.isArray(scope) ? [...scope].sort() : null;
    const isSameScope = (a, b)=>{
        if (a === b) return true;
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        return a.every((name, index)=>name === b[index]);
    };

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

    const getOrderHelperSourceEntries = (book = orderHelperState.book)=>{
        const scopeSet = new Set(scopedBookNames ?? getSelectedWorldInfo());
        if (book) {
            if (!scopeSet.has(book) || !cache[book]) return [];
            return Object.values(cache[book].entries).map(it=>({ book, data:it }));
        }
        return Object.entries(cache)
            .filter(([name])=>scopeSet.has(name))
            .map(([name, data])=>Object.values(data.entries).map(it=>({ book:name, data:it })))
            .flat();
    };

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
            .map(([entryBook, entries])=>Object.values(entries).map(tr=>{
                    const uid = tr.getAttribute('data-uid');
                    if (!uid || !cache[entryBook] || !cache[entryBook].entries[uid]) return null;
                    return {
                        book: entryBook,
                        dom: tr,
                        data: cache[entryBook].entries[uid],
                    };
                }))
                .flat()
                .filter(Boolean)
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

    function buildDynamicOptions(entries, getValueFn, noneValue) {
        const values = new Set();
        for (const entry of entries) {
            const result = getValueFn(entry.data);
            if (Array.isArray(result)) {
                for (const v of result) values.add(v);
            } else {
                values.add(result);
            }
        }
        const labels = [...values].filter((v)=>v !== noneValue);
        labels.sort((a, b)=>a.localeCompare(b));
        return [
            { value: noneValue, label: '(none)' },
            ...labels.map((label)=>({ value: label, label })),
        ];
    }

    const getOutletOptions = (book = orderHelperState.book)=>
        buildDynamicOptions(getOrderHelperEntries(book), getOutletValueForEntry, OUTLET_NONE_VALUE);

    const getOutletValues = (book = orderHelperState.book)=>getOutletOptions(book).map((option)=>option.value);

    const getAutomationIdValueForEntry = (entry)=>{
        const automationId = entry?.automationId;
        if (automationId == null) return AUTOMATION_ID_NONE_VALUE;
        const normalized = String(automationId).trim();
        return normalized || AUTOMATION_ID_NONE_VALUE;
    };

    const getAutomationIdOptions = (book = orderHelperState.book)=>
        buildDynamicOptions(getOrderHelperEntries(book), getAutomationIdValueForEntry, AUTOMATION_ID_NONE_VALUE);

    const getAutomationIdValues = (book = orderHelperState.book)=>getAutomationIdOptions(book).map((option)=>option.value);

    const splitGroupValues = (value)=>String(value ?? '').split(/,\s*/).filter(Boolean);

    const getGroupValueForEntry = (entry)=>{
        const groupValue = entry?.group;
        if (groupValue == null) return [GROUP_NONE_VALUE];
        const groups = splitGroupValues(groupValue);
        return groups.length ? groups : [GROUP_NONE_VALUE];
    };

    const getGroupOptions = (book = orderHelperState.book)=>
        buildDynamicOptions(getOrderHelperEntries(book), getGroupValueForEntry, GROUP_NONE_VALUE);

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
        dom.order.selectAll.classList.toggle('stwid--state-active', allSelected);
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

    const openOrderHelper = (book = null, scope = null)=>{
        if (!dom.order.toggle) return;

        // Dirty guard: block opening if the entry editor has unsaved changes.
        // Protects all callers (toggle button, book-menu shortcut, etc.)
        // without requiring each call site to implement its own check.
        const currentEditor = getCurrentEditor?.();
        const dirty = Boolean(currentEditor && getEditorPanelApi()?.isDirty?.(currentEditor.name, currentEditor.uid));
        if (dirty) {
            toastr.warning('Unsaved edits detected. Save or discard changes before opening Entry Manager.');
            return;
        }

        // Ensure DOM-derived filter option lists (strategy/position) are loaded
        // at the time Order Helper is opened. These can be empty during early init
        // if SillyTavern templates are not yet present.
        syncOrderHelperStrategyFilters();
        syncOrderHelperPositionFilters();

        scopedBookNames = normalizeScope(scope);
        dom.order.toggle.classList.add('stwid--state-active');
        renderOrderHelper(book);
    };

    const refreshOrderHelperScope = (scope = null)=>{
        if (!dom.order.toggle?.classList.contains('stwid--state-active')) return;
        if (orderHelperState.book) return;
        const nextScope = normalizeScope(scope);
        if (isSameScope(scopedBookNames, nextScope)) return;
        scopedBookNames = nextScope;
        renderOrderHelper(null);
    };

    return { openOrderHelper, refreshOrderHelperScope };
};
