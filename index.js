import { event_types, eventSource, getRequestHeaders } from '../../../../script.js';
import { AutoComplete } from '../../../autocomplete/AutoComplete.js';
import { extensionNames } from '../../../extensions.js';
import { Popup } from '../../../popup.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { renderTemplateAsync } from '../../../templates.js';
import { debounce, debounceAsync, delay, download, getSortableDelay, isTrueBoolean, uuidv4 } from '../../../utils.js';
import { createNewWorldInfo, createWorldInfoEntry, deleteWIOriginalDataValue, deleteWorldInfoEntry, getFreeWorldName, getWorldEntry, loadWorldInfo, onWorldInfoChange, saveWorldInfo, selected_world_info, world_info, world_names } from '../../../world-info.js';
import { Settings, SORT, SORT_DIRECTION } from './src/Settings.js';
import { entryState, renderEntry, setWorldEntryContext } from './src/worldEntry.js';
import { appendSortOptions, createDeferred, getSortLabel, safeToSorted } from './src/utils.js';

const NAME = new URL(import.meta.url).pathname.split('/').at(-2);
const watchCss = async()=>{
    if (new URL(import.meta.url).pathname.split('/').includes('reload')) return;
    try {
        const FilesPluginApi = (await import('../SillyTavern-FilesPluginApi/api.js')).FilesPluginApi;
        // watch CSS for changes
        const style = document.createElement('style');
        document.body.append(style);
        const path = [
            '~',
            'extensions',
            NAME,
            'style.css',
        ].join('/');
        const ev = await FilesPluginApi.watch(path);
        ev.addEventListener('message', async(/**@type {boolean}*/exists)=>{
            if (!exists) return;
            style.innerHTML = await (await FilesPluginApi.get(path)).text();
            document.querySelector(`#third-party_${NAME}-css`)?.remove();
        });
    } catch { /* empty */ }
};
watchCss();


const dom = {
    drawer: {
        /**@type {HTMLElement} */
        body: undefined,
    },
    /**@type {HTMLElement} */
    books: undefined,
    /**@type {HTMLElement} */
    editor: undefined,
    /**@type {HTMLButtonElement} */
    collapseAllToggle: undefined,
    /**@type {HTMLElement} */
    activationToggle: undefined,
    order: {
        /**@type {HTMLElement} */
        toggle: undefined,
        /**@type {HTMLInputElement} */
        start: undefined,
        /**@type {HTMLInputElement} */
        step: undefined,
        direction: {
            /**@type {HTMLInputElement} */
            up: undefined,
            /**@type {HTMLInputElement} */
            down: undefined,
        },
        filter: {
            /**@type {HTMLElement} */
            root: undefined,
            /**@type {HTMLElement} */
            preview: undefined,
        },
        /**@type {HTMLElement} */
        selectAll: undefined,
        /**@type {{[book:string]:{[uid:string]:HTMLElement}}} */
        entries: {},
        /**@type {HTMLElement} */
        tbody: undefined,
    },
};

const ORDER_HELPER_SORT_STORAGE_KEY = 'stwid--order-helper-sort';
const ORDER_HELPER_HIDE_KEYS_STORAGE_KEY = 'stwid--order-helper-hide-keys';
const executeSlashCommand = async(command)=>{
    try {
        const parser = new SlashCommandParser();
        const closure = parser.parse(command);
        await closure.execute();
    } catch (error) {
        console.error('Failed to execute slash command', error);
    }
};

const orderHelperState = (()=>{
    const state = { sort:SORT.TITLE, direction:SORT_DIRECTION.ASCENDING, book:null, hideKeys:false };
    try {
        const stored = JSON.parse(localStorage.getItem(ORDER_HELPER_SORT_STORAGE_KEY));
        if (Object.values(SORT).includes(stored?.sort) && Object.values(SORT_DIRECTION).includes(stored?.direction)) {
            state.sort = stored.sort;
            state.direction = stored.direction;
        }
    } catch { /* empty */ }
    try {
        state.hideKeys = localStorage.getItem(ORDER_HELPER_HIDE_KEYS_STORAGE_KEY) === 'true';
    } catch { /* empty */ }
    return state;
})();
const getOutletPositionValue = () => document.querySelector('#entry_edit_template [name="position"] option[data-i18n="Outlet"]')?.value;
const isOutletPosition = (position) => {
    const outletValue = getOutletPositionValue();
    if (outletValue === undefined) return false;
    return String(position) === String(outletValue);
};
/**@type {{name:string, uid:string}} */
let currentEditor;

const activationBlock = document.querySelector('#wiActivationSettings');
const activationBlockParent = activationBlock?.parentElement;

const sortEntries = (entries, sortLogic = null, sortDirection = null)=>{
    sortLogic ??= Settings.instance.sortLogic;
    sortDirection ??= Settings.instance.sortDirection;
    const x = (y)=>y.data ?? y;
    const normalizeString = (value)=>{
        if (value === undefined || value === null) return '';
        return String(value).toLowerCase();
    };
    const defaultTitle = (entry)=>entry.comment ?? (Array.isArray(entry.key) ? entry.key.join(', ') : '');
    const defaultCompare = (a,b)=>normalizeString(defaultTitle(x(a))).localeCompare(normalizeString(defaultTitle(x(b))));
    const stringSort = (getter)=>safeToSorted(entries, (a,b)=>{
        const av = normalizeString(getter(x(a)));
        const bv = normalizeString(getter(x(b)));
        const cmp = av.localeCompare(bv);
        if (cmp !== 0) return cmp;
        return defaultCompare(a, b);
    });
    const numericSort = (getter)=>{
        const direction = sortDirection == SORT_DIRECTION.DESCENDING ? -1 : 1;
        return safeToSorted(entries, (a,b)=>{
            const av = getter(x(a));
            const bv = getter(x(b));
            const hasA = Number.isFinite(av);
            const hasB = Number.isFinite(bv);
            if (hasA && hasB && av !== bv) return direction * (av - bv);
            if (hasA && !hasB) return -1;
            if (!hasA && hasB) return 1;
            return defaultCompare(a, b);
        });
    };

    let result = [...entries];
    let shouldReverse = false;
    switch (sortLogic) {
        case SORT.ALPHABETICAL:
        case SORT.TITLE: {
            shouldReverse = true;
            result = stringSort((entry)=>entry.comment ?? (Array.isArray(entry.key) ? entry.key.join(', ') : ''));
            break;
        }
        case SORT.TRIGGER: {
            shouldReverse = true;
            result = stringSort((entry)=>Array.isArray(entry.key) ? entry.key.join(', ') : '');
            break;
        }
        case SORT.PROMPT: {
            shouldReverse = true;
            result = safeToSorted(entries, (a,b)=>{
                if (x(a).position > x(b).position) return 1;
                if (x(a).position < x(b).position) return -1;
                if ((x(a).depth ?? Number.MAX_SAFE_INTEGER) < (x(b).depth ?? Number.MAX_SAFE_INTEGER)) return 1;
                if ((x(a).depth ?? Number.MAX_SAFE_INTEGER) > (x(b).depth ?? Number.MAX_SAFE_INTEGER)) return -1;
                if ((x(a).order ?? Number.MAX_SAFE_INTEGER) > (x(b).order ?? Number.MAX_SAFE_INTEGER)) return 1;
                if ((x(a).order ?? Number.MAX_SAFE_INTEGER) < (x(b).order ?? Number.MAX_SAFE_INTEGER)) return -1;
                return defaultCompare(a, b);
            });
            break;
        }
        case SORT.POSITION: {
            result = numericSort((entry)=>Number(entry.position));
            break;
        }
        case SORT.DEPTH: {
            result = numericSort((entry)=>Number(entry.depth));
            break;
        }
        case SORT.ORDER: {
            result = numericSort((entry)=>Number(entry.order));
            break;
        }
        case SORT.UID: {
            result = numericSort((entry)=>Number(entry.uid));
            break;
        }
        case SORT.LENGTH: {
            result = numericSort((entry)=>{
                if (typeof entry.content !== 'string') return null;
                return entry.content.split(/\s+/).filter(Boolean).length;
            });
            break;
        }
        default: {
            shouldReverse = true;
            result = stringSort((entry)=>defaultTitle(entry));
            break;
        }
    }
    if (shouldReverse && sortDirection == SORT_DIRECTION.DESCENDING) result.reverse();
    return result;
};

const cache = {};
const collapseStates = {};

const hasExpandedBooks = ()=>Object.values(cache).some((book)=>{
    const entryList = book?.dom?.entryList;
    return entryList && !entryList.classList.contains('stwid--isCollapsed');
});

