import { setFolderCollapsed } from './book-list/book-folders/book-folders.lorebook-folders.js';

const FOLDER_COLLAPSE_STORAGE_KEY = 'stwid--folder-collapse-states';
const MAX_ENTRY_CACHE_SIZE = 10000;
const createSafeStateMap = ()=>Object.create(null);
const normalizeStateKey = (value)=>{
    if (typeof value !== 'string') return null;
    return value.length ? value : null;
};
const normalizeEntryCacheKey = (value)=>{
    if (value === null || value === undefined) return null;
    return String(value);
};

const state = {
    searchInput: null,
    searchEntriesInput: null,
    bookVisibilityMode: 'allBooks',
    bookVisibilitySelections: new Set(),
    bookVisibilityMenu: null,
    bookVisibilityChips: null,
    loadListDebounced: null,
    folderImportInput: null,
    entrySearchCache: createSafeStateMap(),
    collapseStates: createSafeStateMap(),
    folderCollapseStates: createSafeStateMap(),
    folderDoms: createSafeStateMap(),
    selectLast: null,
    selectFrom: null,
    selectMode: null,
    selectList: null,
    selectToast: null,
    dragBookName: null,
    folderMenuActions: null,
};

export const listPanelState = {
    get searchInput() {
        return state.searchInput;
    },
    set searchInput(value) {
        state.searchInput = value ?? null;
    },
    get searchEntriesInput() {
        return state.searchEntriesInput;
    },
    set searchEntriesInput(value) {
        state.searchEntriesInput = value ?? null;
    },
    get bookVisibilityMode() {
        return state.bookVisibilityMode;
    },
    set bookVisibilityMode(value) {
        state.bookVisibilityMode = value ?? 'allBooks';
    },
    get bookVisibilitySelections() {
        return state.bookVisibilitySelections;
    },
    set bookVisibilitySelections(value) {
        state.bookVisibilitySelections = value instanceof Set ? value : new Set();
    },
    get bookVisibilityMenu() {
        return state.bookVisibilityMenu;
    },
    set bookVisibilityMenu(value) {
        state.bookVisibilityMenu = value ?? null;
    },
    get bookVisibilityChips() {
        return state.bookVisibilityChips;
    },
    set bookVisibilityChips(value) {
        state.bookVisibilityChips = value ?? null;
    },
    get loadListDebounced() {
        return state.loadListDebounced;
    },
    set loadListDebounced(value) {
        state.loadListDebounced = value ?? null;
    },
    get folderImportInput() {
        return state.folderImportInput;
    },
    set folderImportInput(value) {
        state.folderImportInput = value ?? null;
    },
    get entrySearchCache() {
        return state.entrySearchCache;
    },
    get collapseStates() {
        return state.collapseStates;
    },
    getCollapseState(name) {
        const key = normalizeStateKey(name);
        if (!key) return undefined;
        return state.collapseStates[key];
    },
    setCollapseState(name, isCollapsed) {
        const key = normalizeStateKey(name);
        if (!key) return;
        state.collapseStates[key] = Boolean(isCollapsed);
    },
    get folderCollapseStates() {
        return state.folderCollapseStates;
    },
    getFolderCollapseState(name) {
        const key = normalizeStateKey(name);
        if (!key) return undefined;
        return state.folderCollapseStates[key];
    },
    setFolderCollapseState(name, isCollapsed) {
        const key = normalizeStateKey(name);
        if (!key) return;
        state.folderCollapseStates[key] = Boolean(isCollapsed);
    },
    get folderDoms() {
        return state.folderDoms;
    },
    getFolderDom(name) {
        const key = normalizeStateKey(name);
        if (!key) return null;
        return state.folderDoms[key] ?? null;
    },
    setFolderDom(name, value) {
        const key = normalizeStateKey(name);
        if (!key) return;
        state.folderDoms[key] = value;
    },
    deleteFolderDom(name) {
        const key = normalizeStateKey(name);
        if (!key) return;
        delete state.folderDoms[key];
    },
    clearFolderDoms() {
        clearObjectKeys(state.folderDoms);
    },
    getFolderDomNames() {
        return Object.keys(state.folderDoms);
    },
    getFolderDomValues() {
        return Object.values(state.folderDoms);
    },
    ensureEntrySearchCacheBook(bookName) {
        const bookKey = normalizeStateKey(bookName);
        if (!bookKey) return null;
        state.entrySearchCache[bookKey] ??= createSafeStateMap();
        return state.entrySearchCache[bookKey];
    },
    getEntrySearchCacheValue(bookName, uid) {
        const bookKey = normalizeStateKey(bookName);
        const entryKey = normalizeEntryCacheKey(uid);
        if (!bookKey || !entryKey) return undefined;
        return state.entrySearchCache[bookKey]?.[entryKey];
    },
    setEntrySearchCacheValue(bookName, uid, value) {
        const bookKey = normalizeStateKey(bookName);
        const entryKey = normalizeEntryCacheKey(uid);
        if (!bookKey || !entryKey) return;
        state.entrySearchCache[bookKey] ??= createSafeStateMap();
        state.entrySearchCache[bookKey][entryKey] = value;
        if (getEntrySearchCacheEntryCount() > MAX_ENTRY_CACHE_SIZE) {
            clearEntrySearchCache();
        }
    },
    pruneEntrySearchCacheStaleBooks(activeBookNames) {
        const activeSet = new Set(activeBookNames);
        for (const bookKey of Object.keys(state.entrySearchCache)) {
            if (!activeSet.has(bookKey)) {
                delete state.entrySearchCache[bookKey];
            }
        }
    },
    get selectLast() {
        return state.selectLast;
    },
    set selectLast(value) {
        state.selectLast = value ?? null;
    },
    get selectFrom() {
        return state.selectFrom;
    },
    set selectFrom(value) {
        state.selectFrom = value ?? null;
    },
    get selectMode() {
        return state.selectMode;
    },
    set selectMode(value) {
        state.selectMode = value ?? null;
    },
    get selectList() {
        return state.selectList;
    },
    set selectList(value) {
        state.selectList = value ?? null;
    },
    get selectToast() {
        return state.selectToast;
    },
    set selectToast(value) {
        state.selectToast = value ?? null;
    },
    get dragBookName() {
        return state.dragBookName;
    },
    set dragBookName(value) {
        state.dragBookName = value ?? null;
    },
    get folderMenuActions() {
        return state.folderMenuActions;
    },
    set folderMenuActions(value) {
        state.folderMenuActions = value ?? null;
    },
};

