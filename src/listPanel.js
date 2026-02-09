import { cloneMetadata } from './sortHelpers.js';
import {
    createFolderDom,
    createBookInFolder,
    getFolderFromMetadata,
    getFolderRegistry,
    registerFolderName,
    setFolderBooksActive,
    sanitizeFolderMetadata,
    setFolderCollapsed,
    setFolderInMetadata,
} from './lorebookFolders.js';
import {
    captureBookCollapseStatesFromDom,
    clearCacheBooks,
    clearEntrySearchCache,
    hydrateFolderCollapseStates,
    listPanelState,
    resetBookVisibilityState,
    setFolderCollapsedAndPersist,
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

const hasExpandedFolders = ()=>listPanelState.getFolderDomValues().some((folderDom)=>{
    const books = folderDom?.books;
    return books && !books.classList.contains('stwid--isCollapsed');
});

const updateCollapseAllFoldersToggle = ()=>{
    const hasExpanded = hasExpandedFolders();
    const btn = state.dom.collapseAllFoldersToggle;
    if (!btn) return;
    const icon = btn.querySelector('i');
    icon?.classList.toggle('fa-folder-tree', hasExpanded);
    icon?.classList.toggle('fa-folder-open', !hasExpanded);
    const label = hasExpanded ? 'Collapse All Folders' : 'Expand All Folders';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-pressed', hasExpanded ? 'true' : 'false');
};

const setAllFoldersCollapsed = (isCollapsed)=>{
    const folderNames = listPanelState.getFolderDomNames();
    for (const folderName of folderNames) {
        setFolderCollapsedAndPersist(folderName, isCollapsed, { transientExpand: !isCollapsed });
    }
    updateCollapseAllFoldersToggle();
};

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

// Book rendering + book-level interaction wiring.
const renderBook = async(name, before = null, bookData = null, parent = null)=>{
    const data = bookData ?? await state.loadWorldInfo(name);
    const world = { entries:{}, metadata: cloneMetadata(data.metadata), sort:state.getSortFromMetadata(data.metadata) };
    for (const [k,v] of Object.entries(data.entries)) {
        world.entries[k] = structuredClone(v);
    }
    world.dom = {
        /**@type {HTMLElement} */
        root: undefined,
        /**@type {HTMLElement} */
        name: undefined,
        /**@type {HTMLElement} */
        sourceLinks: undefined,
        /**@type {HTMLElement} */
        active: undefined,
        /**@type {HTMLElement} */
        entryList: undefined,
        /**@type {{ [uid:string]:{root:HTMLElement, comment:HTMLElement, key:HTMLElement}}} */
        entry: {},
    };
    state.cache[name] = world;
    setCacheMetadata(name, data.metadata);
    let targetParent = parent ?? state.dom.books;
    if (!parent) {
        const folderName = getFolderFromMetadata(state.cache[name].metadata);
        if (folderName) {
            let folderDom = listPanelState.getFolderDom(folderName);
            if (!folderDom) {
                folderDom = createFolderDom({
                    folderName,
                    onToggle: ()=>{
                        const isCollapsed = !listPanelState.getFolderDom(folderName)?.books.classList.contains('stwid--isCollapsed');
                        setFolderCollapsedAndPersist(folderName, isCollapsed);
                        updateCollapseAllFoldersToggle();
                    },
                    onDragStateChange: (isOver)=>selectionDnDSlice.onFolderDropTargetDragStateChange(isOver),
                    onDrop: async(evt)=>selectionDnDSlice.onFolderDropTargetDrop(evt, folderName),
                    menuActions: listPanelState.folderMenuActions,
                });
                listPanelState.setFolderDom(folderName, folderDom);
                let insertBefore = null;
                const normalizedFolder = folderName.toLowerCase();
                for (const child of state.dom.books.children) {
                    if (child.classList.contains('stwid--folder')) {
                        const childName = child.dataset.folder?.toLowerCase() ?? '';
                        if (childName.localeCompare(normalizedFolder) > 0) {
                            insertBefore = child;
                            break;
                        }
                        continue;
                    }
                    if (child.classList.contains('stwid--book')) {
                        insertBefore = child;
                        break;
                    }
                }
                if (insertBefore) insertBefore.insertAdjacentElement('beforebegin', folderDom.root);
                else state.dom.books.append(folderDom.root);
                const initialCollapsed = listPanelState.folderCollapseStates[folderName] ?? true;
                setFolderCollapsed(folderDom, initialCollapsed);
                updateCollapseAllFoldersToggle();
            }
            targetParent = folderDom?.books ?? targetParent;
        }
    }
    const book = document.createElement('div'); {
        world.dom.root = book;
        book.classList.add('stwid--book');
        book.addEventListener('dragover', (evt)=>selectionDnDSlice.onBookDropTargetDragOver(evt, book));
        book.addEventListener('dragleave', (evt)=>selectionDnDSlice.onBookDropTargetDragLeave(evt, book));
        book.addEventListener('drop', async(evt)=>selectionDnDSlice.onBookDropTargetDrop(
            evt,
            name,
            book,
            ()=>getFolderFromMetadata(state.cache[name]?.metadata),
        ));
        const head = document.createElement('div'); {
            head.classList.add('stwid--head');
            let collapseToggle;
            const title = document.createElement('div'); {
                world.dom.name = title;
                title.classList.add('stwid--title');
                title.textContent = name;
                title.title = 'Collapse/expand this book';
                title.setAttribute('draggable', 'true');
                title.addEventListener('dragstart', (evt)=>{
                    listPanelState.dragBookName = name;
                    if (evt.dataTransfer) {
                        evt.dataTransfer.effectAllowed = 'copyMove';
                        evt.dataTransfer.setData('text/plain', name);
                    }
                });
                title.addEventListener('dragend', ()=>{
                    listPanelState.dragBookName = null;
                    for (const folderDom of listPanelState.getFolderDomValues()) {
                        folderDom.root.classList.remove('stwid--isTarget');
                    }
                    for (const bookDom of Object.values(state.cache)) {
                        bookDom.dom.root.classList.remove('stwid--isTarget');
                    }
                });
                title.addEventListener('click', ()=>{
                    const isCollapsed = !entryList.classList.contains('stwid--isCollapsed');
                    setBookCollapsed(name, isCollapsed);
                });
                head.append(title);
            }
            const actions = document.createElement('div'); {
                actions.classList.add('stwid--actions');
                const sourceLinks = document.createElement('div'); {
                    world.dom.sourceLinks = sourceLinks;
                    sourceLinks.classList.add('stwid--sourceLinks', 'stwid--isEmpty');
                    actions.append(sourceLinks);
                }
                const active = document.createElement('input'); {
                    world.dom.active = active;
                    active.title = 'Toggle global active status for this book';
                    active.setAttribute('aria-label', 'Toggle global active status for this book');
                    active.type = 'checkbox';
                    const selected = state.getSelectedWorldInfo ? state.getSelectedWorldInfo() : state.selected_world_info;
                    active.checked = selected.includes(name);
                    active.addEventListener('click', async()=>{
                        active.disabled = true;
                        const select = /**@type {HTMLSelectElement}*/(document.querySelector(CORE_UI_SELECTORS.worldInfoSelect));
                        const option = select ? [...select.options].find((opt)=>opt.textContent === name) : null;
                        if (option && select) {
                            option.selected = active.checked;
                            state.onWorldInfoChange('__notSlashCommand__');
                        }
                        active.disabled = false;
                    });
                    actions.append(active);
                }
                const add = document.createElement('div'); {
                    add.classList.add('stwid--action');
                    add.classList.add('stwid--add');
                    add.classList.add('fa-solid', 'fa-fw', 'fa-plus');
                    add.title = 'Create new entry in this book';
                    add.setAttribute('aria-label', 'Create new entry in this book');
                    add.addEventListener('click', async()=>{
                        const data = state.buildSavePayload(name);
                        const newEntry = state.createWorldInfoEntry(name, data);
                        state.cache[name].entries[newEntry.uid] = structuredClone(newEntry);
                        await state.renderEntry(newEntry, name);
                        state.cache[name].dom.entry[newEntry.uid].root.click();
                        await state.saveWorldInfo(name, data, true);
                    });
                    actions.append(add);
                }
                const menuTrigger = bookMenuSlice?.buildBookMenuTrigger(name);
                if (menuTrigger) {
                    actions.append(menuTrigger);
                }
                collapseToggle = document.createElement('div'); {
                    state.cache[name].dom.collapseToggle = collapseToggle;
                    collapseToggle.classList.add('stwid--action');
                    collapseToggle.classList.add('stwid--collapseToggle');
                    collapseToggle.classList.add('fa-solid', 'fa-fw', 'fa-chevron-down');
                    collapseToggle.title = 'Collapse/expand this book';
                    collapseToggle.setAttribute('aria-label', 'Collapse or expand this book');
                    collapseToggle.addEventListener('click', ()=>{
                        const isCollapsed = !entryList.classList.contains('stwid--isCollapsed');
                        setBookCollapsed(name, isCollapsed);
                    });
                    actions.append(collapseToggle);
                }
                updateBookSourceLinks(name);
                head.append(actions);
            }
            book.append(head);
        }
        const entryList = document.createElement('div'); {
            world.dom.entryList = entryList;
            entryList.classList.add('stwid--entryList');
            entryList.classList.add('stwid--isCollapsed');
            const { sort, direction } = getBookSortChoice(name);
            for (const e of state.sortEntries(Object.values(world.entries), sort, direction)) {
                await state.renderEntry(e, name);
            }
            const initialCollapsed = listPanelState.getCollapseState(name) ?? entryList.classList.contains('stwid--isCollapsed');
            setBookCollapsed(name, initialCollapsed);
            book.append(entryList);
        }
        let insertBefore = before && before.parentElement === targetParent ? before : null;
        if (!insertBefore) {
            const normalizedName = name.toLowerCase();
            for (const child of targetParent.children) {
                if (!child.classList.contains('stwid--book')) continue;
                const childName = child.querySelector('.stwid--title')?.textContent?.toLowerCase() ?? '';
                if (childName.localeCompare(normalizedName) > 0) {
                    insertBefore = child;
                    break;
                }
            }
        }
        if (insertBefore) insertBefore.insertAdjacentElement('beforebegin', book);
        else targetParent.append(book);
    }
    return book;
};

// Full list render/reload.
const loadList = async()=>{
    state.dom.books.innerHTML = '';
    for (const folderDom of listPanelState.getFolderDomValues()) {
        folderDom.observer?.disconnect();
    }
    listPanelState.clearFolderDoms();

    // Yield to the UI thread periodically to avoid long main-thread stalls on very
    // large lore collections.
    const yieldToUi = ()=>new Promise((resolve)=>setTimeout(resolve, 0));

    const worldNames = state.getWorldNames ? state.getWorldNames() : state.world_names;
    const sortedNames = state.safeToSorted(worldNames ?? [], (a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));

    // Load sequentially with occasional yields. This is slower than Promise.all,
    // but keeps the UI responsive for large datasets.
    const books = [];
    for (let i = 0; i < sortedNames.length; i++) {
        const name = sortedNames[i];
        books.push({ name, data: await state.loadWorldInfo(name) });
        if (i > 0 && i % 5 === 0) {
            await yieldToUi();
        }
    }

    const folderGroups = new Map();
    const rootBooks = [];
    for (const book of books) {
        const folderName = getFolderFromMetadata(book.data?.metadata);
        if (folderName) {
            registerFolderName(folderName);
            if (!folderGroups.has(folderName)) folderGroups.set(folderName, []);
            folderGroups.get(folderName).push(book);
        } else {
            rootBooks.push(book);
        }
    }
    const folderRegistry = getFolderRegistry();
    const allFolderNames = new Set(folderRegistry);
    for (const folderName of folderGroups.keys()) {
        allFolderNames.add(folderName);
    }
    const sortedFolders = [...allFolderNames].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
    for (const folderName of sortedFolders) {
        const folderDom = createFolderDom({
            folderName,
            onToggle: ()=>{
                const isCollapsed = !listPanelState.getFolderDom(folderName)?.books.classList.contains('stwid--isCollapsed');
                setFolderCollapsedAndPersist(folderName, isCollapsed);
                updateCollapseAllFoldersToggle();
            },
            onDragStateChange: (isOver)=>selectionDnDSlice.onFolderDropTargetDragStateChange(isOver),
            onDrop: async(evt)=>selectionDnDSlice.onFolderDropTargetDrop(evt, folderName),
            menuActions: listPanelState.folderMenuActions,
        });
        listPanelState.setFolderDom(folderName, folderDom);
        state.dom.books.append(folderDom.root);
        const initialCollapsed = listPanelState.folderCollapseStates[folderName] ?? true;
        setFolderCollapsed(folderDom, initialCollapsed);
        const folderBooks = folderGroups.get(folderName) ?? [];
        for (let i = 0; i < folderBooks.length; i++) {
            const book = folderBooks[i];
            await renderBook(book.name, null, book.data, folderDom.books);
            if (i > 0 && i % 2 === 0) {
                await yieldToUi();
            }
        }
        await yieldToUi();
    }
    for (let i = 0; i < rootBooks.length; i++) {
        const book = rootBooks[i];
        await renderBook(book.name, null, book.data, state.dom.books);
        if (i > 0 && i % 2 === 0) {
            await yieldToUi();
        }
    }
    state.applyActiveFilter?.();
    updateCollapseAllFoldersToggle();
};

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
const updateFolderVisibility = ()=>{
    for (const folderDom of listPanelState.getFolderDomValues()) {
        const hasVisibleBooks = Array.from(folderDom.books.children).some((child)=>{
            if (!(child instanceof HTMLElement)) return false;
            if (!child.classList.contains('stwid--book')) return false;
            return !isBookDomFilteredOut(child);
        });
        folderDom.root.hidden = !hasVisibleBooks;
    }
};

const updateFolderActiveToggles = ()=>{
    for (const folderDom of listPanelState.getFolderDomValues()) {
        folderDom.updateActiveToggle?.();
    }
    updateFolderVisibility();
};

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
    listPanelState.loadListDebounced = state.debounceAsync(()=>loadList());
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