const METADATA_NAMESPACE = 'stwid';
const METADATA_SORT_KEY = 'sort';
const cloneMetadata = (metadata)=>structuredClone(metadata ?? {});
const setCollapseState = (name, isCollapsed)=>{
    collapseStates[name] = Boolean(isCollapsed);
};
const updateCollapseAllToggle = ()=>{
    const hasExpanded = hasExpandedBooks();
    const btn = dom.collapseAllToggle;
    if (!btn) return;
    const icon = btn.querySelector('i');
    icon?.classList.toggle('fa-compress', hasExpanded);
    icon?.classList.toggle('fa-expand', !hasExpanded);
    const label = hasExpanded ? 'Collapse All Books' : 'Expand All Books';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-pressed', hasExpanded ? 'true' : 'false');
};
const applyCollapseState = (name)=>{
    const isCollapsed = collapseStates[name];
    const world = cache[name];
    if (isCollapsed === undefined || !world?.dom?.entryList || !world?.dom?.collapseToggle) return;
    world.dom.entryList.classList.toggle('stwid--isCollapsed', isCollapsed);
    if (isCollapsed) {
        world.dom.collapseToggle.classList.remove('fa-chevron-up');
        world.dom.collapseToggle.classList.add('fa-chevron-down');
    } else {
        world.dom.collapseToggle.classList.add('fa-chevron-up');
        world.dom.collapseToggle.classList.remove('fa-chevron-down');
    }
};
const setBookCollapsed = (name, isCollapsed)=>{
    setCollapseState(name, isCollapsed);
    applyCollapseState(name);
    updateCollapseAllToggle();
};
const getSortFromMetadata = (metadata)=>{
    const sortData = metadata?.[METADATA_NAMESPACE]?.[METADATA_SORT_KEY];
    if (!sortData) return null;
    const sort = sortData.sort ?? sortData.logic ?? sortData.sortLogic;
    const direction = sortData.direction ?? sortData.sortDirection;
    if (!Object.values(SORT).includes(sort) || !Object.values(SORT_DIRECTION).includes(direction)) return null;
    return { sort, direction };
};
const getBookSortChoice = (name)=>{
    const bookSort = Settings.instance.useBookSorts ? cache[name]?.sort : null;
    return {
        sort: bookSort?.sort ?? Settings.instance.sortLogic,
        direction: bookSort?.direction ?? Settings.instance.sortDirection,
    };
};
const setCacheMetadata = (name, metadata = {})=>{
    cache[name].metadata = cloneMetadata(metadata);
    cache[name].sort = getSortFromMetadata(cache[name].metadata);
};
const buildSavePayload = (name)=>({
    entries: structuredClone(cache[name].entries),
    metadata: cloneMetadata(cache[name].metadata),
});
const setBookSortPreference = async(name, sort = null, direction = null)=>{
    const hasSort = Boolean(sort && direction);
    cache[name].metadata ??= {};
    cache[name].metadata[METADATA_NAMESPACE] ??= {};
    if (hasSort) {
        cache[name].metadata[METADATA_NAMESPACE][METADATA_SORT_KEY] = { sort, direction };
        cache[name].sort = { sort, direction };
    } else {
        delete cache[name].metadata[METADATA_NAMESPACE][METADATA_SORT_KEY];
        if (Object.keys(cache[name].metadata[METADATA_NAMESPACE]).length === 0) {
            delete cache[name].metadata[METADATA_NAMESPACE];
        }
        if (Object.keys(cache[name].metadata).length === 0) {
            cache[name].metadata = {};
        }
        cache[name].sort = null;
    }
    await saveWorldInfo(name, buildSavePayload(name), true);
    sortEntriesIfNeeded(name);
};

const clearBookSortPreferences = async()=>{
    for (const [name, data] of Object.entries(cache)) {
        const hasSortPreference = Boolean(data.metadata?.[METADATA_NAMESPACE]?.[METADATA_SORT_KEY]);
        if (!hasSortPreference) continue;
        await setBookSortPreference(name, null, null);
    }
};

const sortEntriesIfNeeded = (name)=>{
    const { sort, direction } = getBookSortChoice(name);
    const sorted = sortEntries(Object.values(cache[name].entries), sort, direction);
    let needsSort = false;
    let i = 0;
    for (const e of sorted) {
        if (cache[name].dom.entryList.children[i] != cache[name].dom.entry[e.uid].root) {
            needsSort = true;
            break;
        }
        i++;
    }
    if (needsSort) {
        for (const e of sorted) {
            cache[name].dom.entryList.append(cache[name].dom.entry[e.uid].root);
        }
    }
};
const updateSettingsChange = ()=>{
    console.log('[STWID]', '[UPDATE-SETTINGS]');
    for (const [name, world] of Object.entries(cache)) {
        const active = selected_world_info.includes(name);
        if (world.dom.active.checked != active) {
            world.dom.active.checked = active;
        }
    }
};
/**@type {ReturnType<typeof createDeferred>} */
let updateWIChangeStarted = createDeferred();
/**@type {ReturnType<typeof createDeferred>} */
let updateWIChangeFinished;
const updateWIChange = async(name = null, data = null)=>{
    console.log('[STWID]', '[UPDATE-WI]', name, data);
    updateWIChangeFinished = createDeferred();
    updateWIChangeStarted.resolve();
    // removed books
    for (const [n, w] of Object.entries(cache)) {
        if (world_names.includes(n)) continue;
        else {
            w.dom.root.remove();
            delete cache[n];
        }
    }
    // added books
    for (const name of world_names) {
        if (cache[name]) continue;
        else {
            const before = Object.keys(cache).find(it=>it.toLowerCase().localeCompare(name.toLowerCase()) == 1);
            const data = await loadWorldInfo(name);
            await renderBook(name, before ? cache[before].dom.root : null, data);
        }
    }
    if (name && cache[name]) {
        const world = { entries:{}, metadata: cloneMetadata(data.metadata) };
        const updatedSort = getSortFromMetadata(world.metadata) ?? cache[name].sort;
        const sortChoice = {
            sort: updatedSort?.sort ?? Settings.instance.sortLogic,
            direction: updatedSort?.direction ?? Settings.instance.sortDirection,
        };
        for (const [k,v] of Object.entries(data.entries)) {
            world.entries[k] = structuredClone(v);
        }
        // removed entries
        for (const e of Object.keys(cache[name].entries)) {
            if (world.entries[e]) continue;
            cache[name].dom.entry[e].root.remove();
            delete cache[name].dom.entry[e];
            delete cache[name].entries[e];
            if (currentEditor?.name == name && currentEditor?.uid == e) {
                currentEditor = null;
                dom.editor.innerHTML = '';
            }
        }
        // added entries
        const alreadyAdded = [];
        for (const e of Object.keys(world.entries)) {
            if (cache[name].entries[e]) continue;
            let a = world.entries[e];
            const sorted = sortEntries([...Object.values(cache[name].entries), ...alreadyAdded, a], sortChoice.sort, sortChoice.direction);
            const before = sorted.find((it,idx)=>idx > sorted.indexOf(a));
            await renderEntry(a, name, before ? cache[name].dom.entry[before.uid].root : null);
            alreadyAdded.push(a);
        }
        // updated entries
        let hasUpdate = false;
        for (const [e,o] of Object.entries(cache[name].entries)) {
            const n = world.entries[e];
            let hasChange = false;
            for (const k of new Set([...Object.keys(o), ...Object.keys(n)])) {
                if (o[k] == n[k]) continue;
                if (typeof o[k] == 'object' && JSON.stringify(o[k]) == JSON.stringify(n[k])) continue;
                hasChange = true;
                hasUpdate = true;
                switch (k) {
                    case 'content': {
                        if (currentEditor?.name == name && currentEditor?.uid == e && dom.editor.querySelector('[name="content"]').value != n.content) {
                            cache[name].dom.entry[e].root.click();
                        }
                        break;
                    }
                    case 'comment': {
                        if (currentEditor?.name == name && currentEditor?.uid == e && dom.editor.querySelector('[name="comment"]').value != n.comment) {
                            cache[name].dom.entry[e].root.click();
                        }
                        cache[name].dom.entry[e].comment.textContent = n.comment;
                        break;
                    }
                    case 'key': {
                        if (hasChange && currentEditor?.name == name && currentEditor?.uid == e) {
                            const inp = /**@type {HTMLTextAreaElement}*/(dom.editor.querySelector(`textarea[name="${k}"]`));
                            if (!inp || inp.value != n[k].join(', ')) {
                                cache[name].dom.entry[e].root.click();
                            }
                        }
                        cache[name].dom.entry[e].key.textContent = n.key.join(', ');
                        break;
                    }
                    case 'disable': {
                        if (hasChange && currentEditor?.name == name && currentEditor?.uid == e) {
                            cache[name].dom.entry[e].root.click();
                        }
                        cache[name].dom.entry[e].isEnabled.classList[n[k] ? 'remove' : 'add']('fa-toggle-on');
                        cache[name].dom.entry[e].isEnabled.classList[n[k] ? 'add' : 'remove']('fa-toggle-off');
                        break;
                    }
                    case 'constant':
                    case 'vectorized': {
                        if (hasChange && currentEditor?.name == name && currentEditor?.uid == e) {
                            cache[name].dom.entry[e].root.click();
                        }
                        cache[name].dom.entry[e].strategy.value = entryState(n);
                        break;
                    }
                    default: {
                        if (hasChange && currentEditor?.name == name && currentEditor?.uid == e) {
                            const inp = /**@type {HTMLInputElement}*/(dom.editor.querySelector(`[name="${k}"]`));
                            if (!inp || inp.value != n[k]) {
                                cache[name].dom.entry[e].root.click();
                            }
                        }
                        break;
                    }
                }
            }
        }
        cache[name].entries = world.entries;
        const prevSort = cache[name].sort;
        setCacheMetadata(name, world.metadata);
        const sortChanged = JSON.stringify(prevSort) !== JSON.stringify(cache[name].sort);
        if (hasUpdate || sortChanged) {
            sortEntriesIfNeeded(name);
        }
    }
    updateWIChangeStarted = createDeferred();
    updateWIChangeFinished.resolve();
};
const updateWIChangeDebounced = debounce(updateWIChange);

const fillEmptyTitlesWithKeywords = async(name)=>{
    const data = await loadWorldInfo(name);
    let hasUpdates = false;
    for (const entry of Object.values(data.entries)) {
        const hasTitle = Boolean(entry.comment?.trim());
        if (hasTitle) continue;
        const keywords = Array.isArray(entry.key) ? entry.key.map(it=>it?.trim()).filter(Boolean) : [];
        if (keywords.length === 0) continue;
        entry.comment = keywords.join(', ');
        hasUpdates = true;
    }
    if (!hasUpdates) return;
    await saveWorldInfo(name, data, true);
    updateWIChange(name, data);
};

