import { setFolderCollapsed } from './lorebookFolders.js';

const FOLDER_COLLAPSE_STORAGE_KEY = 'stwid--folder-collapse-states';

const state = {
    searchInput: null,
    searchEntriesInput: null,
    bookVisibilityMode: 'allBooks',
    bookVisibilitySelections: new Set(),
    bookVisibilityMenu: null,
    bookVisibilityChips: null,
    loadListDebounced: null,
    folderImportInput: null,
    entrySearchCache: {},
    collapseStates: {},
    folderCollapseStates: {},
    folderDoms: {},
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
        return state.collapseStates[name];
    },
    setCollapseState(name, isCollapsed) {
        state.collapseStates[name] = Boolean(isCollapsed);
    },
    get folderCollapseStates() {
        return state.folderCollapseStates;
    },
    get folderDoms() {
        return state.folderDoms;
    },
    getFolderDom(name) {
        return state.folderDoms[name] ?? null;
    },
    setFolderDom(name, value) {
        if (typeof name !== 'string' || !name) return;
        state.folderDoms[name] = value;
    },
    deleteFolderDom(name) {
        delete state.folderDoms[name];
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
        state.entrySearchCache[bookName] ??= {};
        return state.entrySearchCache[bookName];
    },
    getEntrySearchCacheValue(bookName, uid) {
        return state.entrySearchCache[bookName]?.[uid];
    },
    setEntrySearchCacheValue(bookName, uid, value) {
        state.entrySearchCache[bookName] ??= {};
        state.entrySearchCache[bookName][uid] = value;
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

const loadFolderCollapseStates = ()=>{
    if (typeof localStorage === 'undefined') return {};
    try {
        const raw = localStorage.getItem(FOLDER_COLLAPSE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        console.warn('[STWID] Failed to load folder collapse states', error);
        return {};
    }
};

const saveFolderCollapseStates = ()=>{
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(FOLDER_COLLAPSE_STORAGE_KEY, JSON.stringify(listPanelState.folderCollapseStates));
    } catch (error) {
        console.warn('[STWID] Failed to save folder collapse states', error);
    }
};

export const setFolderCollapsedAndPersist = (folderName, isCollapsed, { transientExpand = false } = {})=>{
    const folderDom = listPanelState.getFolderDom(folderName);
    if (transientExpand && !isCollapsed) {
        // View-only expand: do not mutate persisted defaults.
        setFolderCollapsed(folderDom, false);
        return;
    }

    listPanelState.folderCollapseStates[folderName] = Boolean(isCollapsed);

    // "transientExpand" means: show expanded right now, but keep the stored default unchanged.
    if (!transientExpand) {
        saveFolderCollapseStates();
    }

    setFolderCollapsed(folderDom, Boolean(isCollapsed));
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
        const isCollapsed = bookData?.dom?.entryList?.classList.contains('stwid--isCollapsed');
        if (isCollapsed !== undefined) setCollapseState(bookName, isCollapsed);
    }
};

export const clearCacheBooks = (cache)=>{
    for (const bookName of Object.keys(cache ?? {})) {
        delete cache[bookName];
    }
};
