import { cloneMetadata } from './sortHelpers.js';
import {
    createBookInFolder,
    getFolderFromMetadata,
    getFolderRegistry,
    registerFolderName,
    setFolderBooksActive,
    sanitizeFolderMetadata,
    setFolderInMetadata,
} from './lorebookFolders.js';
import {
    captureBookCollapseStatesFromDom,
    clearCacheBooks,
    clearEntrySearchCache,
    hydrateFolderCollapseStates,
    listPanelState,
    resetBookVisibilityState,
} from './listPanel.state.js';
import {
    CORE_UI_ACTION_SELECTORS,
    clickCoreUiAction as clickCoreUiActionBridge,
    setSelectedBookInCoreUi as setSelectedBookInCoreUiBridge,
} from './listPanel.coreBridge.js';
import {
    BOOK_VISIBILITY_MODES,
    createFilterBarSlice,
} from './listPanel.filterBar.js';
import { createSelectionDnDSlice } from './listPanel.selectionDnD.js';
import { createBookMenuSlice } from './listPanel.bookMenu.js';
import { createFoldersViewSlice } from './listPanel.foldersView.js';
import { createBooksViewSlice } from './listPanel.booksView.js';

// Core SillyTavern DOM anchors used by this extension.
// Keep these centralized so host selector drift is easier to audit.
const CORE_UI_SELECTORS = Object.freeze({
    importFileInput: '#world_import_file',
    worldInfoSelect: '#world_info',
});

// Module-level runtime references and UI state.
let state = {};

let filterBarSlice = null;
let selectionDnDSlice = null;
let bookMenuSlice = null;
let foldersViewSlice = null;
let booksViewSlice = null;
let listPanelInitialized = false;
let booksRootDragOverHandler = null;
let booksRootDropHandler = null;
let refreshRequestToken = 0;
let refreshCompletedToken = 0;
let refreshWorkerPromise = null;

// Source-link UI constants.
const SOURCE_ICON_DEFINITIONS = Object.freeze([
    { key:'character', icon:'fa-user', label:'Character' },
    { key:'chat', icon:'fa-comments', label:'Chat' },
    { key:'persona', icon:'fa-id-badge', label:'Persona' },
]);

// Book/folder collapse helpers.
const setCollapseState = (name, isCollapsed)=>{
    listPanelState.setCollapseState(name, isCollapsed);
};

const hasExpandedBooks = ()=>Object.values(state.cache).some((book)=>{
    const entryList = book?.dom?.entryList;
    return entryList && !entryList.classList.contains('stwid--state-collapsed');
});

const updateCollapseAllToggle = ()=>{
    const hasExpanded = hasExpandedBooks();
    const btn = state.dom.collapseAllToggle;
    if (!btn) return;
    const icon = btn.querySelector('i');
    icon?.classList.toggle('fa-compress', hasExpanded);
    icon?.classList.toggle('fa-expand', !hasExpanded);
    const label = hasExpanded ? 'Collapse All Books' : 'Expand All Books';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-pressed', hasExpanded ? 'true' : 'false');
};

const hasExpandedFolders = ()=>foldersViewSlice?.hasExpandedFolders() ?? false;
const updateCollapseAllFoldersToggle = ()=>foldersViewSlice?.updateCollapseAllFoldersToggle();
const setAllFoldersCollapsed = (isCollapsed)=>foldersViewSlice?.setAllFoldersCollapsed(isCollapsed);

const applyCollapseState = (name)=>{
    const isCollapsed = listPanelState.getCollapseState(name);
    const world = state.cache[name];
    if (isCollapsed === undefined
        || !world?.dom?.entryList
        || !world?.dom?.collapseToggle
        || !world.dom.entryList.isConnected
        || !world.dom.collapseToggle.isConnected) return;
    world.dom.entryList.classList.toggle('stwid--state-collapsed', isCollapsed);
    if (isCollapsed) {
        world.dom.collapseToggle.classList.remove('fa-chevron-up');
        world.dom.collapseToggle.classList.add('fa-chevron-down');
    } else {
        world.dom.collapseToggle.classList.add('fa-chevron-up');
        world.dom.collapseToggle.classList.remove('fa-chevron-down');
    }
};