eventSource.on(event_types.WORLDINFO_UPDATED, (name, world)=>updateWIChangeDebounced(name, world));
eventSource.on(event_types.WORLDINFO_SETTINGS_UPDATED, ()=>updateSettingsChange());


export const jumpToEntry = async(name, uid)=>{
    if (dom.activationToggle.classList.contains('stwid--active')) {
        dom.activationToggle.click();
    }
    if (dom.order.toggle.classList.contains('stwid--active')) {
        dom.order.toggle.click();
    }
    setBookCollapsed(name, false);
    cache[name].dom.entry[uid].root.scrollIntoView({ block:'center', inline:'center' });
    if (currentEditor?.name != name || currentEditor?.uid != uid) {
        cache[name].dom.entry[uid].root.click();
    }
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
        : Object.entries(cache)
            .filter(([name])=>selected_world_info.includes(name))
            .map(([name,data])=>Object.values(data.entries).map(it=>({ book:name, data:it })))
            .flat();
    return sortEntries(source, orderHelperState.sort, orderHelperState.direction)
        .filter((entry)=>!book || entry.book === book);
};

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

const focusWorldEntry = (book, uid)=>{
    const entryDom = cache?.[book]?.dom?.entry?.[uid]?.root;
    if (!entryDom) return;
    setBookCollapsed(book, false);
    entryDom.scrollIntoView({ behavior:'smooth', block:'center' });
    entryDom.click();
};

