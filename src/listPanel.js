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

let state = {};

let searchInput;
let searchEntriesInput;
let filterActiveInput;
let loadListDebounced;
let folderImportInput;
const entrySearchCache = {};

const collapseStates = {};
const folderCollapseStates = {};
const folderDoms = {};

const FOLDER_COLLAPSE_STORAGE_KEY = 'stwid--folder-collapse-states';

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
        localStorage.setItem(FOLDER_COLLAPSE_STORAGE_KEY, JSON.stringify(folderCollapseStates));
    } catch (error) {
        console.warn('[STWID] Failed to save folder collapse states', error);
    }
};

const setFolderCollapsedAndPersist = (folderName, isCollapsed, { transientExpand = false } = {})=>{
    folderCollapseStates[folderName] = Boolean(isCollapsed);

    // "transientExpand" means: show expanded right now, but keep the stored default
    // unchanged (used for rename/new folder to keep UI friendly).
    if (!transientExpand) {
        saveFolderCollapseStates();
    }

    setFolderCollapsed(folderDoms[folderName], Boolean(isCollapsed));
};

/** Last clicked/selected DOM (WI entry) @type {HTMLElement} */
let selectLast = null;
/** Name of the book to select WI entries from @type {string} */
let selectFrom = null;
/**@type {'ctrl'|'shift'} */
let selectMode = null;
/** List of selected entries (WI uids) @type {string[]} */
let selectList = null;
/** toastr reference showing selection help @type {JQuery<HTMLElement>} */
let selectToast = null;
/** Name of the book being dragged @type {string|null} */
let dragBookName = null;
let folderMenuActions;
const SOURCE_ICON_DEFINITIONS = Object.freeze([
    { key:'character', icon:'fa-user', label:'Character' },
    { key:'chat', icon:'fa-comments', label:'Chat' },
    { key:'persona', icon:'fa-id-badge', label:'Persona' },
]);