const setBookCollapsed = (name, isCollapsed)=>{
    listPanelState.setCollapseState(name, isCollapsed);
    applyCollapseState(name);
    updateCollapseAllToggle();
};

// Book sort and source-link helpers.
const getBookSortChoice = (name)=>{
    const bookSort = state.Settings.instance.useBookSorts ? state.cache[name]?.sort : null;
    return {
        sort: bookSort?.sort ?? state.Settings.instance.sortLogic,
        direction: bookSort?.direction ?? state.Settings.instance.sortDirection,
    };
};

const normalizeBookSourceLinks = (links)=>({
    character: Boolean(links?.character),
    chat: Boolean(links?.chat),
    persona: Boolean(links?.persona),
});

const normalizeBookSourceLinkDetails = (links)=>({
    characterNames: Array.isArray(links?.characterNames)
        ? links.characterNames
            .filter((name)=>typeof name === 'string' && name.trim())
            .map((name)=>name.trim())
        : [],
    personaName: typeof links?.personaName === 'string' ? links.personaName.trim() : '',
});

const getSourceIconTooltip = (sourceKey, label, details)=>{
    if (sourceKey === 'character' && details.characterNames.length === 1) {
        return `Lorebook linked to character: ${details.characterNames[0]}`;
    }
    if (sourceKey === 'character' && details.characterNames.length > 1) {
        return `Lorebook linked to characters: ${details.characterNames.join(', ')}`;
    }
    if (sourceKey === 'persona' && details.personaName) {
        return `Lorebook linked to active persona: ${details.personaName}`;
    }
    return `${label} linked`;
};

const getBookVisibilityScope = (selectedNames = null)=>filterBarSlice?.getBookVisibilityScope(selectedNames) ?? [];

const renderBookSourceLinks = (sourceLinksContainer, links = null)=>{
    if (!sourceLinksContainer) return;
    const normalized = normalizeBookSourceLinks(links);
    const details = normalizeBookSourceLinkDetails(links);
    const nextDefs = SOURCE_ICON_DEFINITIONS.filter((def)=>normalized[def.key]);
    const nextKeys = new Set(nextDefs.map((def)=>def.key));
    const existingIconsByKey = new Map();

    for (const child of Array.from(sourceLinksContainer.children)) {
        if (!(child instanceof HTMLElement)) continue;
        if (!child.classList.contains('stwid--sourceIcon')) continue;
        const sourceKey = child.dataset.source
            || SOURCE_ICON_DEFINITIONS.find((def)=>child.classList.contains(def.icon))?.key;
        if (!sourceKey || existingIconsByKey.has(sourceKey)) {
            child.remove();
            continue;
        }
        child.dataset.source = sourceKey;
        existingIconsByKey.set(sourceKey, child);
    }

    for (const [key, icon] of existingIconsByKey.entries()) {
        if (!nextKeys.has(key)) {
            icon.remove();
            existingIconsByKey.delete(key);
        }
    }

    for (let i = 0; i < nextDefs.length; i++) {
        const def = nextDefs[i];
        const icon = existingIconsByKey.get(def.key) ?? document.createElement('i');
        icon.dataset.source = def.key;
        icon.className = `stwid--sourceIcon fa-solid fa-fw ${def.icon}`;
        const tooltip = getSourceIconTooltip(def.key, def.label, details);
        if (icon.title !== tooltip) {
            icon.title = tooltip;
        }
        if (icon.getAttribute('aria-label') !== tooltip) {
            icon.setAttribute('aria-label', tooltip);
        }
        const currentChild = sourceLinksContainer.children[i];
        if (currentChild !== icon) {
            sourceLinksContainer.insertBefore(icon, currentChild ?? null);
        }
    }

    sourceLinksContainer.classList.toggle('stwid--state-empty', sourceLinksContainer.childElementCount === 0);
};

const updateBookSourceLinks = (name, links = null)=>{
    const sourceLinksContainer = state.cache[name]?.dom?.sourceLinks;
    if (!sourceLinksContainer) return;
    const resolved = links ?? state.getBookSourceLinks?.(name);
    renderBookSourceLinks(sourceLinksContainer, resolved);
};