const renderOrderHelper = (book = null)=>{
    orderHelperState.book = book;
    dom.editor.innerHTML = '';
    currentEditor = null;
    if (dom.activationToggle.classList.contains('stwid--active')) {
        dom.activationToggle.click();
    }
    for (const cb of Object.values(cache)) {
        for (const ce of Object.values(cb.dom.entry)) {
            ce.root.classList.remove('stwid--active');
        }
    }
    dom.order.entries = {};
    dom.order.filter.root = undefined;
    dom.order.filter.preview = undefined;
    dom.order.tbody = undefined;

    const entries = getOrderHelperEntries(book);
    const body = document.createElement('div'); {
        body.classList.add('stwid--orderHelper');
        body.classList.toggle('stwid--hideKeys', orderHelperState.hideKeys);
        const actions = document.createElement('div'); {
            actions.classList.add('stwid--actions');
            const selectAll = document.createElement('div'); {
                dom.order.selectAll = selectAll;
                selectAll.classList.add('menu_button');
                selectAll.classList.add('fa-solid', 'fa-fw', 'fa-square-check', 'stwid--active');
                selectAll.title = 'Select/unselect all entries for applying Order values';
                selectAll.addEventListener('click', ()=>{
                    const rows = getOrderHelperRows();
                    const shouldSelect = !rows.length || rows.some(row=>!isOrderHelperRowSelected(row));
                    setAllOrderHelperRowSelected(shouldSelect);
                    updateOrderHelperSelectAllButton();
                });
                actions.append(selectAll);
            }
            const keyToggle = document.createElement('div'); {
                keyToggle.classList.add('menu_button');
                keyToggle.classList.add('fa-solid', 'fa-fw');
                keyToggle.title = 'Toggle keyword visibility';
                const applyKeyToggleStyle = ()=>{
                    keyToggle.classList.toggle('fa-eye', !orderHelperState.hideKeys);
                    keyToggle.classList.toggle('fa-eye-slash', orderHelperState.hideKeys);
                    keyToggle.classList.toggle('stwid--active', orderHelperState.hideKeys);
                };
                applyKeyToggleStyle();
                keyToggle.addEventListener('click', ()=>{
                    orderHelperState.hideKeys = !orderHelperState.hideKeys;
                    localStorage.setItem(ORDER_HELPER_HIDE_KEYS_STORAGE_KEY, orderHelperState.hideKeys);
                    body.classList.toggle('stwid--hideKeys', orderHelperState.hideKeys);
                    applyKeyToggleStyle();
                });
                actions.append(keyToggle);
            }
            const addDivider = ()=>{
                const divider = document.createElement('div');
                divider.classList.add('stwid--actionsDivider');
                actions.append(divider);
            };
            addDivider();
            const sortWrap = document.createElement('label'); {
                sortWrap.classList.add('stwid--inputWrap');
                sortWrap.append('Sort: ');
                const sortSel = document.createElement('select'); {
                    sortSel.classList.add('text_pole');
                    appendSortOptions(sortSel, orderHelperState.sort, orderHelperState.direction);
                    sortSel.addEventListener('change', ()=>{
                        const value = JSON.parse(sortSel.value);
                        orderHelperState.sort = value.sort;
                        orderHelperState.direction = value.direction;
                        localStorage.setItem(ORDER_HELPER_SORT_STORAGE_KEY, JSON.stringify(value));
                        applyOrderHelperSortToDom();
                    });
                    sortWrap.append(sortSel);
                }
                actions.append(sortWrap);
            }
            addDivider();
            const filterToggle = document.createElement('div'); {
                filterToggle.classList.add('menu_button');
                filterToggle.classList.add('fa-solid', 'fa-fw', 'fa-filter');
                filterToggle.title = 'Filter entries\n---\nOrder will only be applied to unfiltered entries';
                filterToggle.addEventListener('click', ()=>{
                    const is = dom.order.filter.root.classList.toggle('stwid--active');
                    if (is) {
                        updateOrderHelperPreview(getOrderHelperEntries(orderHelperState.book, true));
                    }
                });
                actions.append(filterToggle);
            }
            const startLbl = document.createElement('label'); {
                startLbl.classList.add('stwid--inputWrap');
                startLbl.title = 'Starting Order (topmost entry in list)';
                startLbl.append('Start: ');
                const start = document.createElement('input'); {
                    dom.order.start = start;
                    start.classList.add('stwid--input');
                    start.classList.add('text_pole');
                    start.type = 'number';
                    start.min = '1';
                    start.max = '10000';
                    start.value = localStorage.getItem('stwid--order-start') ?? '100';
                    start.addEventListener('change', ()=>{
                        localStorage.setItem('stwid--order-start', start.value);
                    });
                    startLbl.append(start);
                }
                actions.append(startLbl);
            }
            const stepLbl = document.createElement('label'); {
                stepLbl.classList.add('stwid--inputWrap');
                stepLbl.append('Spacing: ');
                const step = document.createElement('input'); {
                    dom.order.step = step;
                    step.classList.add('stwid--input');
                    step.classList.add('text_pole');
                    step.type = 'number';
                    step.min = '1';
                    step.max = '10000';
                    step.value = localStorage.getItem('stwid--order-step') ?? '10';
                    step.addEventListener('change', ()=>{
                        localStorage.setItem('stwid--order-step', step.value);
                    });
                    stepLbl.append(step);
                }
                actions.append(stepLbl);
            }
            const dir = document.createElement('div'); {
                dir.classList.add('stwid--inputWrap');
                dir.append('Direction: ');
                const wrap = document.createElement('div'); {
                    wrap.classList.add('stwid--toggleWrap');
                    const up = document.createElement('label'); {
                        up.classList.add('stwid--inputWrap');
                        up.title = 'Start at the bottom of the list';
                        const inp = document.createElement('input'); {
                            dom.order.direction.up = inp;
                            inp.type = 'radio';
                            inp.checked = (localStorage.getItem('stwid--order-direction') ?? 'down') == 'up';
                            inp.addEventListener('click', ()=>{
                                inp.checked = true;
                                dom.order.direction.down.checked = false;
                                apply.classList.remove('fa-arrow-down-1-9');
                                apply.classList.add('fa-arrow-up-9-1');
                                localStorage.setItem('stwid--order-direction', 'up');
                            });
                            up.append(inp);
                        }
                        up.append('up');
                        wrap.append(up);
                    }
                    const down = document.createElement('label'); {
                        down.classList.add('stwid--inputWrap');
                        down.title = 'Start at the top of the list';
                        const inp = document.createElement('input'); {
                            dom.order.direction.down = inp;
                            inp.type = 'radio';
                            inp.checked = (localStorage.getItem('stwid--order-direction') ?? 'down') == 'down';
                            inp.addEventListener('click', ()=>{
                                inp.checked = true;
                                dom.order.direction.up.checked = false;
                                apply.classList.add('fa-arrow-down-1-9');
                                apply.classList.remove('fa-arrow-up-9-1');
                                localStorage.setItem('stwid--order-direction', 'down');
                            });
                            down.append(inp);
                        }
                        down.append('down');
                        wrap.append(down);
                    }
                    dir.append(wrap);
                }
                actions.append(dir);
            }
            const apply = document.createElement('div'); {
                apply.classList.add('menu_button');
                apply.classList.add('fa-solid', 'fa-fw');
                if ((localStorage.getItem('stwid--order-direction') ?? 'down') == 'up') {
                    apply.classList.add('fa-arrow-up-9-1');
                } else {
                    apply.classList.add('fa-arrow-down-1-9');
                }
                apply.title = 'Apply current sorting as Order';
                apply.addEventListener('click', async()=>{
                    const start = parseInt(dom.order.start.value);
                    const step = parseInt(dom.order.step.value);
                    const up = dom.order.direction.up.checked;
                    let order = start;
                    let rows = [...dom.order.tbody.children];
                    const books = [];
                    if (up) rows.reverse();
                    for (const tr of rows) {
                        if (tr.classList.contains('stwid--isFiltered')) continue;
                        if (!isOrderHelperRowSelected(tr)) continue;
                        const bookName = tr.getAttribute('data-book');
                        const uid = tr.getAttribute('data-uid');
                        if (!books.includes(bookName)) books.push(bookName);
                        cache[bookName].entries[uid].order = order;
                        /**@type {HTMLInputElement}*/(tr.querySelector('[name="order"]')).value = order.toString();
                        order += step;
                    }
                    for (const bookName of books) {
                        await saveWorldInfo(bookName, buildSavePayload(bookName), true);
                    }
                });
                actions.append(apply);
            }
            body.append(actions);
        }
        const filter = document.createElement('div'); {
            dom.order.filter.root = filter;
            filter.classList.add('stwid--filter');
            const main = document.createElement('div'); {
                main.classList.add('stwid--main');
                const hint = document.createElement('div'); {
                    hint.classList.add('stwid--hint');
                    const bookContextHint = book ? `<br>Book context: <code>${book}</code> (entries are scoped to this book).` : '';
                    hint.innerHTML = `
                        Script will be called for each entry in all active books.
                        Every entry for which the script returns <code>true</code> will be kept.
                        Other entries will be filtered out.
                        <br>
                        Use <code>{{var::entry}}</code> to access the entry and its properties (look
                        right for available fields).
                        ${bookContextHint}
                    `;
                    main.append(hint);
                }
                const script = document.createElement('div'); {
                    script.classList.add('stwid--script');
                    const syntax = document.createElement('pre'); {
                        syntax.classList.add('stwid--syntax');
                        script.append(syntax);
                    }
                    const overlay = document.createElement('div'); {
                        overlay.classList.add('stwid--overlay');
                        script.append(overlay);
                    }
                    const inp = document.createElement('textarea'); {
                        const defaultFilter = '{{var::entry}}';
                        inp.classList.add('stwid--input');
                        inp.classList.add('text_pole');
                        inp.name = 'filter';
                        inp.value = localStorage.getItem('stwid--order-filter') ?? defaultFilter;
                        let filterStack = [];
                        const updateScroll = ()=>{
                            const scrollTop = inp.scrollTop;
                            syntax.scrollTop = scrollTop;
                        };
                        const updateScrollDebounced = debounce(()=>updateScroll(), 150);
                        const updateList = async()=>{
                            if (!dom.order.filter.root.classList.contains('stwid--active')) return;
                            const closure = new (await SlashCommandParser.getScope())();
                            filterStack.push(closure);
                            const clone = inp.value;
                            const script = `return async function orderHelperFilter(data) {${clone}}();`;
                            try {
                                await closure.compile(script);
                                const entries = getOrderHelperEntries(orderHelperState.book, true);
                                for (const e of entries) {
                                    dom.order.entries[e.book][e.data.uid].classList.remove('stwid--isFiltered');
                                    dom.order.entries[e.book][e.data.uid].classList.add('stwid--isFiltered');
                                }
                                for (const e of entries) {
                                    closure.scope.setVariable('entry', JSON.stringify(Object.assign({ book:e.book }, e.data)));
                                    const result = (await closure.execute()).pipe;
                                    if (filterStack.at(-1) != closure) {
                                        filterStack.splice(filterStack.indexOf(closure), 1);
                                        return;
                                    }
                                    if (isTrueBoolean(result)) {
                                        dom.order.entries[e.book][e.data.uid].classList.remove('stwid--isFiltered');
                                    } else {
                                        dom.order.entries[e.book][e.data.uid].classList.add('stwid--isFiltered');
                                    }
                                }
                                filterStack.splice(filterStack.indexOf(closure), 1);
                            } catch { /* empty */ }
                        };
                        const updateListDebounced = debounce(()=>updateList(), 1000);
                        inp.addEventListener('input', () => {
                            syntax.innerHTML = hljs.highlight(`${inp.value}${inp.value.slice(-1) == '\n' ? ' ' : ''}`, { language:'stscript', ignoreIllegals:true })?.value;
                            updateScrollDebounced();
                            updateListDebounced();
                        });
                        inp.addEventListener('scroll', ()=>{
                            updateScrollDebounced();
                        });
                        inp.style.color = 'transparent';
                        inp.style.background = 'transparent';
                        inp.style.setProperty('text-shadow', 'none', 'important');
                        syntax.innerHTML = hljs.highlight(`${inp.value}${inp.value.slice(-1) == '\n' ? ' ' : ''}`, { language:'stscript', ignoreIllegals:true })?.value;
                        script.append(inp);
                    }
                    main.append(script);
                }
                filter.append(main);
            }
            const preview = document.createElement('div'); {
                dom.order.filter.preview = preview;
                preview.classList.add('stwid--preview');
                filter.append(preview);
            }
            body.append(filter);
        }
        const wrap = document.createElement('div'); {
            wrap.classList.add('stwid--orderTableWrap');
            const tbl = document.createElement('table'); {
                tbl.classList.add('stwid--orderTable');
                const thead = document.createElement('thead'); {
                    const tr = document.createElement('tr'); {
                        for (const col of ['', '', '', 'Entry', 'Strategy', 'Position', 'Depth', 'Outlet', 'Order', 'Trigger %']) {
                            const th = document.createElement('th'); {
                                th.textContent = col;
                                tr.append(th);
                            }
                        }
                        thead.append(tr);
                    }
                    tbl.append(thead);
                }
                const tbody = document.createElement('tbody'); {
                    dom.order.tbody = tbody;
                    $(tbody).sortable({
                        // handle: 'stwid--sortableHandle',
                        delay: getSortableDelay(),
                    });
                    for (const e of entries) {
                        const tr = document.createElement('tr'); {
                            tr.setAttribute('data-book', e.book);
                            tr.setAttribute('data-uid', e.data.uid);
                            if (!dom.order.entries[e.book]) {
                                dom.order.entries[e.book] = {};
                            }
                            dom.order.entries[e.book][e.data.uid] = tr;
                            const select = document.createElement('td'); {
                                const btn = document.createElement('div'); {
                                    btn.classList.add('stwid--orderSelect');
                                    btn.classList.add('fa-solid', 'fa-fw');
                                    btn.title = 'Toggle selection for applying Order values';
                                    const icon = document.createElement('i'); {
                                        icon.classList.add('fa-solid', 'fa-fw', 'stwid--icon');
                                        btn.append(icon);
                                    }
                                    btn.addEventListener('click', ()=>{
                                        setOrderHelperRowSelected(tr, !isOrderHelperRowSelected(tr));
                                        updateOrderHelperSelectAllButton();
                                    });
                                    select.append(btn);
                                }
                                tr.append(select);
                            }
                            const handle = document.createElement('td'); {
                                const i = document.createElement('div'); {
                                    i.classList.add('stwid--sortableHandle');
                                    i.textContent = '☰';
                                    handle.append(i);
                                }
                                tr.append(handle);
                            }
                            const active = document.createElement('td'); {
                                const isEnabled = /**@type {HTMLSelectElement}*/(document.querySelector('#entry_edit_template [name="entryKillSwitch"]').cloneNode(true)); {
                                    isEnabled.classList.add('stwid--enabled');
                                    if (e.data.disable) {
                                        isEnabled.classList.toggle('fa-toggle-off');
                                        isEnabled.classList.toggle('fa-toggle-on');
                                    }
                                    isEnabled.addEventListener('click', async()=>{
                                        const dis = isEnabled.classList.toggle('fa-toggle-off');
                                        isEnabled.classList.toggle('fa-toggle-on');
                                        cache[e.book].dom.entry[e.data.uid].isEnabled.classList.toggle('fa-toggle-off');
                                        cache[e.book].dom.entry[e.data.uid].isEnabled.classList.toggle('fa-toggle-on');
                                        cache[e.book].entries[e.data.uid].disable = dis;
                                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                                    });
                                    active.append(isEnabled);
                                }
                                tr.append(active);
                            }
                            const entry = document.createElement('td'); {
                                const wrap = document.createElement('div'); {
                                    wrap.classList.add('stwid--colwrap');
                                    wrap.classList.add('stwid--entry');
                                    const bookLabel = document.createElement('div'); {
                                        bookLabel.classList.add('stwid--book');
                                        const i = document.createElement('i'); {
                                            i.classList.add('fa-solid', 'fa-fw', 'fa-book-atlas');
                                            bookLabel.append(i);
                                        }
                                        const txt = document.createElement('span'); {
                                            txt.textContent = e.book;
                                            bookLabel.append(txt);
                                        }
                                        wrap.append(bookLabel);
                                    }
                                    const comment = document.createElement('a'); {
                                        comment.classList.add('stwid--comment', 'stwid--commentLink');
                                        comment.href = `#world_entry/${encodeURIComponent(e.data.uid)}`;
                                        comment.textContent = e.data.comment;
                                        comment.addEventListener('click', (evt)=>{
                                            evt.preventDefault();
                                            focusWorldEntry(e.book, e.data.uid);
                                        });
                                        wrap.append(comment);
                                    }
                                    const key = document.createElement('div'); {
                                        key.classList.add('stwid--key');
                                        key.textContent = e.data.key.join(', ');
                                    }
                                    wrap.append(key);
                                    entry.append(wrap);
                                }
                                tr.append(entry);
                            }
                            const strategy = document.createElement('td'); {
                                const strat = /**@type {HTMLSelectElement}*/(document.querySelector('#entry_edit_template [name="entryStateSelector"]').cloneNode(true)); {
                                    strat.classList.add('stwid--strategy');
                                    strat.value = entryState(e.data);
                                    strat.addEventListener('change', async()=>{
                                        const value = strat.value;
                                        cache[e.book].dom.entry[e.data.uid].strategy.value = value;
                                        switch (value) {
                                            case 'constant': {
                                                cache[e.book].entries[e.data.uid].constant = true;
                                                cache[e.book].entries[e.data.uid].vectorized = false;
                                                break;
                                            }
                                            case 'normal': {
                                                cache[e.book].entries[e.data.uid].constant = false;
                                                cache[e.book].entries[e.data.uid].vectorized = false;
                                                break;
                                            }
                                            case 'vectorized': {
                                                cache[e.book].entries[e.data.uid].constant = false;
                                                cache[e.book].entries[e.data.uid].vectorized = true;
                                                break;
                                            }
                                        }
                                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                                    });
                                    strategy.append(strat);
                                }
                                tr.append(strategy);
                            }
                            let updateOutlet;
                            const pos = /**@type {HTMLSelectElement}*/(document.querySelector('#entry_edit_template [name="position"]').cloneNode(true));
                            const position = document.createElement('td'); {
                                cache[e.book].dom.entry[e.data.uid].position = pos;
                                pos.classList.add('stwid--position');
                                pos.value = e.data.position;
                                pos.addEventListener('change', async()=>{
                                    const value = pos.value;
                                    cache[e.book].dom.entry[e.data.uid].position.value = value;
                                    cache[e.book].entries[e.data.uid].position = value;
                                    e.data.position = value;
                                    updateOutlet?.();
                                    await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                                });
                                position.append(pos);
                                tr.append(position);
                            }
                            const depth = document.createElement('td'); {
                                const inp = document.createElement('input'); {
                                    inp.classList.add('stwid--input');
                                    inp.classList.add('text_pole');
                                    inp.name = 'depth';
                                    inp.min = '0';
                                    inp.max = '99999';
                                    inp.type = 'number';
                                    inp.value = e.data.depth ?? '';
                                    inp.addEventListener('change', async()=>{
                                        const depth = parseInt(inp.value);
                                        cache[e.book].entries[e.data.uid].depth = Number.isFinite(depth) ? depth : undefined;
                                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                                    });
                                    depth.append(inp);
                                }
                                tr.append(depth);
                            }
                            const outlet = document.createElement('td'); {
                                const wrap = document.createElement('div'); {
                                    wrap.classList.add('stwid--colwrap');
                                    wrap.classList.add('stwid--outlet');
                                    const input = document.createElement('input'); {
                                        input.classList.add('stwid--input');
                                        input.classList.add('text_pole');
                                        input.name = 'outletName';
                                        input.type = 'text';
                                        input.value = cache[e.book].entries[e.data.uid].outletName ?? e.data.outletName ?? '';
                                        updateOutlet = ()=>{
                                            const entryData = cache[e.book].entries[e.data.uid];
                                            const currentPosition = entryData.position ?? pos.value;
                                            const outletName = entryData.outletName ?? e.data.outletName ?? '';
                                            input.value = outletName;
                                            wrap.hidden = !isOutletPosition(currentPosition);
                                        };
                                        updateOutlet();
                                        input.addEventListener('change', async()=>{
                                            const value = input.value;
                                            cache[e.book].entries[e.data.uid].outletName = value;
                                            e.data.outletName = value;
                                            await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                                            updateOutlet();
                                        });
                                        wrap.append(input);
                                    }
                                    outlet.append(wrap);
                                }
                                tr.append(outlet);
                            }
                            const order = document.createElement('td'); {
                                const inp = document.createElement('input'); {
                                    inp.classList.add('stwid--input');
                                    inp.classList.add('text_pole');
                                    inp.name = 'order';
                                    inp.min = '0';
                                    inp.max = '99999';
                                    inp.type = 'number';
                                    inp.value = e.data.order ?? '';
                                    inp.addEventListener('change', async()=>{
                                        const order = parseInt(inp.value);
                                        cache[e.book].entries[e.data.uid].order = Number.isFinite(order) ? order : undefined;
                                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                                    });
                                    order.append(inp);
                                }
                                tr.append(order);
                            }
                            const probability = document.createElement('td'); {
                                const inp = document.createElement('input'); {
                                    inp.classList.add('stwid--input');
                                    inp.classList.add('text_pole');
                                    inp.name = 'selective_probability';
                                    inp.min = '0';
                                    inp.max = '100';
                                    inp.type = 'number';
                                    inp.value = e.data.selective_probability ?? '';
                                    inp.addEventListener('change', async()=>{
                                        const probability = parseInt(inp.value);
                                        cache[e.book].entries[e.data.uid].selective_probability = Number.isFinite(probability) ? probability : undefined;
                                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                                    });
                                    probability.append(inp);
                                }
                                tr.append(probability);
                            }
                            setOrderHelperRowSelected(tr, true);
                            tbody.append(tr);
                        }
                    }
                    updateOrderHelperSelectAllButton();
                    tbl.append(tbody);
                }
                wrap.append(tbl);
            }
            body.append(wrap);
        }
    }
    dom.editor.append(body);
};