const setCollapseState = (name, isCollapsed)=>{
    collapseStates[name] = Boolean(isCollapsed);
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

const applyCollapseState = (name)=>{
    const isCollapsed = collapseStates[name];
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
    setCollapseState(name, isCollapsed);
    applyCollapseState(name);
    updateCollapseAllToggle();
};

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

const renderBookSourceLinks = (sourceLinksContainer, links = null)=>{
    if (!sourceLinksContainer) return;
    sourceLinksContainer.innerHTML = '';
    const normalized = normalizeBookSourceLinks(links);
    for (const def of SOURCE_ICON_DEFINITIONS) {
        if (!normalized[def.key]) continue;
        const icon = document.createElement('i');
        icon.classList.add('stwid--sourceIcon', 'fa-solid', 'fa-fw', def.icon);
        icon.title = `${def.label} linked`;
        icon.setAttribute('aria-label', `${def.label} linked`);
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

const buildMoveBookMenuItem = (name, closeMenu)=>{
    const item = document.createElement('div'); {
        item.classList.add('stwid--item');
        item.classList.add('stwid--moveToFolder');
        item.addEventListener('click', async(evt)=>{
            evt.stopPropagation();
            closeMenu?.();

            const currentFolder = getFolderFromMetadata(state.cache[name]?.metadata);
            const registry = getFolderRegistry();
            const folderNames = Array.from(new Set([
                ...registry,
                ...Object.keys(folderDoms),
            ])).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));

            const modal = document.createElement('dialog');
            modal.classList.add('popup');
            modal.addEventListener('click', (e)=>{
                if (e.target === modal) {
                    modal.close();
                }
            });
            modal.addEventListener('close', ()=>{
                modal.remove();
            });

            const popupBody = document.createElement('div');
            popupBody.classList.add('popup-body');

            const popupContent = document.createElement('div');
            popupContent.classList.add('popup-content');
            popupContent.classList.add('stwid--moveBookContent');

            const title = document.createElement('h3');
            title.textContent = `Move "${name}" to folder`;
            popupContent.append(title);

            const row = document.createElement('div');
            row.classList.add('stwid--item');
            row.classList.add('stwid--moveBookRow');
            const select = document.createElement('select');
            select.classList.add('text_pole');
            select.disabled = folderNames.length === 0;
            if (folderNames.length === 0) {
                const opt = document.createElement('option');
                opt.textContent = '(no folders yet)';
                opt.value = '';
                opt.selected = true;
                select.append(opt);
            } else {
                for (const folderName of folderNames) {
                    const opt = document.createElement('option');
                    opt.value = folderName;
                    opt.textContent = folderName;
                    if (folderName === currentFolder) opt.selected = true;
                    select.append(opt);
                }
            }
            row.append(select);

            const buttonRowA = document.createElement('div');
            buttonRowA.classList.add('stwid--moveBookQuickActions');

            const createBtn = document.createElement('button');
            createBtn.classList.add('menu_button', 'interactable');
            createBtn.title = 'New Folder';
            createBtn.setAttribute('aria-label', 'New Folder');
            const createIcon = document.createElement('i');
            createIcon.classList.add('fa-solid', 'fa-fw', 'fa-folder-plus');
            createBtn.append(createIcon);
            createBtn.addEventListener('click', async(e)=>{
                e.preventDefault();
                e.stopPropagation();
                const nextName = await state.Popup?.show.input('Create folder', 'Enter a new folder name:', 'New Folder');
                if (!nextName) return;
                const reg = registerFolderName(nextName);
                if (!reg.ok) {
                    if (reg.reason === 'empty') {
                        toastr.warning('Folder name cannot be empty.');
                    } else {
                        toastr.error('Folder names cannot include "/".');
                    }
                    return;
                }

                // Requirement: immediately add the book to the new folder.
                const updated = await setBookFolder(name, reg.folder);
                if (updated) {
                    await refreshList();
                    // Jump to location: scroll the destination folder/book into view.
                    const target = state.cache[name]?.dom?.root;
                    target?.scrollIntoView({ block: 'center' });
                }
                modal.close();
            });
            buttonRowA.append(createBtn);

            const noFolderBtn = document.createElement('button');
            noFolderBtn.classList.add('menu_button', 'interactable');
            noFolderBtn.title = 'No Folder';
            noFolderBtn.setAttribute('aria-label', 'No Folder');
            const noFolderIcon = document.createElement('i');
            noFolderIcon.classList.add('fa-solid', 'fa-fw', 'fa-folder-minus');
            noFolderBtn.append(noFolderIcon);
            noFolderBtn.addEventListener('click', async(e)=>{
                e.preventDefault();
                e.stopPropagation();
                if (!currentFolder) {
                    toastr.info('Book is already not in a folder.');
                    return;
                }
                const updated = await setBookFolder(name, null);
                if (updated) {
                    await refreshList();
                    const target = state.cache[name]?.dom?.root;
                    target?.scrollIntoView({ block: 'center' });
                }
                modal.close();
            });
            buttonRowA.append(noFolderBtn);
            row.append(buttonRowA);
            popupContent.append(row);

            const buttonRowB = document.createElement('div');
            buttonRowB.classList.add('stwid--moveBookButtons');
            buttonRowB.classList.add('stwid--moveBookButtons--primary');
            buttonRowB.classList.add('popup-controls');

            const moveBtn = document.createElement('button');
            moveBtn.classList.add('menu_button');
            moveBtn.classList.add('popup-button-ok');
            moveBtn.textContent = 'Save';
            moveBtn.disabled = folderNames.length === 0;
            moveBtn.addEventListener('click', async(e)=>{
                e.preventDefault();
                e.stopPropagation();
                const selectedFolder = select.disabled ? null : select.value;
                if (!selectedFolder) return;

                if (selectedFolder === currentFolder) {
                    toastr.info("Book is already in that folder.");
                    return;
                }

                const updated = await setBookFolder(name, selectedFolder);
                if (updated) {
                    await refreshList();
                    const target = state.cache[name]?.dom?.root;
                    target?.scrollIntoView({ block: 'center' });
                }
                modal.close();
            });
            buttonRowB.append(moveBtn);

            const cancelBtn = document.createElement('button');
            cancelBtn.classList.add('menu_button');
            cancelBtn.classList.add('popup-button-cancel');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', (e)=>{
                e.preventDefault();
                e.stopPropagation();
                modal.close();
            });
            buttonRowB.append(cancelBtn);

            popupContent.append(buttonRowB);

            popupBody.append(popupContent);
            modal.append(popupBody);
            document.body.append(modal);
            modal.showModal();
        });
        const i = document.createElement('i'); {
            i.classList.add('stwid--icon');
            i.classList.add('fa-solid', 'fa-fw', 'fa-folder-tree');
            item.append(i);
        }
        const txt = document.createElement('span'); {
            txt.classList.add('stwid--label');
            txt.textContent = 'Move Book to Folder';
            item.append(txt);
        }
    }
    return item;
};