const updateAllBookSourceLinks = (linksByBook = null)=>{
    for (const name of Object.keys(state.cache)) {
        updateBookSourceLinks(name, linksByBook?.[name]);
    }
};

// Book metadata + sort preference helpers.
const sortEntriesIfNeeded = (name)=>{
    if (!hasSortableBookDom(name)) {
        return false;
    }
    const world = state.cache[name];
    const { sort, direction } = getBookSortChoice(name);
    const sorted = state.sortEntries(Object.values(world.entries), sort, direction);
    let needsSort = false;
    let i = 0;
    for (const e of sorted) {
        if (world.dom.entryList.children[i] != world.dom.entry[e.uid].root) {
            needsSort = true;
            break;
        }
        i++;
    }
    if (needsSort) {
        for (const e of sorted) {
            world.dom.entryList.append(world.dom.entry[e.uid].root);
        }
    }
    return true;
};

const setCacheMetadata = (name, metadata = {})=>{
    state.cache[name].metadata = cloneMetadata(metadata);
    state.cache[name].sort = state.getSortFromMetadata(state.cache[name].metadata);
    sanitizeFolderMetadata(state.cache[name].metadata);
};

const buildLatestBookSavePayload = (latest)=>({
    entries: structuredClone(latest?.entries ?? {}),
    metadata: latest?.metadata && typeof latest.metadata === 'object'
        ? structuredClone(latest.metadata)
        : {},
});

const hasSortableBookDom = (name)=>{
    const world = state.cache[name];
    if (!world
        || !world.entries
        || !world.dom?.root
        || !world.dom?.entryList
        || !world.dom?.entry
        || !world.dom.root.isConnected
        || !world.dom.entryList.isConnected) {
        return false;
    }
    for (const entry of Object.values(world.entries)) {
        if (!world.dom.entry[entry.uid]?.root) {
            return false;
        }
    }
    return true;
};

const setBookSortPreference = async(name, sort = null, direction = null)=>{
    const hasSort = Boolean(sort && direction);
    let latest;
    try {
        latest = await state.loadWorldInfo(name);
    } catch (error) {
        console.warn(`[STWID] Failed to load book "${name}" before saving sort preference.`, error);
        toastr.error(`Could not load "${name}" before saving sort preference.`);
        return { ok: false, error: 'load_failed' };
    }
    if (!latest || typeof latest !== 'object') {
        return { ok: false, error: 'book_missing' };
    }
    const nextPayload = buildLatestBookSavePayload(latest);
    nextPayload.metadata[state.METADATA_NAMESPACE] ??= {};
    if (hasSort) {
        nextPayload.metadata[state.METADATA_NAMESPACE][state.METADATA_SORT_KEY] = { sort, direction };
    } else {
        delete nextPayload.metadata[state.METADATA_NAMESPACE][state.METADATA_SORT_KEY];
        if (Object.keys(nextPayload.metadata[state.METADATA_NAMESPACE]).length === 0) {
            delete nextPayload.metadata[state.METADATA_NAMESPACE];
        }
        if (Object.keys(nextPayload.metadata).length === 0) {
            nextPayload.metadata = {};
        }
    }
    // Any refresh request while save is in-flight invalidates post-save DOM sorting.
    const refreshTokenBeforeSave = refreshRequestToken;
    try {
        await state.saveWorldInfo(name, nextPayload, true);
    } catch (error) {
        console.warn(`[STWID] Failed to save sort preference for "${name}".`, error);
        toastr.error(`Could not save sort preference for "${name}".`);
        return { ok: false, error: 'save_failed' };
    }
    if (state.cache[name]) {
        setCacheMetadata(name, nextPayload.metadata);
    }
    if (refreshTokenBeforeSave !== refreshRequestToken) {
        console.warn('[STWID] Skipping stale post-save sort after refresh.', { name });
        return { ok: true };
    }
    if (!hasSortableBookDom(name)) {
        console.warn('[STWID] Skipping post-save sort: book cache/DOM not ready.', { name });
        return { ok: true };
    }
    sortEntriesIfNeeded(name);
    return { ok: true };
};