const openOrderHelper = (book = null)=>{
    if (!dom.order.toggle) return;
    dom.order.toggle.classList.add('stwid--active');
    renderOrderHelper(book);
};


/** Last clickd/selected DOM (WI entry) @type {HTMLElement} */
let selectLast = null;
/** Name of the book to select WI entries from @type {string} */
let selectFrom = null;
/**@type {'ctrl'|'shift'} */
let selectMode = null;
/** List of selected entries (WI data) @type {{}[]} */
let selectList = null;
/** toastr reference showing selection help @type {JQuery<HTMLElement>} */
let selectToast = null;
const selectEnd = ()=>{
    selectFrom = null;
    selectMode = null;
    selectList = null;
    selectLast = null;
    if (selectToast) {
        toastr.clear(selectToast);
    }
    dom.books.classList.remove('stwid--isDragging');
    [...dom.books.querySelectorAll('.stwid--entry.stwid--isSelected')]
        .forEach(it=>{
            it.classList.remove('stwid--isSelected');
            it.removeAttribute('draggable');
            const icon = it.querySelector('.stwid--selector > .stwid--icon');
            icon.classList.add('fa-square');
            icon.classList.remove('fa-square-check');
        })
    ;
    [...dom.books.querySelectorAll('.stwid--book.stwid--isTarget')]
        .forEach(it=>{
            it.classList.remove('stwid--isTarget');
        })
    ;
};
/**
 *
 * @param {HTMLElement} entry
 */