const clearObjectKeys = (target)=>{
    for (const key of Object.keys(target)) {
        delete target[key];
    }
};

const getEntrySearchCacheEntryCount = ()=>{
    let total = 0;
    for (const bookCache of Object.values(state.entrySearchCache)) {
        total += Object.keys(bookCache ?? {}).length;
    }
    return total;
};

const loadFolderCollapseStates = ()=>{
    if (typeof localStorage === 'undefined') return createSafeStateMap();
    try {
        const raw = localStorage.getItem(FOLDER_COLLAPSE_STORAGE_KEY);
        if (!raw) return createSafeStateMap();
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return createSafeStateMap();
        }
        const normalized = createSafeStateMap();
        for (const [folderName, isCollapsed] of Object.entries(parsed)) {
            const key = normalizeStateKey(folderName);
            if (!key) continue;
            normalized[key] = Boolean(isCollapsed);
        }
        return normalized;
    } catch (error) {
        console.warn('[STWID] Failed to load folder collapse states', error);
        return createSafeStateMap();
    }
};

const saveFolderCollapseStates = ()=>{
    if (typeof localStorage === 'undefined') return false;
    try {
        localStorage.setItem(FOLDER_COLLAPSE_STORAGE_KEY, JSON.stringify(listPanelState.folderCollapseStates));
        return true;
    } catch (error) {
        console.warn('[STWID] Failed to save folder collapse states', error);
        return false;
    }
};

export const setFolderCollapsedAndPersist = (
    folderName,
    isCollapsed,
    { transientExpand = false, persist = true } = {},
)=>{
    const folderDom = listPanelState.getFolderDom(folderName);
    if (transientExpand && !isCollapsed) {
        
        setFolderCollapsed(folderDom, false);
        return;
    }

    listPanelState.setFolderCollapseState(folderName, isCollapsed);

    
    if (!transientExpand && persist) {
        const saved = saveFolderCollapseStates();
        if (!saved) {
            toastr.warning('Folder collapse state could not be saved. Browser storage may be full.');
        }
    }

    setFolderCollapsed(folderDom, Boolean(isCollapsed));
};

export const persistFolderCollapseStates = ()=>{
    const saved = saveFolderCollapseStates();
    if (!saved) {
        toastr.warning('Folder collapse state could not be saved. Browser storage may be full.');
    }
};

export const resetBookVisibilityState = (bookVisibilityModes)=>{
    listPanelState.bookVisibilityMode = bookVisibilityModes.ALL_BOOKS;
    listPanelState.bookVisibilitySelections = new Set();
    listPanelState.bookVisibilityMenu = null;
    listPanelState.bookVisibilityChips = null;
};

export const clearEntrySearchCache = ()=>{
    clearObjectKeys(listPanelState.entrySearchCache);
};

export const hydrateFolderCollapseStates = ()=>{
    clearObjectKeys(listPanelState.folderCollapseStates);
    Object.assign(listPanelState.folderCollapseStates, loadFolderCollapseStates());
};

export const resetSelectionMemory = (clearToast)=>{
    listPanelState.selectFrom = null;
    listPanelState.selectMode = null;
    listPanelState.selectList = null;
    listPanelState.selectLast = null;
    if (listPanelState.selectToast) {
        clearToast?.(listPanelState.selectToast);
    }
};


export const captureBookCollapseStatesFromDom = (cache, setCollapseState)=>{
    for (const [bookName, bookData] of Object.entries(cache ?? {})) {
        const isCollapsed = bookData?.dom?.entryList?.classList.contains('stwid--state-collapsed');
        if (isCollapsed !== undefined) setCollapseState(bookName, isCollapsed);
    }
};

export const clearCacheBooks = (cache, clearToast)=>{
    for (const bookName of Object.keys(cache ?? {})) {
        delete cache[bookName];
    }
    resetSelectionMemory(clearToast);
};