const clearBookSortPreferences = async()=>{
    const failedBooks = [];
    for (const [name, data] of Object.entries(state.cache)) {
        const hasSortPreference = Boolean(data.metadata?.[state.METADATA_NAMESPACE]?.[state.METADATA_SORT_KEY]);
        if (!hasSortPreference) continue;
        try {
            const result = await setBookSortPreference(name, null, null);
            if (!result.ok) {
                failedBooks.push(name);
            }
        } catch (error) {
            console.warn(`[STWID] Failed to clear sort preference for "${name}".`, error);
            failedBooks.push(name);
        }
    }
    if (failedBooks.length) {
        toastr.error(`Could not clear sort preferences for ${failedBooks.length} book${failedBooks.length === 1 ? '' : 's'}.`);
        return { ok: false, error: 'partial_failure', failedBooks };
    }
    return { ok: true, failedBooks };
};

// Folder assignment helper (persists through WI APIs).
const setBookFolder = async(name, folderName)=>{
    let latest;
    try {
        latest = await state.loadWorldInfo(name);
    } catch (error) {
        console.warn(`[STWID] Failed to load book "${name}" before folder change.`, error);
        toastr.error(`Could not load "${name}" before moving it.`);
        return { ok: false, error: 'load_failed' };
    }
    if (!latest || typeof latest !== 'object') return { ok: false, error: 'book_missing' };

    const nextPayload = buildLatestBookSavePayload(latest);
    const result = setFolderInMetadata(nextPayload.metadata, folderName);
    if (!result.ok) return { ok: false, error: 'invalid_folder' };
    if (result.folder) {
        registerFolderName(result.folder);
    }
    try {
        await state.saveWorldInfo(name, nextPayload, true);
    } catch (error) {
        console.warn(`[STWID] Failed to save folder change for "${name}".`, error);
        toastr.error(`Could not move "${name}" to the selected folder.`);
        return { ok: false, error: 'save_failed' };
    }
    if (state.cache[name]) {
        setCacheMetadata(name, nextPayload.metadata);
    }
    return { ok: true };
};

// Shared book action helpers (used by menu flows and drag/drop flows).
const refreshAndCenterBook = async(name)=>{
    await refreshList();
    const target = state.cache[name]?.dom?.root;
    target?.scrollIntoView({ block: 'center' });
};

const applyBookFolderChange = async(name, folderName, { centerAfterRefresh = false } = {})=>{
    let updated;
    try {
        updated = await setBookFolder(name, folderName);
    } catch (error) {
        console.warn(`[STWID] Failed to apply folder change for "${name}".`, error);
        toastr.error(`Could not move "${name}" to the selected folder.`);
        return { ok: false, error: 'folder_change_failed' };
    }
    if (!updated.ok) return updated;
    if (centerAfterRefresh) {
        await refreshAndCenterBook(name);
    } else {
        await refreshList();
    }
    return { ok: true };
};

const handleDraggedBookMoveOrCopy = async(draggedName, targetFolder, isCopy, { skipIfSameFolder = true } = {})=>{
    // Manual verification note:
    // - Move root->folder, folder->root, and folder->folder
    // - Ctrl-copy in each direction
    // - Same-folder drop should remain a no-op when skipIfSameFolder is true
    if (!isCopy) {
        if (skipIfSameFolder) {
            const currentFolder = getFolderFromMetadata(state.cache[draggedName]?.metadata);
            if (currentFolder === targetFolder) return { ok: false, error: 'same_folder' };
        }
        return applyBookFolderChange(draggedName, targetFolder);
    }
    const duplicated = await bookMenuSlice?.duplicateBookIntoFolder(draggedName, targetFolder);
    return duplicated ? { ok: true } : { ok: false, error: 'duplicate_failed' };
};

// Core WI UI delegation helpers (select + trigger vanilla actions).
const setSelectedBookInCoreUi = (bookName)=>setSelectedBookInCoreUiBridge(bookName, {
    waitForWorldInfoUpdate: state.waitForWorldInfoUpdate,
    delay: state.delay,
});

const clickCoreUiAction = (possibleSelectors, options = {})=>clickCoreUiActionBridge(possibleSelectors, options);

// Book and folder view rendering are owned by dedicated slices.
const renderBook = async(...args)=>booksViewSlice?.renderBook(...args);
const loadList = async()=>booksViewSlice?.loadList();