const selectAdd = (entry)=>{
    entry.classList.add('stwid--isSelected');
    entry.setAttribute('draggable', 'true');
    const icon = entry.querySelector('.stwid--selector > .stwid--icon');
    icon.classList.remove('fa-square');
    icon.classList.add('fa-square-check');
};
const selectRemove = (entry)=>{
    entry.classList.remove('stwid--isSelected');
    entry.setAttribute('draggable', 'false');
    const icon = entry.querySelector('.stwid--selector > .stwid--icon');
    icon.classList.add('fa-square');
    icon.classList.remove('fa-square-check');
};
setWorldEntryContext({
    buildSavePayload,
    cache,
    dom,
    getWorldEntry,
    renderTemplateAsync,
    saveWorldInfo,
    selectAdd,
    selectEnd,
    selectRemove,
    uuidv4,
    get currentEditor() {
        return currentEditor;
    },
    set currentEditor(value) {
        currentEditor = value;
    },
    get selectFrom() {
        return selectFrom;
    },
    set selectFrom(value) {
        selectFrom = value;
    },
    get selectLast() {
        return selectLast;
    },
    set selectLast(value) {
        selectLast = value;
    },
    get selectList() {
        return selectList;
    },
    set selectList(value) {
        selectList = value;
    },
    get selectToast() {
        return selectToast;
    },
    set selectToast(value) {
        selectToast = value;
    },
});
const renderBook = async(name, before = null, bookData = null)=>{
    const data = bookData ?? await loadWorldInfo(name);
    const world = { entries:{}, metadata: cloneMetadata(data.metadata), sort:getSortFromMetadata(data.metadata) };
    for (const [k,v] of Object.entries(data.entries)) {
        world.entries[k] = structuredClone(v);
    }
    world.dom = {
        /**@type {HTMLElement} */
        root: undefined,
        /**@type {HTMLElement} */
        name: undefined,
        /**@type {HTMLElement} */
        active: undefined,
        /**@type {HTMLElement} */
        entryList: undefined,
        /**@type {{ [uid:string]:{root:HTMLElement, comment:HTMLElement, key:HTMLElement}}} */
        entry: {},
    };
    cache[name] = world;
    const book = document.createElement('div'); {
        world.dom.root = book;
        book.classList.add('stwid--book');
        book.addEventListener('dragover', (evt)=>{
            if (selectFrom === null) return;
            evt.preventDefault();
            book.classList.add('stwid--isTarget');
        });
        book.addEventListener('dragleave', (evt)=>{
            if (selectFrom === null) return;
            book.classList.remove('stwid--isTarget');
        });
        book.addEventListener('drop', async(evt)=>{
            if (selectFrom === null) return;
            evt.preventDefault();
            const isCopy = evt.ctrlKey;
            if (selectFrom != name || isCopy) {
                const srcBook = await loadWorldInfo(selectFrom);
                const dstBook = await loadWorldInfo(name);
                for (const srcEntry of selectList) {
                    const uid = srcEntry.uid;
                    const oData = Object.assign({}, srcEntry);
                    delete oData.uid;
                    const dstEntry = createWorldInfoEntry(null, dstBook);
                    Object.assign(dstEntry, oData);
                    await saveWorldInfo(name, dstBook, true);
                    if (!isCopy) {
                        const deleted = await deleteWorldInfoEntry(srcBook, uid, { silent:true });
                        if (deleted) {
                            deleteWIOriginalDataValue(srcBook, uid);
                        }
                    }
                }
                if (selectFrom != name) {
                    await saveWorldInfo(selectFrom, srcBook, true);
                    updateWIChange(selectFrom, srcBook);
                }
                updateWIChange(name, dstBook);
            }
            selectEnd();
        });
        const head = document.createElement('div'); {
            head.classList.add('stwid--head');
            let collapseToggle;
            const title = document.createElement('div'); {
                world.dom.name = title;
                title.classList.add('stwid--title');
                title.textContent = name;
                title.addEventListener('click', ()=>{
                    const isCollapsed = !entryList.classList.contains('stwid--isCollapsed');
                    setBookCollapsed(name, isCollapsed);
                });
                head.append(title);
            }
            const actions = document.createElement('div'); {
                actions.classList.add('stwid--actions');
                const active = document.createElement('input'); {
                    world.dom.active = active;
                    active.title = 'Globally active';
                    active.type = 'checkbox';
                    active.checked = selected_world_info.includes(name);
                    active.addEventListener('click', async()=>{
                        active.disabled = true;
                        onWorldInfoChange({ silent:'true', state:(active.checked ? 'on' : 'off') }, name);
                        active.disabled = false;
                    });
                    actions.append(active);
                }
                const add = document.createElement('div'); {
                    add.classList.add('stwid--action');
                    add.classList.add('stwid--add');
                    add.classList.add('fa-solid', 'fa-fw', 'fa-plus');
                    add.title = 'New Entry';
                    add.addEventListener('click', async()=>{
                        const data = buildSavePayload(name);
                        const newEntry = createWorldInfoEntry(name, data);
                        cache[name].entries[newEntry.uid] = structuredClone(newEntry);
                        await renderEntry(newEntry, name);
                        cache[name].dom.entry[newEntry.uid].root.click();
                        await saveWorldInfo(name, data, true);
                    });
                    actions.append(add);
                }
                const menuTrigger = document.createElement('div'); {
                    menuTrigger.classList.add('stwid--action');
                    menuTrigger.classList.add('stwid--menuTrigger');
                    menuTrigger.classList.add('fa-solid', 'fa-fw', 'fa-ellipsis-vertical');
                    menuTrigger.addEventListener('click', ()=>{
                        menuTrigger.style.anchorName = '--stwid--ctxAnchor';
                        const blocker = document.createElement('div'); {
                            blocker.classList.add('stwid--blocker');
                            blocker.addEventListener('mousedown', (evt)=>{
                                evt.stopPropagation();
                            });
                            blocker.addEventListener('pointerdown', (evt)=>{
                                evt.stopPropagation();
                            });
                            blocker.addEventListener('touchstart', (evt)=>{
                                evt.stopPropagation();
                            });
                            blocker.addEventListener('click', (evt)=>{
                                evt.stopPropagation();
                                blocker.remove();
                                menuTrigger.style.anchorName = '';
                            });
                            const menu = document.createElement('div'); {
                                menu.classList.add('stwid--menu');
                                const rename = document.createElement('div'); {
                                    rename.classList.add('stwid--item');
                                    rename.classList.add('stwid--rename');
                                    rename.addEventListener('click', async(evt)=>{
                                        //TODO cheeky monkey
                                        const sel = /**@type {HTMLSelectElement}*/(document.querySelector('#world_editor_select'));
                                        sel.value = /**@type {HTMLOptionElement[]}*/([...sel.children]).find(it=>it.textContent == name).value;
                                        sel.dispatchEvent(new Event('change', { bubbles:true }));
                                        await delay(500);
                                        document.querySelector('#world_popup_name_button').click();
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-pencil');
                                        rename.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Rename Book';
                                        rename.append(txt);
                                    }
                                    menu.append(rename);
                                }
                                if (extensionNames.includes('third-party/SillyTavern-WorldInfoBulkEdit')) {
                                    const bulk = document.createElement('div'); {
                                        bulk.classList.add('stwid--item');
                                        bulk.classList.add('stwid--bulkEdit');
                                        bulk.addEventListener('click', async(evt)=>{
                                            //TODO cheeky monkey
                                            const sel = /**@type {HTMLSelectElement}*/(document.querySelector('#world_editor_select'));
                                            sel.value = /**@type {HTMLOptionElement[]}*/([...sel.children]).find(it=>it.textContent == name).value;
                                            sel.dispatchEvent(new Event('change', { bubbles:true }));
                                            await delay(500);
                                            document.querySelector('.stwibe--trigger').click();
                                        });
                                        const i = document.createElement('i'); {
                                            i.classList.add('stwid--icon');
                                            i.classList.add('fa-solid', 'fa-fw', 'fa-list-check');
                                            bulk.append(i);
                                        }
                                        const txt = document.createElement('span'); {
                                            txt.classList.add('stwid--label');
                                            txt.textContent = 'Bulk Edit';
                                            bulk.append(txt);
                                        }
                                        menu.append(bulk);
                                    }
                                }
                                if (extensionNames.includes('third-party/SillyTavern-WorldInfoExternalEditor')) {
                                    const editor = document.createElement('div'); {
                                        editor.classList.add('stwid--item');
                                        editor.classList.add('stwid--externalEditor');
                                        editor.addEventListener('click', async(evt)=>{
                                            fetch('/api/plugins/wiee/editor', {
                                                method: 'POST',
                                                headers: getRequestHeaders(),
                                                body: JSON.stringify({
                                                    book: name,
                                                    command: 'code',
                                                    commandArguments: ['.'],
                                                }),
                                            });
                                        });
                                        const i = document.createElement('i'); {
                                            i.classList.add('stwid--icon');
                                            i.classList.add('fa-solid', 'fa-fw', 'fa-laptop-code');
                                            editor.append(i);
                                        }
                                        const txt = document.createElement('span'); {
                                            txt.classList.add('stwid--label');
                                            txt.textContent = 'External Editor';
                                            editor.append(txt);
                                        }
                                        menu.append(editor);
                                    }
                                }
                                const fillTitles = document.createElement('div'); {
                                    fillTitles.classList.add('stwid--item');
                                    fillTitles.classList.add('stwid--fillTitles');
                                    fillTitles.addEventListener('click', async()=>{
                                        await fillEmptyTitlesWithKeywords(name);
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-wand-magic-sparkles');
                                        fillTitles.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Fill Empty Titles';
                                        fillTitles.append(txt);
                                    }
                                    menu.append(fillTitles);
                                }
                                const bookSort = document.createElement('div'); {
                                    bookSort.classList.add('stwid--item');
                                    bookSort.classList.add('stwid--bookSort');
                                    bookSort.addEventListener('click', (evt)=>evt.stopPropagation());
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-list-ol');
                                        bookSort.append(i);
                                    }
                                    const label = document.createElement('span'); {
                                        label.classList.add('stwid--label');
                                        label.textContent = 'Book Sort';
                                        bookSort.append(label);
                                    }
                                    const sortSelect = document.createElement('select'); {
                                        sortSelect.classList.add('text_pole');
                                        sortSelect.addEventListener('click', (evt)=>evt.stopPropagation());
                                        const hasCustomSort = Boolean(cache[name].sort);
                                        const globalLabel = getSortLabel(Settings.instance.sortLogic, Settings.instance.sortDirection) ?? 'Global default';
                                        const globalOpt = document.createElement('option'); {
                                            globalOpt.value = 'null';
                                            globalOpt.textContent = `Use global (${globalLabel})`;
                                            globalOpt.selected = !hasCustomSort;
                                            sortSelect.append(globalOpt);
                                        }
                                        appendSortOptions(sortSelect, cache[name].sort?.sort, cache[name].sort?.direction);
                                        sortSelect.addEventListener('change', async()=>{
                                            const value = sortSelect.value === 'null' ? null : JSON.parse(sortSelect.value);
                                            if (value) {
                                                await setBookSortPreference(name, value.sort, value.direction);
                                            } else {
                                                await setBookSortPreference(name, null, null);
                                            }
                                            blocker.remove();
                                            menuTrigger.style.anchorName = '';
                                        });
                                    }
                                    bookSort.append(sortSelect);
                                    menu.append(bookSort);
                                }
                                const orderHelper = document.createElement('div'); {
                                    orderHelper.classList.add('stwid--item');
                                    orderHelper.classList.add('stwid--orderHelper');
                                    orderHelper.addEventListener('click', ()=>{
                                        openOrderHelper(name);
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-arrow-down-wide-short');
                                        orderHelper.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Order Helper';
                                        orderHelper.append(txt);
                                    }
                                    menu.append(orderHelper);
                                }
                                const stloButton = document.createElement('div'); {
                                    stloButton.id = 'lorebook_ordering_button';
                                    stloButton.classList.add('stwid--item');
                                    stloButton.classList.add('stwid--stlo');
                                    stloButton.dataset.i18n = '[title]stlo.button.configure; [aria-label]stlo.button.configure';
                                    stloButton.title = 'Configure STLO Priority & Budget';
                                    stloButton.setAttribute('aria-label', 'Configure STLO Priority & Budget');
                                    stloButton.tabIndex = 0;
                                    stloButton.setAttribute('role', 'button');
                                    stloButton.addEventListener('click', async(evt)=>{
                                        evt.stopPropagation();
                                        const escapedName = name.replaceAll('"', '\\"');
                                        await executeSlashCommand(`/stlo "${escapedName}"`);
                                        blocker.remove();
                                        menuTrigger.style.anchorName = '';
                                    });
                                    stloButton.addEventListener('keydown', (evt)=>{
                                        if (evt.key === 'Enter' || evt.key === ' ') {
                                            evt.preventDefault();
                                            stloButton.click();
                                        }
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-bars-staggered');
                                        stloButton.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Configure STLO';
                                        stloButton.append(txt);
                                    }
                                    menu.append(stloButton);
                                }
                                const exp = document.createElement('div'); {
                                    exp.classList.add('stwid--item');
                                    exp.classList.add('stwid--export');
                                    exp.addEventListener('click', async(evt)=>{
                                        download(JSON.stringify({ entries:cache[name].entries }), name, 'application/json');
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-file-export');
                                        exp.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Export Book';
                                        exp.append(txt);
                                    }
                                    menu.append(exp);
                                }
                                const dup = document.createElement('div'); {
                                    dup.classList.add('stwid--item');
                                    dup.classList.add('stwid--duplicate');
                                    dup.addEventListener('click', async(evt)=>{
                                        //TODO cheeky monkey
                                        const sel = /**@type {HTMLSelectElement}*/(document.querySelector('#world_editor_select'));
                                        sel.value = /**@type {HTMLOptionElement[]}*/([...sel.children]).find(it=>it.textContent == name).value;
                                        sel.dispatchEvent(new Event('change', { bubbles:true }));
                                        await delay(500);
                                        document.querySelector('#world_duplicate').click();
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-paste');
                                        dup.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Duplicate Book';
                                        dup.append(txt);
                                    }
                                    menu.append(dup);
                                }
                                const del = document.createElement('div'); {
                                    del.classList.add('stwid--item');
                                    del.classList.add('stwid--delete');
                                    del.addEventListener('click', async(evt)=>{
                                        //TODO cheeky monkey
                                        const sel = /**@type {HTMLSelectElement}*/(document.querySelector('#world_editor_select'));
                                        sel.value = /**@type {HTMLOptionElement[]}*/([...sel.children]).find(it=>it.textContent == name).value;
                                        sel.dispatchEvent(new Event('change', { bubbles:true }));
                                        await delay(500);
                                        document.querySelector('#world_popup_delete').click();
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-trash-can');
                                        del.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Delete Book';
                                        del.append(txt);
                                    }
                                    menu.append(del);
                                }
                                blocker.append(menu);
                            }
                            document.body.append(blocker);
                        }
                    });
                    actions.append(menuTrigger);
                }
                collapseToggle = document.createElement('div'); {
                    cache[name].dom.collapseToggle = collapseToggle;
                    collapseToggle.classList.add('stwid--action');
                    collapseToggle.classList.add('stwid--collapseToggle');
                    collapseToggle.classList.add('fa-solid', 'fa-fw', 'fa-chevron-down');
                    collapseToggle.addEventListener('click', ()=>{
                        const isCollapsed = !entryList.classList.contains('stwid--isCollapsed');
                        setBookCollapsed(name, isCollapsed);
                    });
                    actions.append(collapseToggle);
                }
                head.append(actions);
            }
            book.append(head);
        }
        const entryList = document.createElement('div'); {
            world.dom.entryList = entryList;
            entryList.classList.add('stwid--entryList');
            entryList.classList.add('stwid--isCollapsed');
            const { sort, direction } = getBookSortChoice(name);
            for (const e of sortEntries(Object.values(world.entries), sort, direction)) {
                await renderEntry(e, name);
            }
            const initialCollapsed = collapseStates[name] ?? entryList.classList.contains('stwid--isCollapsed');
            setBookCollapsed(name, initialCollapsed);
            book.append(entryList);
        }
        if (before) before.insertAdjacentElement('beforebegin', book);
        else dom.books.append(book);
    }
    return book;
};
const loadList = async()=>{
    dom.books.innerHTML = '';
    const books = await Promise.all(safeToSorted(world_names, (a,b)=>a.toLowerCase().localeCompare(b.toLowerCase())).map(async(name)=>({ name, data:await loadWorldInfo(name) })));
    for (const book of books) {
        await renderBook(book.name, null, book.data);
    }
};
const loadListDebounced = debounceAsync(()=>loadList());


const addDrawer = ()=>{
    document.addEventListener('keydown', async(evt)=>{
        // only run when drawer is open
        if (document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2).closest('.stwid--body')) {
            // abort if no active selection
            if (selectFrom === null || !selectList?.length) return;
            console.log('[STWID]', evt.key);
            switch (evt.key) {
                case 'Delete': {
                    evt.preventDefault();
                    evt.stopPropagation();
                    const srcBook = await loadWorldInfo(selectFrom);
                    for (const srcEntry of selectList) {
                        const uid = srcEntry.uid;
                        const deleted = await deleteWorldInfoEntry(srcBook, uid, { silent:true });
                        if (deleted) {
                            deleteWIOriginalDataValue(srcBook, uid);
                        }
                    }
                    await saveWorldInfo(selectFrom, srcBook, true);
                    updateWIChange(selectFrom, srcBook);
                    selectEnd();
                    break;
                }
            }
        }
    });
    document.body.classList.add('stwid--');
    const holder = document.querySelector('#wi-holder');
    const drawerContent = document.querySelector('#WorldInfo'); {
        const SPLITTER_STORAGE_KEY = 'stwid--list-width';
        const MIN_LIST_WIDTH = 150;
        const MIN_EDITOR_WIDTH = 300;
        let searchEntriesInput;
        let searchInput;
        const body = document.createElement('div'); {
            dom.drawer.body = body;
            body.classList.add('stwid--body');
            body.classList.add('stwid--isLoading');
            const list = document.createElement('div'); {
                list.classList.add('stwid--list');
                    const controls = document.createElement('div'); {
                        controls.classList.add('stwid--controls');
                        const controlsPrimary = document.createElement('div');
                        controlsPrimary.classList.add('stwid--controlsRow');
                        const add = /**@type {HTMLElement}*/(document.querySelector('#world_create_button').cloneNode(true)); {
                            add.removeAttribute('id');
                            add.classList.add('stwid--addBook');
                            add.title = 'Create New Book';
                            add.querySelector('span')?.remove();
                            add.addEventListener('click', async()=>{
                                const startPromise = updateWIChangeStarted.promise;
                                const tempName = getFreeWorldName();
                                const finalName = await Popup.show.input('Create a new World Info', 'Enter a name for the new file:', tempName);
                                if (finalName) {
                                const created = await createNewWorldInfo(finalName, { interactive: true });
                                if (created) {
                                    await startPromise;
                                    await updateWIChangeFinished.promise;
                                    setBookCollapsed(finalName, false);
                                    cache[finalName].dom.root.scrollIntoView({ block:'center', inline:'center' });
                                }
                            }
                        });
                        controlsPrimary.append(add);
                    }
                    const imp = document.createElement('div'); {
                        imp.classList.add('menu_button');
                        imp.classList.add('fa-solid', 'fa-fw', 'fa-file-import');
                        imp.title = 'Import Book';
                        imp.addEventListener('click', ()=>{
                            /**@type {HTMLInputElement}*/(document.querySelector('#world_import_file')).click();
                        });
                        controlsPrimary.append(imp);
                    }
                    const refresh = document.createElement('div'); {
                        refresh.classList.add('menu_button');
                        refresh.classList.add('fa-solid', 'fa-fw', 'fa-arrows-rotate');
                        refresh.title = 'Refresh';
                        refresh.addEventListener('click', async()=>{
                            dom.drawer.body.classList.add('stwid--isLoading');
                            dom.editor.innerHTML = '';
                            currentEditor = null;
                            for (const [bookName, bookData] of Object.entries(cache)) {
                                const isCollapsed = bookData?.dom?.entryList?.classList.contains('stwid--isCollapsed');
                                if (isCollapsed !== undefined) setCollapseState(bookName, isCollapsed);
                                delete cache[bookName];
                            }
                            try {
                                await loadListDebounced();
                                searchInput?.dispatchEvent(new Event('input'));
                            } finally {
                                dom.drawer.body.classList.remove('stwid--isLoading');
                            }
                        });
                        controlsPrimary.append(refresh);
                    }
                    const settings = document.createElement('div'); {
                        dom.activationToggle = settings;
                        settings.classList.add('stwid--activation');
                        settings.classList.add('menu_button');
                        settings.classList.add('fa-solid', 'fa-fw', 'fa-cog');
                        settings.title = 'Global Activation Settings';
                        settings.addEventListener('click', ()=>{
                            if (!activationBlock || !activationBlockParent) return;
                            const is = settings.classList.toggle('stwid--active');
                            currentEditor = null;
                            if (is) {
                                dom.editor.innerHTML = '';
                                if (dom.order.toggle.classList.contains('stwid--active')) {
                                    dom.order.toggle.click();
                                }
                                for (const cb of Object.values(cache)) {
                                    for (const ce of Object.values(cb.dom.entry)) {
                                        ce.root.classList.remove('stwid--active');
                                    }
                                }
                                const h4 = document.createElement('h4'); {
                                    h4.textContent = 'Global World Info/Lorebook activation settings';
                                    dom.editor.append(h4);
                                }
                                dom.editor.append(activationBlock);
                            } else {
                                activationBlockParent.append(activationBlock);
                                dom.editor.innerHTML = '';
                            }
                        });
                        controlsPrimary.append(settings);
                    }
                    const order = document.createElement('div'); {
                        dom.order.toggle = order;
                        order.classList.add('menu_button');
                        order.classList.add('fa-solid', 'fa-fw', 'fa-arrow-down-wide-short');
                        order.title = 'Order Helper\n---\nUse drag and drop to help assign an "Order" value to entries of all active books.';
                        order.addEventListener('click', ()=>{
                            const isActive = order.classList.contains('stwid--active');
                            if (isActive) {
                                order.classList.remove('stwid--active');
                                dom.editor.innerHTML = '';
                                currentEditor = null;
                                return;
                            }
                            openOrderHelper();
                        });
                        controlsPrimary.append(order);
                    }
                    const collapseAllToggle = document.createElement('button'); {
                        dom.collapseAllToggle = collapseAllToggle;
                        collapseAllToggle.type = 'button';
                        collapseAllToggle.classList.add('menu_button');
                        collapseAllToggle.classList.add('stwid--collapseAllToggle');
                        const icon = document.createElement('i'); {
                            icon.classList.add('fa-solid', 'fa-fw');
                            collapseAllToggle.append(icon);
                        }
                        updateCollapseAllToggle();
                        collapseAllToggle.addEventListener('click', ()=>{
                            const shouldCollapse = hasExpandedBooks();
                            for (const name of Object.keys(cache)) {
                                setBookCollapsed(name, shouldCollapse);
                            }
                            updateCollapseAllToggle();
                        });
                        controlsPrimary.append(collapseAllToggle);
                    }
                    const controlsSecondary = document.createElement('div');
                    controlsSecondary.classList.add('stwid--controlsRow', 'stwid--orderControls');
                    const sortSel = document.createElement('select'); {
                        sortSel.classList.add('text_pole');
                        sortSel.addEventListener('change', ()=>{
                            const value = JSON.parse(sortSel.value);
                            Settings.instance.sortLogic = value.sort;
                            Settings.instance.sortDirection = value.direction;
                            for (const name of Object.keys(cache)) {
                                sortEntriesIfNeeded(name);
                            }
                            Settings.instance.save();
                        });
                        appendSortOptions(sortSel, Settings.instance.sortLogic, Settings.instance.sortDirection);
                        controlsSecondary.append(sortSel);
                    }
                    const bookSortToggle = document.createElement('button'); {
                        bookSortToggle.type = 'button';
                        bookSortToggle.classList.add('menu_button');
                        bookSortToggle.classList.add('stwid--bookSortToggle');
                        const icon = document.createElement('i'); {
                            icon.classList.add('fa-solid', 'fa-fw');
                            bookSortToggle.append(icon);
                        }
                        const updateToggleState = ()=>{
                            const enabled = Settings.instance.useBookSorts;
                            bookSortToggle.classList.toggle('stwid--active', enabled);
                            bookSortToggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
                            icon.classList.toggle('fa-toggle-on', enabled);
                            icon.classList.toggle('fa-toggle-off', !enabled);
                            const label = enabled ? 'Per-book sort: On' : 'Per-book sort: Off';
                            bookSortToggle.title = label;
                            bookSortToggle.setAttribute('aria-label', label);
                        };
                        updateToggleState();
                        bookSortToggle.addEventListener('click', ()=>{
                            Settings.instance.useBookSorts = !Settings.instance.useBookSorts;
                            Settings.instance.save();
                            updateToggleState();
                            for (const name of Object.keys(cache)) {
                                sortEntriesIfNeeded(name);
                            }
                        });
                        controlsSecondary.append(bookSortToggle);
                    }
                    const clearBookSorts = document.createElement('button'); {
                        clearBookSorts.type = 'button';
                        clearBookSorts.classList.add('menu_button');
                        clearBookSorts.classList.add('stwid--clearBookSorts');
                        const icon = document.createElement('i'); {
                            icon.classList.add('fa-solid', 'fa-fw', 'fa-broom');
                            clearBookSorts.append(icon);
                        }
                        clearBookSorts.title = 'Clear All Preferences';
                        clearBookSorts.setAttribute('aria-label', 'Clear All Preferences');
                        clearBookSorts.addEventListener('click', async()=>{
                            clearBookSorts.disabled = true;
                            try {
                                await clearBookSortPreferences();
                            } finally {
                                clearBookSorts.disabled = false;
                            }
                        });
                        controlsSecondary.append(clearBookSorts);
                    }
                    controls.append(controlsPrimary, controlsSecondary);
                    list.append(controls);
                }
                const filter = document.createElement('div'); {
                    filter.classList.add('stwid--filter');
                    const search = document.createElement('input'); {
                        search.classList.add('stwid--search');
                        search.classList.add('text_pole');
                        search.type = 'search';
                        search.placeholder = 'Search books';
                        searchInput = search;
                        const entryMatchesQuery = (entry, query)=>{
                            const title = entry.comment ?? '';
                            const memo = entry.title ?? '';
                            const keys = Array.isArray(entry.key) ? entry.key.join(', ') : '';
                            const normalizedQuery = query.toLowerCase();
                            return [title, memo, keys].some(value=>String(value ?? '').toLowerCase().includes(normalizedQuery));
                        };

                        search.addEventListener('input', ()=>{
                            const query = search.value.toLowerCase();
                            for (const b of Object.keys(cache)) {
                                if (query.length) {
                                    const bookMatch = b.toLowerCase().includes(query);
                                    const entryMatch = searchEntriesInput.checked && Object.values(cache[b].entries).find(e=>entryMatchesQuery(e, query));
                                    if (bookMatch || entryMatch) {
                                        cache[b].dom.root.classList.remove('stwid--filter-query');
                                        if (searchEntriesInput.checked) {
                                            for (const e of Object.values(cache[b].entries)) {
                                                if (bookMatch || entryMatchesQuery(e, query)) {
                                                    cache[b].dom.entry[e.uid].root.classList.remove('stwid--filter-query');
                                                } else {
                                                    cache[b].dom.entry[e.uid].root.classList.add('stwid--filter-query');
                                                }
                                            }
                                        }
                                    } else {
                                        cache[b].dom.root.classList.add('stwid--filter-query');
                                    }
                                } else {
                                    cache[b].dom.root.classList.remove('stwid--filter-query');
                                    for (const e of Object.values(cache[b].entries)) {
                                        cache[b].dom.entry[e.uid].root.classList.remove('stwid--filter-query');
                                    }
                                }
                            }
                        });
                        filter.append(search);
                    }
                    const searchEntries = document.createElement('label'); {
                        searchEntries.classList.add('stwid--searchEntries');
                        searchEntries.title = 'Search through entries as well (Title/Memo/Keys)';
                        const inp = document.createElement('input'); {
                            searchEntriesInput = inp;
                            inp.type = 'checkbox';
                            inp.addEventListener('click', ()=>{
                                search.dispatchEvent(new Event('input'));
                            });
                            searchEntries.append(inp);
                        }
                        searchEntries.append('Entries');
                        filter.append(searchEntries);
                    }
                    const filterActive = document.createElement('label'); {
                        filterActive.classList.add('stwid--filterActive');
                        filterActive.title = 'Only show globally active books';
                        const inp = document.createElement('input'); {
                            inp.type = 'checkbox';
                            inp.addEventListener('click', ()=>{
                                for (const b of Object.keys(cache)) {
                                    if (inp.checked) {
                                        if (selected_world_info.includes(b)) {
                                            cache[b].dom.root.classList.remove('stwid--filter-active');
                                        } else {
                                            cache[b].dom.root.classList.add('stwid--filter-active');
                                        }
                                    } else {
                                        cache[b].dom.root.classList.remove('stwid--filter-active');
                                    }
                                }
                            });
                            filterActive.append(inp);
                        }
                        filterActive.append('Active');
                        filter.append(filterActive);
                    }
                    list.append(filter);
                }
                const books = document.createElement('div'); {
                    dom.books = books;
                    books.classList.add('stwid--books');
                    list.append(books);
                }
                body.append(list);
            }
            const splitter = document.createElement('div'); {
                splitter.classList.add('stwid--splitter');
                body.append(splitter);
                const applyListWidth = (value)=>{
                    const clamped = Math.max(MIN_LIST_WIDTH, value);
                    list.style.flexBasis = `${clamped}px`;
                    list.style.width = `${clamped}px`;
                };
                const storedWidth = Number.parseInt(localStorage.getItem(SPLITTER_STORAGE_KEY) ?? '', 10);
                if (!Number.isNaN(storedWidth)) {
                    applyListWidth(storedWidth);
                }
                splitter.addEventListener('pointerdown', (evt)=>{
                    evt.preventDefault();
                    splitter.setPointerCapture(evt.pointerId);
                    const startX = evt.clientX;
                    const startWidth = list.getBoundingClientRect().width;
                    const splitterWidth = splitter.getBoundingClientRect().width || 6;
                    const onMove = (moveEvt)=>{
                        const delta = moveEvt.clientX - startX;
                        const maxWidth = Math.max(MIN_LIST_WIDTH, body.clientWidth - splitterWidth - MIN_EDITOR_WIDTH);
                        const nextWidth = Math.min(Math.max(MIN_LIST_WIDTH, startWidth + delta), maxWidth);
                        applyListWidth(nextWidth);
                    };
                    const onUp = (upEvt)=>{
                        splitter.releasePointerCapture(upEvt.pointerId);
                        window.removeEventListener('pointermove', onMove);
                        window.removeEventListener('pointerup', onUp);
                        const finalWidth = Math.round(list.getBoundingClientRect().width);
                        localStorage.setItem(SPLITTER_STORAGE_KEY, String(finalWidth));
                    };
                    window.addEventListener('pointermove', onMove);
                    window.addEventListener('pointerup', onUp);
                });
            }
            const editor = document.createElement('div'); {
                dom.editor = editor;
                editor.classList.add('stwid--editor');
                body.append(editor);
            }
            drawerContent.append(body);
        }
    }
    drawerContent.querySelector('h3 > span').addEventListener('click', ()=>{
        const is = document.body.classList.toggle('stwid--');
        if (!is) {
            if (dom.activationToggle.classList.contains('stwid--active')) {
                dom.activationToggle.click();
            }
        }
    });
    const moSel = new MutationObserver(()=>updateWIChangeDebounced());
    moSel.observe(document.querySelector('#world_editor_select'), { childList: true });
    const moDrawer = new MutationObserver(muts=>{
        if (drawerContent.getAttribute('style').includes('display: none;')) return;
        if (currentEditor) {
            cache[currentEditor.name].dom.entry[currentEditor.uid].root.click();
        }
    });
    moDrawer.observe(drawerContent, { attributes:true, attributeFilter:['style'] });
};
addDrawer();
loadListDebounced().then(()=>dom.drawer.body.classList.remove('stwid--isLoading'));


let isDiscord;
const checkDiscord = async()=>{
    let newIsDiscord = window.getComputedStyle(document.body).getPropertyValue('--nav-bar-width') !== '';
    if (isDiscord != newIsDiscord) {
        isDiscord = newIsDiscord;
        document.body.classList[isDiscord ? 'remove' : 'add']('stwid--nonDiscord');
    }
    setTimeout(()=>checkDiscord(), 1000);
};
checkDiscord();