const openImportDialog = ()=>{
    const input = /**@type {HTMLInputElement}*/(document.querySelector('#world_import_file'));
    if (!input) return null;

    // Allow callers (folder import into folder) to attribute imported
    // books without diffing world_names.
    // We sniff the selected file before ST consumes it.
    const filePromise = new Promise((resolve)=>{
        let isDone = false;
        const finish = (value)=>{
            if (isDone) return;
            isDone = true;
            input.removeEventListener('change', onChange);
            window.removeEventListener('focus', onWindowFocus);
            clearTimeout(timeoutId);
            resolve(value);
        };
        const onChange = async()=>{
            const [file] = input.files ?? [];
            if (!file) {
                finish(null);
                return;
            }
            try {
                finish(JSON.parse(await file.text()));
            } catch {
                finish(null);
            }
        };
        const onWindowFocus = ()=>{
            // Browser file pickers usually return focus once closed.
            // If no file is selected at that point, treat it as cancel.
            setTimeout(()=>{
                if (isDone) return;
                if ((input.files?.length ?? 0) === 0) {
                    finish(null);
                }
            }, 0);
        };
        const timeoutId = setTimeout(()=>finish(null), 15000);
        input.value = '';
        input.addEventListener('change', onChange, { once:true });
        window.addEventListener('focus', onWindowFocus, { once:true });
        try {
            input.click();
        } catch {
            finish(null);
        }
    });
    return filePromise;
};

const importFolderFile = async(file)=>{
    if (!file) return false;
    let payload;
    try {
        payload = JSON.parse(await file.text());
    } catch (error) {
        console.warn('[STWID] Failed to parse folder import file', error);
        toastr.error('Folder import failed: invalid JSON.');
        return false;
    }
    const books = payload?.books;
    if (!books || typeof books !== 'object' || Array.isArray(books)) {
        toastr.error('Folder import failed: missing "books" object.');
        return false;
    }
    const currentNames = new Set(state.getWorldNames ? state.getWorldNames() : state.world_names);
    const createdNames = [];
    for (const [rawName, bookData] of Object.entries(books)) {
        if (!bookData || typeof bookData !== 'object') continue;
        const entries = bookData.entries;
        if (!entries || typeof entries !== 'object') continue;
        const metadata = typeof bookData.metadata === 'object' && bookData.metadata ? bookData.metadata : {};
        let name = rawName;
        if (currentNames.has(name)) {
            let index = 1;
            while (currentNames.has(name)) {
                const suffix = index === 1 ? ' (imported)' : ` (imported ${index})`;
                name = `${rawName}${suffix}`;
                index += 1;
            }
        }
        const created = await state.createNewWorldInfo(name, { interactive: false });
        if (!created) continue;
        const nextPayload = {
            entries: structuredClone(entries),
            metadata: structuredClone(metadata),
        };
        sanitizeFolderMetadata(nextPayload.metadata);
        await state.saveWorldInfo(name, nextPayload, true);
        currentNames.add(name);
        createdNames.push(name);
    }
    if (!createdNames.length) {
        toastr.warning('Folder import finished with no new books.');
        return false;
    }
    await refreshList();
    toastr.success(`Imported ${createdNames.length} book${createdNames.length === 1 ? '' : 's'}.`);
    return true;
};

const openFolderImportDialog = ()=>{
    if (!folderImportInput) {
        folderImportInput = document.createElement('input');
        folderImportInput.type = 'file';
        folderImportInput.accept = '.json,application/json';
        folderImportInput.hidden = true;
        folderImportInput.addEventListener('change', async()=>{
            const [file] = folderImportInput.files ?? [];
            folderImportInput.value = '';
            await importFolderFile(file);
        });
        document.body.append(folderImportInput);
    }
    folderImportInput.click();
};

/**
 * Waits for a DOM condition to become true.
 * Uses a MutationObserver where possible to avoid fixed delays.
 *
 * @param {() => boolean} condition
 * @param {{ timeoutMs?: number, root?: ParentNode }} [options]
 */
const waitForDom = (condition, { timeoutMs = 5000, root = document } = {})=>new Promise((resolve)=>{
    if (condition()) {
        resolve(true);
        return;
    }

    let done = false;
    const finish = (value)=>{
        if (done) return;
        done = true;
        clearTimeout(timer);
        observer.disconnect();
        resolve(value);
    };

    const observer = new MutationObserver(()=>{
        if (condition()) finish(true);
    });
    // Observe broadly: ST may render buttons/options dynamically.
    observer.observe(root === document ? document.documentElement : /**@type {Node}*/(root), {
        childList: true,
        subtree: true,
        attributes: true,
    });

    const timer = setTimeout(()=>finish(false), timeoutMs);
});