const runRefreshWorker = async()=>{
    state.dom.drawer.body.classList.add('stwid--state-loading');
    try {
        while (refreshCompletedToken < refreshRequestToken) {
            const token = refreshRequestToken;
            state.resetEditor?.();
            captureBookCollapseStatesFromDom(state.cache, listPanelState.setCollapseState);
            clearCacheBooks(state.cache, state.clearToast);
            await listPanelState.loadListDebounced();
            listPanelState.searchInput?.dispatchEvent(new Event('input'));
            refreshCompletedToken = token;
        }
    } finally {
        state.dom.drawer.body.classList.remove('stwid--state-loading');
        refreshWorkerPromise = null;
    }
};

// Contract: `refreshList()` resolves only after the newest pending refresh finished.
const refreshList = async()=>{
    refreshRequestToken += 1;
    refreshWorkerPromise ??= runRefreshWorker();
    while (refreshCompletedToken < refreshRequestToken) {
        refreshWorkerPromise ??= runRefreshWorker();
        await refreshWorkerPromise;
    }
};

const isBookDomFilteredOut = (bookRoot)=>bookRoot.classList.contains('stwid--filter-query')
    || bookRoot.classList.contains('stwid--filter-visibility');

// Folder summary visibility/active-state refresh.
const updateFolderActiveToggles = ()=>foldersViewSlice?.updateFolderActiveToggles({ isBookDomFilteredOut });

// Books container setup.
const setupBooks = (list)=>{
    const books = document.createElement('div'); {
        state.dom.books = books;
        books.classList.add('stwid--books');
        booksRootDragOverHandler = (evt)=>selectionDnDSlice?.onRootDropTargetDragOver(evt);
        booksRootDropHandler = async(evt)=>selectionDnDSlice?.onRootDropTargetDrop(evt);
        books.addEventListener('dragover', booksRootDragOverHandler);
        books.addEventListener('drop', booksRootDropHandler);
        list.append(books);
    }
};

const teardownListPanel = ()=>{
    if (state.dom?.books) {
        if (booksRootDragOverHandler) {
            state.dom.books.removeEventListener('dragover', booksRootDragOverHandler);
        }
        if (booksRootDropHandler) {
            state.dom.books.removeEventListener('drop', booksRootDropHandler);
        }
    }
    booksRootDragOverHandler = null;
    booksRootDropHandler = null;

    foldersViewSlice?.resetFolderDoms?.();
    for (const filter of state.list?.querySelectorAll?.('.stwid--filter') ?? []) {
        filter.remove();
    }
    for (const books of state.list?.querySelectorAll?.('.stwid--books') ?? []) {
        books.remove();
    }

    listPanelState.searchInput = null;
    listPanelState.searchEntriesInput = null;
    listPanelState.loadListDebounced = null;
    listPanelState.folderMenuActions = null;

    filterBarSlice?.cleanup?.();
    filterBarSlice = null;
    selectionDnDSlice = null;
    bookMenuSlice = null;
    foldersViewSlice = null;
    booksViewSlice = null;

    refreshRequestToken = 0;
    refreshCompletedToken = 0;
    refreshWorkerPromise = null;
    listPanelInitialized = false;
};

// Panel bootstrap helpers.
const setupListPanel = (list)=>{
    filterBarSlice?.setupFilter(list);
    setupBooks(list);
};

