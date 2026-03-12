import { setFolderCollapsed } from './book-list/book-folders/book-folders.folder-dom.js';

const DEFAULT_BOOK_VISIBILITY_MODE = 'allBooks';
const FOLDER_COLLAPSE_STORAGE_KEY = 'stwid--folder-collapse-states';
const FOLDER_COLLAPSE_SAVE_WARNING = 'Folder collapse state could not be saved. Browser storage may be full.';
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
const defineNullableStateAccessors = (target, stateStore, propertyNames)=>{
    for (const propertyName of propertyNames) {
        Object.defineProperty(target, propertyName, {
            get() {
                return stateStore[propertyName];
            },
            set(value) {
                stateStore[propertyName] = value ?? null;
            },
            enumerable: true,
            configurable: true,
        });
    }
};
const readNormalizedBooleanState = (stateMap, name)=>{
    const key = normalizeStateKey(name);
    if (!key) return undefined;
    return stateMap[key];
};
const writeNormalizedBooleanState = (stateMap, name, isCollapsed)=>{
    const key = normalizeStateKey(name);
    if (!key) return;
    stateMap[key] = Boolean(isCollapsed);
};

const bookBrowserStateStore = {
    searchInput: null,
    searchEntriesInput: null,
    bookVisibilityMode: DEFAULT_BOOK_VISIBILITY_MODE,
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
    get bookVisibilityMode() {
        return bookBrowserStateStore.bookVisibilityMode;
    },
    set bookVisibilityMode(value) {
        bookBrowserStateStore.bookVisibilityMode = value ?? DEFAULT_BOOK_VISIBILITY_MODE;
    },
    get bookVisibilitySelections() {
        return bookBrowserStateStore.bookVisibilitySelections;
    },
    set bookVisibilitySelections(value) {
        bookBrowserStateStore.bookVisibilitySelections = value instanceof Set ? value : new Set();
    },
    get entrySearchCache() {
        return bookBrowserStateStore.entrySearchCache;
    },
    get collapseStates() {
        return bookBrowserStateStore.collapseStates;
    },
    getCollapseState(name) {
        return readNormalizedBooleanState(bookBrowserStateStore.collapseStates, name);
    },
    setCollapseState(name, isCollapsed) {
        writeNormalizedBooleanState(bookBrowserStateStore.collapseStates, name, isCollapsed);
    },
    get folderCollapseStates() {
        return bookBrowserStateStore.folderCollapseStates;
    },
    getFolderCollapseState(name) {
        return readNormalizedBooleanState(bookBrowserStateStore.folderCollapseStates, name);
    },
    setFolderCollapseState(name, isCollapsed) {
        writeNormalizedBooleanState(bookBrowserStateStore.folderCollapseStates, name, isCollapsed);
    },
    get folderDoms() {
        return bookBrowserStateStore.folderDoms;
    },
    getFolderDom(name) {
        const key = normalizeStateKey(name);
        if (!key) return null;
        return bookBrowserStateStore.folderDoms[key] ?? null;
    },
    setFolderDom(name, value) {
        const key = normalizeStateKey(name);
        if (!key) return;
        bookBrowserStateStore.folderDoms[key] = value;
    },
    deleteFolderDom(name) {
        const key = normalizeStateKey(name);
        if (!key) return;
        delete bookBrowserStateStore.folderDoms[key];
    },
    clearFolderDoms() {
        clearObjectKeys(bookBrowserStateStore.folderDoms);
    },
    getFolderDomNames() {
        return Object.keys(bookBrowserStateStore.folderDoms);
    },
    getFolderDomValues() {
        return Object.values(bookBrowserStateStore.folderDoms);
    },
    ensureEntrySearchCacheBook(bookName) {
        const bookKey = normalizeStateKey(bookName);
        if (!bookKey) return null;
        bookBrowserStateStore.entrySearchCache[bookKey] ??= createSafeStateMap();
        return bookBrowserStateStore.entrySearchCache[bookKey];
    },
    getEntrySearchCacheValue(bookName, uid) {
        const bookKey = normalizeStateKey(bookName);
        const entryKey = normalizeEntryCacheKey(uid);
        if (!bookKey || !entryKey) return undefined;
        return bookBrowserStateStore.entrySearchCache[bookKey]?.[entryKey];
    },
    setEntrySearchCacheValue(bookName, uid, value) {
        const bookKey = normalizeStateKey(bookName);
        const entryKey = normalizeEntryCacheKey(uid);
        if (!bookKey || !entryKey) return;
        bookBrowserStateStore.entrySearchCache[bookKey] ??= createSafeStateMap();
        bookBrowserStateStore.entrySearchCache[bookKey][entryKey] = value;
        if (getEntrySearchCacheEntryCount() > MAX_ENTRY_CACHE_SIZE) {
            clearEntrySearchCache();
        }
    },
    pruneEntrySearchCacheStaleBooks(activeBookNames) {
        const activeSet = new Set(activeBookNames);
        for (const bookKey of Object.keys(bookBrowserStateStore.entrySearchCache)) {
            if (!activeSet.has(bookKey)) {
                delete bookBrowserStateStore.entrySearchCache[bookKey];
            }
        }
    },
};

const clearObjectKeys = (target)=>{
    for (const key of Object.keys(target)) {
        delete target[key];
    }
};

const getEntrySearchCacheEntryCount = ()=>{
    let total = 0;
    for (const bookCache of Object.values(bookBrowserStateStore.entrySearchCache)) {
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
const saveFolderCollapseStatesWithWarning = ()=>{
    const saved = saveFolderCollapseStates();
    if (!saved) {
        toastr.warning(FOLDER_COLLAPSE_SAVE_WARNING);
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
        saveFolderCollapseStatesWithWarning();
    }

    setFolderCollapsed(folderDom, Boolean(isCollapsed));
};

export const persistFolderCollapseStates = ()=>{
    saveFolderCollapseStatesWithWarning();
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

defineNullableStateAccessors(listPanelState, bookBrowserStateStore, [
    'searchInput',
    'searchEntriesInput',
    'bookVisibilityMenu',
    'bookVisibilityChips',
    'loadListDebounced',
    'folderImportInput',
    'selectLast',
    'selectFrom',
    'selectMode',
    'selectList',
    'selectToast',
    'dragBookName',
    'folderMenuActions',
]);