const setSelectedBookInCoreUi = async(bookName)=>{
    const select = /**@type {HTMLSelectElement}*/(document.querySelector('#world_editor_select'));
    if (!select) return false;
    const option = /**@type {HTMLOptionElement[]}*/([...select.children]).find((item)=>item.textContent == bookName);
    if (!option) return false;

    const previousValue = select.value;
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles:true }));

    // Wait for the selection to be reflected in the DOM/state.
    // We can't rely on fixed delays because ST may update asynchronously.
    // As a minimal robust check, wait until the select reports the new value
    // and at least one mutation occurs in the WI area (common after change).
    if (select.value !== option.value) return false;
    // If selection did not actually change (same value), still allow continuing.
    if (previousValue === option.value) return true;

    // Prefer waiting for a worldinfo update cycle if available.
    if (state.waitForWorldInfoUpdate) {
        // Race a short timeout: selection changes sometimes do not emit WORLDINFO_UPDATED.
        await Promise.race([
            state.waitForWorldInfoUpdate(),
            state.delay(800),
        ]);
        return true;
    }
    await state.delay(200);
    return true;
};

const clickCoreUiAction = async(possibleSelectors, { timeoutMs = 5000 } = {})=>{
    const selectors = Array.isArray(possibleSelectors) ? possibleSelectors : [possibleSelectors];
    const findButton = ()=>selectors
        .map((sel)=>document.querySelector(sel))
        .find((el)=>el instanceof HTMLElement);

    const ok = await waitForDom(()=>Boolean(findButton()), { timeoutMs });
    if (!ok) return false;
    const btn = /**@type {HTMLElement}*/(findButton());
    btn.click();
    return true;
};

const duplicateBook = async(name)=>{
    const getNames = ()=>state.getWorldNames ? state.getWorldNames() : state.world_names;
    const initialNames = [...(getNames() ?? [])];
    const initialNameSet = new Set(initialNames);
    const selected = await setSelectedBookInCoreUi(name);
    if (!selected) return null;

    // Click the duplicate action once it exists.
    // Keep selector list flexible to tolerate minor ST UI changes.
    const clicked = await clickCoreUiAction([
        '#world_duplicate',
        '[id="world_duplicate"]',
    ]);
    if (!clicked) return null;

    // Wait for either:
    // 1) a WORLDINFO update cycle (preferred), then detect new name
    // 2) or the names list to change in a short polling loop
    // Avoid hard-coded "sleep then hope".
    const findNewName = ()=>{
        const currentNames = getNames() ?? [];
        return currentNames.find((entry)=>!initialNameSet.has(entry)) ?? null;
    };

    // Fast path: if ST immediately updated world_names synchronously.
    const immediate = findNewName();
    if (immediate) return immediate;

    const timeoutMs = 8000;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (state.waitForWorldInfoUpdate) {
            await Promise.race([state.waitForWorldInfoUpdate(), state.delay(250)]);
        } else {
            await state.delay(250);
        }
        const next = findNewName();
        if (next) return next;
    }
    return null;
};

const duplicateBookIntoFolder = async(name, folderName)=>{
    const duplicatedName = await duplicateBook(name);
    if (!duplicatedName) return false;
    await setBookFolder(duplicatedName, folderName);
    await refreshList();
    return true;
};

const deleteBook = async(name, { skipConfirm = false } = {})=>{
    if (skipConfirm && state.deleteWorldInfo) {
        await state.deleteWorldInfo(name);
        return;
    }
    const selected = await setSelectedBookInCoreUi(name);
    if (!selected) return;

    await clickCoreUiAction([
        '#world_popup_delete',
        '[id="world_popup_delete"]',
    ]);
};

