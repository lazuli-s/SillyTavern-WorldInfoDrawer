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
    return entryList && !entryList.classList.contains('stwid--isCollapsed');
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
    sourceLinksContainer.innerHTML = '';
    const normalized = normalizeBookSourceLinks(links);
    const details = normalizeBookSourceLinkDetails(links);
    for (const def of SOURCE_ICON_DEFINITIONS) {
        if (!normalized[def.key]) continue;
        const icon = document.createElement('i');
        icon.classList.add('stwid--sourceIcon', 'fa-solid', 'fa-fw', def.icon);
        const tooltip = getSourceIconTooltip(def.key, def.label, details);
        icon.title = tooltip;
        icon.setAttribute('aria-label', tooltip);
        sourceLinksContainer.append(icon);
    }
    sourceLinksContainer.classList.toggle('stwid--isEmpty', sourceLinksContainer.childElementCount === 0);
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
    const { sort, direction } = getBookSortChoice(name);
    const sorted = state.sortEntries(Object.values(state.cache[name].entries), sort, direction);
    let needsSort = false;
    let i = 0;
    for (const e of sorted) {
        if (state.cache[name].dom.entryList.children[i] != state.cache[name].dom.entry[e.uid].root) {
            needsSort = true;
            break;
        }
        i++;
    }
    if (needsSort) {
        for (const e of sorted) {
            state.cache[name].dom.entryList.append(state.cache[name].dom.entry[e.uid].root);
        }
    }
};

const setCacheMetadata = (name, metadata = {})=>{
    state.cache[name].metadata = cloneMetadata(metadata);
    state.cache[name].sort = state.getSortFromMetadata(state.cache[name].metadata);
    sanitizeFolderMetadata(state.cache[name].metadata);
};

const setBookSortPreference = async(name, sort = null, direction = null)=>{
    const hasSort = Boolean(sort && direction);
    state.cache[name].metadata ??= {};
    state.cache[name].metadata[state.METADATA_NAMESPACE] ??= {};
    if (hasSort) {
        state.cache[name].metadata[state.METADATA_NAMESPACE][state.METADATA_SORT_KEY] = { sort, direction };
        state.cache[name].sort = { sort, direction };
    } else {
        delete state.cache[name].metadata[state.METADATA_NAMESPACE][state.METADATA_SORT_KEY];
        if (Object.keys(state.cache[name].metadata[state.METADATA_NAMESPACE]).length === 0) {
            delete state.cache[name].metadata[state.METADATA_NAMESPACE];
        }
        if (Object.keys(state.cache[name].metadata).length === 0) {
            state.cache[name].metadata = {};
        }
        state.cache[name].sort = null;
    }
    await state.saveWorldInfo(name, state.buildSavePayload(name), true);
    sortEntriesIfNeeded(name);
};

const clearBookSortPreferences = async()=>{
    for (const [name, data] of Object.entries(state.cache)) {
        const hasSortPreference = Boolean(data.metadata?.[state.METADATA_NAMESPACE]?.[state.METADATA_SORT_KEY]);
        if (!hasSortPreference) continue;
        await setBookSortPreference(name, null, null);
    }
};

// Folder assignment helper (persists through WI APIs).
const setBookFolder = async(name, folderName)=>{
    const latest = await state.loadWorldInfo(name);
    if (!latest || typeof latest !== 'object') return false;

    const nextPayload = {
        entries: structuredClone(latest.entries ?? {}),
        metadata: latest.metadata && typeof latest.metadata === 'object'
            ? structuredClone(latest.metadata)
            : {},
    };
    const result = setFolderInMetadata(nextPayload.metadata, folderName);
    if (!result.ok) return false;
    if (result.folder) {
        registerFolderName(result.folder);
    }
    await state.saveWorldInfo(name, nextPayload, true);
    if (state.cache[name]) {
        setCacheMetadata(name, nextPayload.metadata);
    }
    return true;
};

// Shared book action helpers (used by menu flows and drag/drop flows).
const refreshAndCenterBook = async(name)=>{
    await refreshList();
    const target = state.cache[name]?.dom?.root;
    target?.scrollIntoView({ block: 'center' });
};

const applyBookFolderChange = async(name, folderName, { centerAfterRefresh = false } = {})=>{
    const updated = await setBookFolder(name, folderName);
    if (!updated) return false;
    if (centerAfterRefresh) {
        await refreshAndCenterBook(name);
    } else {
        await refreshList();
    }
    return true;
};

const handleDraggedBookMoveOrCopy = async(draggedName, targetFolder, isCopy, { skipIfSameFolder = true } = {})=>{
    // Manual verification note:
    // - Move root->folder, folder->root, and folder->folder
    // - Ctrl-copy in each direction
    // - Same-folder drop should remain a no-op when skipIfSameFolder is true
    if (!isCopy) {
        if (skipIfSameFolder) {
            const currentFolder = getFolderFromMetadata(state.cache[draggedName]?.metadata);
            if (currentFolder === targetFolder) return false;
        }
        await applyBookFolderChange(draggedName, targetFolder);
        return true;
    }
    const duplicated = await bookMenuSlice?.duplicateBookIntoFolder(draggedName, targetFolder);
    return Boolean(duplicated);
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

const refreshList = async()=>{
    state.dom.drawer.body.classList.add('stwid--isLoading');
    state.resetEditor?.();
    captureBookCollapseStatesFromDom(state.cache, listPanelState.setCollapseState);
    clearCacheBooks(state.cache);
    try {
        await listPanelState.loadListDebounced();
        listPanelState.searchInput?.dispatchEvent(new Event('input'));
    } finally {
        state.dom.drawer.body.classList.remove('stwid--isLoading');
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
        books.addEventListener('dragover', (evt)=>selectionDnDSlice.onRootDropTargetDragOver(evt));
        books.addEventListener('drop', async(evt)=>selectionDnDSlice.onRootDropTargetDrop(evt));
        list.append(books);
    }
};

// Panel bootstrap helpers.
const setupListPanel = (list)=>{
    filterBarSlice?.setupFilter(list);
    setupBooks(list);
};

// Public module initialization + returned API surface.
const initListPanel = (options)=>{
    state = options;
    filterBarSlice = createFilterBarSlice({
        listPanelState,
        runtime: state,
        onBookVisibilityScopeChange: (visibleBookNames)=>state.onBookVisibilityScopeChange?.(visibleBookNames),
        setApplyActiveFilter: (applyActiveFilter)=>{
            state.applyActiveFilter = applyActiveFilter;
        },
        updateFolderActiveToggles,
    });
    resetBookVisibilityState(BOOK_VISIBILITY_MODES);
    clearEntrySearchCache();
    hydrateFolderCollapseStates();
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
    return {
        applyActiveFilter: state.applyActiveFilter,
        clearBookSortPreferences,
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
    };
};

export { initListPanel, refreshList };