const wireSlices = ()=>{
    filterBarSlice = createFilterBarSlice({
        listPanelState,
        runtime: state,
        onBookVisibilityScopeChange: (visibleBookNames)=>state.onBookVisibilityScopeChange?.(visibleBookNames),
        setApplyActiveFilter: (applyActiveFilter)=>{
            state.applyActiveFilter = applyActiveFilter;
        },
        updateFolderActiveToggles,
    });
    selectionDnDSlice = createSelectionDnDSlice({
        listPanelState,
        runtime: state,
        handleDraggedBookMoveOrCopy,
    });
    bookMenuSlice = createBookMenuSlice({
        listPanelState,
        runtime: state,
        coreUiSelectors: CORE_UI_SELECTORS,
        coreUiActionSelectors: CORE_UI_ACTION_SELECTORS,
        folderDeps: {
            getFolderFromMetadata,
            getFolderRegistry,
            registerFolderName,
            sanitizeFolderMetadata,
        },
        setSelectedBookInCoreUi,
        clickCoreUiAction,
        getBookSortChoice,
        refreshList,
        setBookFolder,
        setBookSortPreference,
        applyBookFolderChange,
    });
    foldersViewSlice = createFoldersViewSlice({
        listPanelState,
        runtime: state,
        selectionDnDSlice: ()=>selectionDnDSlice,
    });
    booksViewSlice = createBooksViewSlice({
        listPanelState,
        runtime: state,
        coreUiSelectors: CORE_UI_SELECTORS,
        foldersViewSlice,
        selectionDnDSlice: ()=>selectionDnDSlice,
        bookMenuSlice: ()=>bookMenuSlice,
        getFolderFromMetadata,
        getFolderRegistry,
        registerFolderName,
        getBookSortChoice,
        setBookCollapsed,
        setCacheMetadata,
        updateBookSourceLinks,
        updateCollapseAllToggle,
    });
};

const getListPanelApi = ()=>({
    applyActiveFilter: state.applyActiveFilter,
    clearBookSortPreferences,
    destroyListPanel: teardownListPanel,
    getBookVisibilityScope,
    getSelectionState: selectionDnDSlice.getSelectionState,
    hasExpandedBooks,
    hasExpandedFolders,
    openFolderImportDialog: ()=>bookMenuSlice?.openFolderImportDialog(),
    refreshList,
    renderBook,
    selectAdd: selectionDnDSlice.selectAdd,
    selectEnd: selectionDnDSlice.selectEnd,
    selectRemove: selectionDnDSlice.selectRemove,
    setBookCollapsed,
    setBookFolder,
    setCacheMetadata,
    setCollapseState,
    setAllFoldersCollapsed,
    setBookSortPreference,
    sortEntriesIfNeeded,
    updateAllBookSourceLinks,
    updateBookSourceLinks,
    updateFolderActiveToggles,
    updateCollapseAllToggle,
    updateCollapseAllFoldersToggle,
});

// Public module initialization + returned API surface.
const initListPanel = (options)=>{
    if (listPanelInitialized) {
        console.warn('[STWID] initListPanel called more than once; resetting previous list panel instance.');
        teardownListPanel();
    }
    state = options;
    wireSlices();
    resetBookVisibilityState(BOOK_VISIBILITY_MODES);
    clearEntrySearchCache();
    hydrateFolderCollapseStates();
    listPanelState.loadListDebounced = state.debounceAsync(()=>loadList());
    let folderImportInProgress = false;

    listPanelState.folderMenuActions = {
        Popup: state.Popup,
        buildSavePayload: state.buildSavePayload,
        cache: state.cache,
        createBookInFolder: (folderName)=>createBookInFolder({
            folderName,
            Popup: state.Popup,
            createNewWorldInfo: state.createNewWorldInfo,
            getFreeWorldName: state.getFreeWorldName,
            loadWorldInfo: state.loadWorldInfo,
            saveWorldInfo: state.saveWorldInfo,
            refreshList,
        }),
        deleteBook: (name, deleteOptions)=>bookMenuSlice?.deleteBook(name, deleteOptions),
        download: state.download,
        getBookVisibilityScope: () => getBookVisibilityScope(),
        getWorldNames: () => state.getWorldNames ? state.getWorldNames() : state.world_names,
        getSelectedWorldInfo: () => state.getSelectedWorldInfo ? state.getSelectedWorldInfo() : state.selected_world_info,
        isFolderImporting: ()=>folderImportInProgress,
        setFolderImporting: (value)=>{
            folderImportInProgress = Boolean(value);
        },
        openOrderHelper: state.openOrderHelper,
        openImportDialog: ()=>bookMenuSlice?.openImportDialog(),
        refreshList,
        setBookFolder,
        setBooksActive: (bookNames, isActive)=>setFolderBooksActive(bookNames, isActive, state.onWorldInfoChange),
        waitForWorldInfoUpdate: state.waitForWorldInfoUpdate,
    };
    setupListPanel(state.list);
    listPanelInitialized = true;
    return getListPanelApi();
};

export { initListPanel, refreshList };

