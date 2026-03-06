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
import { createEntryManagerRenderer } from './bulk-editor-tab/bulk-editor-tab.js';

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
    const entryManagerState = createEntryManagerState({ SORT, SORT_DIRECTION });
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

    const getEntryManagerSourceEntries = (book = entryManagerState.book)=>{
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

    const ensureCustomDisplayIndex = (book = entryManagerState.book)=>{
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

    const getEntryManagerEntries = (book = entryManagerState.book, includeDom = false)=>{
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
            : getEntryManagerSourceEntries(book);
        return sortEntries(source, entryManagerState.sort, entryManagerState.direction)
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

    const getOutletOptions = (book = entryManagerState.book)=>
        buildDynamicOptions(getEntryManagerEntries(book), getOutletValueForEntry, OUTLET_NONE_VALUE);

    const getOutletValues = (book = entryManagerState.book)=>getOutletOptions(book).map((option)=>option.value);

    const getAutomationIdValueForEntry = (entry)=>{
        const automationId = entry?.automationId;
        if (automationId == null) return AUTOMATION_ID_NONE_VALUE;
        const normalized = String(automationId).trim();
        return normalized || AUTOMATION_ID_NONE_VALUE;
    };

    const getAutomationIdOptions = (book = entryManagerState.book)=>
        buildDynamicOptions(getEntryManagerEntries(book), getAutomationIdValueForEntry, AUTOMATION_ID_NONE_VALUE);

    const getAutomationIdValues = (book = entryManagerState.book)=>getAutomationIdOptions(book).map((option)=>option.value);

    const splitGroupValues = (value)=>String(value ?? '').split(/,\s*/).filter(Boolean);

    const getGroupValueForEntry = (entry)=>{
        const groupValue = entry?.group;
        if (groupValue == null) return [GROUP_NONE_VALUE];
        const groups = splitGroupValues(groupValue);
        return groups.length ? groups : [GROUP_NONE_VALUE];
    };

    const getGroupOptions = (book = entryManagerState.book)=>
        buildDynamicOptions(getEntryManagerEntries(book), getGroupValueForEntry, GROUP_NONE_VALUE);

    const getGroupValues = (book = entryManagerState.book)=>getGroupOptions(book).map((option)=>option.value);

    const updateEntryManagerPreview = (entries)=>{
        if (!dom.order.filter.preview) return;
        const previewEntry = entries[0];
        if (!previewEntry) {
            dom.order.filter.preview.textContent = '';
            return;
        }
        dom.order.filter.preview.textContent = JSON.stringify(Object.assign({ book:previewEntry.book }, previewEntry.data), null, 2);
    };

    const getEntryManagerRows = ()=>[...(dom.order.tbody?.querySelectorAll('tr') ?? [])];

    const isEntryManagerRowSelected = (row)=>row?.classList.contains('stwid--applySelected');

    const setEntryManagerRowSelected = (row, selected)=>{
        if (!row) return;
        row.classList.toggle('stwid--applySelected', selected);
        row.setAttribute('aria-selected', selected ? 'true' : 'false');
        const icon = row.querySelector('.stwid--orderSelect .stwid--icon');
        if (icon) {
            icon.classList.toggle('fa-square', !selected);
            icon.classList.toggle('fa-square-check', selected);
        }
    };

    const setAllEntryManagerRowSelected = (selected)=>{
        for (const row of getEntryManagerRows()) {
            setEntryManagerRowSelected(row, selected);
        }
    };

    const updateEntryManagerSelectAllButton = ()=>{
        if (!dom.order.selectAll) return;
        const rows = getEntryManagerRows();
        const allSelected = rows.length > 0 && rows.every(isEntryManagerRowSelected);
        dom.order.selectAll.classList.toggle('stwid--state-active', allSelected);
        dom.order.selectAll.classList.toggle('fa-square-check', allSelected);
        dom.order.selectAll.classList.toggle('fa-square', !allSelected);
    };

    const applyEntryManagerSortToDom = ()=>{
        if (!dom.order.tbody) return;
        const entries = getEntryManagerEntries(entryManagerState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            if (row) {
                dom.order.tbody.append(row);
            }
        }
        updateEntryManagerPreview(entries);
    };

    const setEntryManagerSort = (sort, direction)=>{
        entryManagerState.sort = sort;
        entryManagerState.direction = direction;
        const value = JSON.stringify({ sort, direction });
        localStorage.setItem(ENTRY_MANAGER_SORT_STORAGE_KEY, value);
        if (dom.order.sortSelect) {
            dom.order.sortSelect.value = value;
        }
    };

    const applyEntryManagerColumnVisibility = (root)=>{
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
    } = createEntryManagerFilters({
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
    });

    const focusWorldEntry = (book, uid)=>{
        const entryDom = cache?.[book]?.dom?.entry?.[uid]?.root;
        if (!entryDom) return;
        const listPanelApi = getListPanelApi();
        listPanelApi.setBookCollapsed(book, false);
        entryDom.scrollIntoView({ behavior:'smooth', block:'center' });
        entryDom.click();
    };

    const { renderEntryManager } = createEntryManagerRenderer({
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

    const openEntryManager = (book = null, scope = null)=>{
        if (!dom.order.toggle) return;

        
        
        
        const currentEditor = getCurrentEditor?.();
        const dirty = Boolean(currentEditor && getEditorPanelApi()?.isDirty?.(currentEditor.name, currentEditor.uid));
        if (dirty) {
            toastr.warning('Unsaved edits detected. Save or discard changes before opening Entry Manager.');
            return;
        }

        
        
        
        syncEntryManagerStrategyFilters();
        syncEntryManagerPositionFilters();

        scopedBookNames = normalizeScope(scope);
        dom.order.toggle.classList.add('stwid--state-active');
        renderEntryManager(book);
    };

    const refreshEntryManagerScope = (scope = null)=>{
        if (!dom.order.toggle?.classList.contains('stwid--state-active')) return;
        if (entryManagerState.book) return;
        const nextScope = normalizeScope(scope);
        if (isSameScope(scopedBookNames, nextScope)) return;
        scopedBookNames = nextScope;
        renderEntryManager(null);
    };

    return { openEntryManager, refreshEntryManagerScope };
};