const selectEnd = ()=>{
    selectFrom = null;
    selectMode = null;
    selectList = null;
    selectLast = null;
    if (selectToast) {
        toastr.clear(selectToast);
    }
    state.dom.books.classList.remove('stwid--isDragging');
    [...state.dom.books.querySelectorAll('.stwid--entry.stwid--isSelected')]
        .forEach(it=>{
            it.classList.remove('stwid--isSelected');
            it.removeAttribute('draggable');
            const icon = it.querySelector('.stwid--selector > .stwid--icon');
            icon.classList.add('fa-square');
            icon.classList.remove('fa-square-check');
        })
    ;
    [...state.dom.books.querySelectorAll('.stwid--book.stwid--isTarget')]
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
            if (!folderDoms[folderName]) {
                folderDoms[folderName] = createFolderDom({
                    folderName,
                    onToggle: ()=>{
                        const isCollapsed = !folderDoms[folderName].books.classList.contains('stwid--isCollapsed');
                        setFolderCollapsedAndPersist(folderName, isCollapsed);
                    },
                    onDragStateChange: (isOver)=>{
                        if (!dragBookName) return false;
                        return isOver;
                    },
                    onDrop: async(evt)=>{
                        if (!dragBookName) return;
                        const draggedName = dragBookName;
                        dragBookName = null;
                        const isCopy = evt.ctrlKey;
                        const currentFolder = getFolderFromMetadata(state.cache[draggedName]?.metadata);
                        if (!isCopy) {
                            if (currentFolder === folderName) return;
                            const updated = await setBookFolder(draggedName, folderName);
                            if (updated) await refreshList();
                            return;
                        }
                        await duplicateBookIntoFolder(draggedName, folderName);
                    },
                    menuActions: folderMenuActions,
                });
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
                if (insertBefore) insertBefore.insertAdjacentElement('beforebegin', folderDoms[folderName].root);
                else state.dom.books.append(folderDoms[folderName].root);
                const initialCollapsed = folderCollapseStates[folderName] ?? true;
                setFolderCollapsed(folderDoms[folderName], initialCollapsed);
            }
            targetParent = folderDoms[folderName].books;
        }
    }
    const book = document.createElement('div'); {
        world.dom.root = book;
        book.classList.add('stwid--book');
        book.addEventListener('dragover', (evt)=>{
            if (dragBookName) {
                evt.preventDefault();
                book.classList.add('stwid--isTarget');
                return;
            }
            if (selectFrom === null) return;
            evt.preventDefault();
            book.classList.add('stwid--isTarget');
        });
        book.addEventListener('dragleave', (evt)=>{
            if (dragBookName) {
                book.classList.remove('stwid--isTarget');
                return;
            }
            if (selectFrom === null) return;
            book.classList.remove('stwid--isTarget');
        });
        book.addEventListener('drop', async(evt)=>{
            if (dragBookName) {
                evt.preventDefault();
                evt.stopPropagation();
                book.classList.remove('stwid--isTarget');
                const draggedName = dragBookName;
                dragBookName = null;
                const targetFolder = getFolderFromMetadata(state.cache[name]?.metadata);
                const isCopy = evt.ctrlKey;
                if (!isCopy) {
                    const currentFolder = getFolderFromMetadata(state.cache[draggedName]?.metadata);
                    if (currentFolder === targetFolder) return;
                    const updated = await setBookFolder(draggedName, targetFolder);
                    if (updated) await refreshList();
                    return;
                }
                await duplicateBookIntoFolder(draggedName, targetFolder);
                return;
            }
            if (selectFrom === null) return;
            evt.preventDefault();
            const isCopy = evt.ctrlKey;
            if (!selectList?.length) {
                selectEnd();
                return;
            }
            if (selectFrom != name || isCopy) {
                const srcBook = await state.loadWorldInfo(selectFrom);
                const dstBook = await state.loadWorldInfo(name);
                // F3: Batch move/copy saves.
                // Build all destination entries in-memory first, then save once.
                // If moving, delete from source and save once after all deletions.
                let hasDstChanges = false;
                let hasSrcChanges = false;
                for (const uid of selectList) {
                    const srcEntry = srcBook.entries[uid];
                    if (!srcEntry) continue;

                    const oData = Object.assign({}, srcEntry);
                    delete oData.uid;

                    const dstEntry = state.createWorldInfoEntry(null, dstBook);
                    Object.assign(dstEntry, oData);
                    hasDstChanges = true;

                    if (!isCopy) {
                        const deleted = await state.deleteWorldInfoEntry(srcBook, uid, { silent:true });
                        if (deleted) {
                            state.deleteWIOriginalDataValue(srcBook, uid);
                            hasSrcChanges = true;
                        }
                    }
                }

                // Persist destination once.
                if (hasDstChanges) {
                    await state.saveWorldInfo(name, dstBook, true);
                    state.updateWIChange(name, dstBook);
                }

                // Persist source once (move only, and only when we actually deleted something).
                if (!isCopy && selectFrom != name && hasSrcChanges) {
                    await state.saveWorldInfo(selectFrom, srcBook, true);
                    state.updateWIChange(selectFrom, srcBook);
                }
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
                title.title = 'Collapse/expand this book';
                title.setAttribute('draggable', 'true');
                title.addEventListener('dragstart', (evt)=>{
                    dragBookName = name;
                    if (evt.dataTransfer) {
                        evt.dataTransfer.effectAllowed = 'copyMove';
                        evt.dataTransfer.setData('text/plain', name);
                    }
                });
                title.addEventListener('dragend', ()=>{
                    dragBookName = null;
                    for (const folderDom of Object.values(folderDoms)) {
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
                        const select = /**@type {HTMLSelectElement}*/(document.querySelector('#world_info'));
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
                const menuTrigger = document.createElement('div'); {
                    menuTrigger.classList.add('stwid--action');
                    menuTrigger.classList.add('stwid--menuTrigger');
                    menuTrigger.classList.add('fa-solid', 'fa-fw', 'fa-ellipsis-vertical');
                    menuTrigger.title = 'Book menu';
                    menuTrigger.setAttribute('aria-label', 'Book menu');
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
                                const closeMenu = ()=>{
                                    blocker.remove();
                                    menuTrigger.style.anchorName = '';
                                };
                                const rename = document.createElement('div'); {
                                    rename.classList.add('stwid--item');
                                    rename.classList.add('stwid--rename');
                                    rename.addEventListener('click', async(evt)=>{
                                        const selected = await setSelectedBookInCoreUi(name);
                                        if (!selected) return;
                                        await clickCoreUiAction([
                                            '#world_popup_name_button',
                                        ]);
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
                                menu.append(buildMoveBookMenuItem(name, closeMenu));
                                if (state.extensionNames.includes('third-party/SillyTavern-WorldInfoBulkEdit')) {
                                    const bulk = document.createElement('div'); {
                                        bulk.classList.add('stwid--item');
                                        bulk.classList.add('stwid--bulkEdit');
                                        bulk.addEventListener('click', async(evt)=>{
                                            const selected = await setSelectedBookInCoreUi(name);
                                            if (!selected) return;
                                            await clickCoreUiAction([
                                                '.stwibe--trigger',
                                            ]);
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
                                if (state.extensionNames.includes('third-party/SillyTavern-WorldInfoExternalEditor')) {
                                    const editor = document.createElement('div'); {
                                        editor.classList.add('stwid--item');
                                        editor.classList.add('stwid--externalEditor');
                                        editor.addEventListener('click', async(evt)=>{
                                            fetch('/api/plugins/wiee/editor', {
                                                method: 'POST',
                                                headers: state.getRequestHeaders(),
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
                                        await state.fillEmptyTitlesWithKeywords(name);
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
                                        const hasCustomSort = Boolean(state.cache[name].sort);
                                        const globalLabel = state.getSortLabel(state.Settings.instance.sortLogic, state.Settings.instance.sortDirection) ?? 'Global default';
                                        const globalOpt = document.createElement('option'); {
                                            globalOpt.value = 'null';
                                            globalOpt.textContent = `Use global (${globalLabel})`;
                                            globalOpt.selected = !hasCustomSort;
                                            sortSelect.append(globalOpt);
                                        }
                                        state.appendSortOptions(sortSelect, state.cache[name].sort?.sort, state.cache[name].sort?.direction);
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
                                        state.openOrderHelper(name);
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
                                        await state.executeSlashCommand(`/stlo "${escapedName}"`);
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
                                        state.download(JSON.stringify({ entries:state.cache[name].entries }), name, 'application/json');
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
                                        await duplicateBook(name);
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
                                        await deleteBook(name);
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
            const initialCollapsed = collapseStates[name] ?? entryList.classList.contains('stwid--isCollapsed');
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

const loadList = async()=>{
    state.dom.books.innerHTML = '';
    for (const folderDom of Object.values(folderDoms)) {
        folderDom.observer?.disconnect();
    }
    for (const key of Object.keys(folderDoms)) {
        delete folderDoms[key];
    }

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
        folderDoms[folderName] = createFolderDom({
            folderName,
            onToggle: ()=>{
                const isCollapsed = !folderDoms[folderName].books.classList.contains('stwid--isCollapsed');
                setFolderCollapsedAndPersist(folderName, isCollapsed);
            },
            onDragStateChange: (isOver)=>{
                if (!dragBookName) return false;
                return isOver;
            },
            onDrop: async(evt)=>{
                if (!dragBookName) return;
                const draggedName = dragBookName;
                dragBookName = null;
                const isCopy = evt.ctrlKey;
                const currentFolder = getFolderFromMetadata(state.cache[draggedName]?.metadata);
                if (!isCopy) {
                    if (currentFolder === folderName) return;
                    const updated = await setBookFolder(draggedName, folderName);
                    if (updated) await refreshList();
                    return;
                }
                await duplicateBookIntoFolder(draggedName, folderName);
            },
            menuActions: folderMenuActions,
        });
        state.dom.books.append(folderDoms[folderName].root);
        const initialCollapsed = folderCollapseStates[folderName] ?? true;
        setFolderCollapsed(folderDoms[folderName], initialCollapsed);
        const folderBooks = folderGroups.get(folderName) ?? [];
        for (let i = 0; i < folderBooks.length; i++) {
            const book = folderBooks[i];
            await renderBook(book.name, null, book.data, folderDoms[folderName].books);
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
    updateFolderActiveToggles();
};

const refreshList = async()=>{
    state.dom.drawer.body.classList.add('stwid--isLoading');
    state.resetEditor?.();
    for (const [bookName, bookData] of Object.entries(state.cache)) {
        const isCollapsed = bookData?.dom?.entryList?.classList.contains('stwid--isCollapsed');
        if (isCollapsed !== undefined) setCollapseState(bookName, isCollapsed);
        delete state.cache[bookName];
    }
    try {
        await loadListDebounced();
        searchInput?.dispatchEvent(new Event('input'));
    } finally {
        state.dom.drawer.body.classList.remove('stwid--isLoading');
    }
};

const updateFolderActiveToggles = ()=>{
    for (const folderDom of Object.values(folderDoms)) {
        folderDom.updateActiveToggle?.();
    }
};

const setupFilter = (list)=>{
    const filter = document.createElement('div'); {
        const setQueryFiltered = (element, isFiltered)=>{
            if (!element) return;
            if (isFiltered) {
                if (!element.classList.contains('stwid--filter-query')) {
                    element.classList.add('stwid--filter-query');
                }
                return;
            }
            if (element.classList.contains('stwid--filter-query')) {
                element.classList.remove('stwid--filter-query');
            }
        };

        const buildEntrySearchSignature = (entry)=>{
            const comment = entry?.comment ?? '';
            const keys = Array.isArray(entry?.key) ? entry.key.join(', ') : '';
            return `${String(comment)}\n${String(keys)}`;
        };

        const getEntrySearchText = (bookName, entry)=>{
            if (!entry?.uid) return '';
            const signature = buildEntrySearchSignature(entry);
            entrySearchCache[bookName] ??= {};
            const cached = entrySearchCache[bookName][entry.uid];
            if (cached?.signature === signature) return cached.text;
            const text = signature.toLowerCase();
            entrySearchCache[bookName][entry.uid] = { signature, text };
            return text;
        };

        filter.classList.add('stwid--filter');
        const search = document.createElement('input'); {
            search.classList.add('stwid--search');
            search.classList.add('text_pole');
            search.type = 'search';
            search.placeholder = 'Search books';
            search.title = 'Search books by name';
            search.setAttribute('aria-label', 'Search books');
            searchInput = search;
            const entryMatchesQuery = (bookName, entry, normalizedQuery)=>getEntrySearchText(bookName, entry).includes(normalizedQuery);

            const applySearchFilter = ()=>{
                const query = search.value.toLowerCase();
                const searchEntries = searchEntriesInput.checked;
                const shouldScanEntries = searchEntries && query.length >= 2;

                for (const b of Object.keys(state.cache)) {
                    if (query.length) {
                        const bookMatch = b.toLowerCase().includes(query);
                        const entryMatch = shouldScanEntries
                            && Object.values(state.cache[b].entries).find(e=>entryMatchesQuery(b, e, query));
                        setQueryFiltered(state.cache[b].dom.root, !(bookMatch || entryMatch));

                        if (shouldScanEntries) {
                            for (const e of Object.values(state.cache[b].entries)) {
                                setQueryFiltered(state.cache[b].dom.entry[e.uid].root, !(bookMatch || entryMatchesQuery(b, e, query)));
                            }
                        } else {
                            for (const e of Object.values(state.cache[b].entries)) {
                                setQueryFiltered(state.cache[b].dom.entry[e.uid].root, false);
                            }
                        }
                    } else {
                        setQueryFiltered(state.cache[b].dom.root, false);
                        for (const e of Object.values(state.cache[b].entries)) {
                            setQueryFiltered(state.cache[b].dom.entry[e.uid].root, false);
                        }
                    }
                }
                updateFolderActiveToggles();
            };

            // Debounce to reduce O(total entries) work on every keystroke.
            const applySearchFilterDebounced = state.debounce(()=>applySearchFilter(), 125);

            search.addEventListener('input', ()=>{
                applySearchFilterDebounced();
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
        const applyActiveFilter = ()=>{
            if (!filterActiveInput) return;
            const selected = state.getSelectedWorldInfo ? state.getSelectedWorldInfo() : state.selected_world_info;
            for (const b of Object.keys(state.cache)) {
                if (filterActiveInput.checked) {
                    if (selected.includes(b)) {
                        state.cache[b].dom.root.classList.remove('stwid--filter-active');
                    } else {
                        state.cache[b].dom.root.classList.add('stwid--filter-active');
                    }
                } else {
                    state.cache[b].dom.root.classList.remove('stwid--filter-active');
                }
            }
            updateFolderActiveToggles();
        };
        state.applyActiveFilter = applyActiveFilter;
        const filterActive = document.createElement('label'); {
            filterActive.classList.add('stwid--filterActive');
            filterActive.title = 'Only show globally active books';
            const inp = document.createElement('input'); {
                inp.type = 'checkbox';
                filterActiveInput = inp;
                inp.addEventListener('click', ()=>{
                    applyActiveFilter();
                });
                filterActive.append(inp);
            }
            filterActive.append('Active');
            filter.append(filterActive);
        }
        list.append(filter);
    }
};

const setupBooks = (list)=>{
    const books = document.createElement('div'); {
        state.dom.books = books;
        books.classList.add('stwid--books');
        books.addEventListener('dragover', (evt)=>{
            if (!dragBookName) return;
            if (evt.target.closest('.stwid--folderHeader')) return;
            evt.preventDefault();
        });
        books.addEventListener('drop', async(evt)=>{
            if (!dragBookName) return;
            if (evt.target.closest('.stwid--folderHeader')) return;
            evt.preventDefault();
            const draggedName = dragBookName;
            dragBookName = null;
            const isCopy = evt.ctrlKey;
            if (!isCopy) {
                const updated = await setBookFolder(draggedName, null);
                if (updated) await refreshList();
                return;
            }
            await duplicateBookIntoFolder(draggedName, null);
        });
        list.append(books);
    }
};

const setupListPanel = (list)=>{
    setupFilter(list);
    setupBooks(list);
};

const getSelectionState = ()=>({
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
    get selectMode() {
        return selectMode;
    },
    set selectMode(value) {
        selectMode = value;
    },
    get selectToast() {
        return selectToast;
    },
    set selectToast(value) {
        selectToast = value;
    },
});

const initListPanel = (options)=>{
    state = options;
    for (const key of Object.keys(entrySearchCache)) {
        delete entrySearchCache[key];
    }
    Object.assign(folderCollapseStates, loadFolderCollapseStates());
    loadListDebounced = state.debounceAsync(()=>loadList());
    let folderImportInProgress = false;

    folderMenuActions = {
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
        deleteBook,
        download: state.download,
        getWorldNames: () => state.getWorldNames ? state.getWorldNames() : state.world_names,
        getSelectedWorldInfo: () => state.getSelectedWorldInfo ? state.getSelectedWorldInfo() : state.selected_world_info,
        isFolderImporting: ()=>folderImportInProgress,
        setFolderImporting: (value)=>{
            folderImportInProgress = Boolean(value);
        },
        openOrderHelper: state.openOrderHelper,
        openImportDialog,
        refreshList,
        setBookFolder,
        setBooksActive: (bookNames, isActive)=>setFolderBooksActive(bookNames, isActive, state.onWorldInfoChange),
        waitForWorldInfoUpdate: state.waitForWorldInfoUpdate,
    };
    setupListPanel(state.list);
    return {
        applyActiveFilter: state.applyActiveFilter,
        clearBookSortPreferences,
        getSelectionState,
        hasExpandedBooks,
        openFolderImportDialog,
        refreshList,
        renderBook,
        selectAdd,
        selectEnd,
        selectRemove,
        setBookCollapsed,
        setBookFolder,
        setCacheMetadata,
        setCollapseState,
        setBookSortPreference,
        sortEntriesIfNeeded,
        updateAllBookSourceLinks,
        updateBookSourceLinks,
        updateFolderActiveToggles,
        updateCollapseAllToggle,
    };
};

export { initListPanel, refreshList };
