import { cloneMetadata } from './sortHelpers.js';

const createBooksViewSlice = ({
    listPanelState,
    runtime,
    coreUiSelectors,
    foldersViewSlice,
    selectionDnDSlice,
    bookMenuSlice,
    getFolderFromMetadata,
    getFolderRegistry,
    registerFolderName,
    getBookSortChoice,
    setBookCollapsed,
    setCacheMetadata,
    updateBookSourceLinks,
    updateCollapseAllToggle,
})=>{
    const renderBook = async(name, before = null, bookData = null, parent = null)=>{
        const data = bookData ?? await runtime.loadWorldInfo(name);
        const world = { entries:{}, metadata: cloneMetadata(data.metadata), sort:runtime.getSortFromMetadata(data.metadata) };
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
        runtime.cache[name] = world;
        setCacheMetadata(name, data.metadata);
        let targetParent = parent ?? runtime.dom.books;
        if (!parent) {
            const folderName = getFolderFromMetadata(runtime.cache[name].metadata);
            if (folderName) {
                const folderDom = foldersViewSlice.ensureFolderDom(folderName);
                targetParent = folderDom?.books ?? targetParent;
            }
        }
        const book = document.createElement('div'); {
            world.dom.root = book;
            book.classList.add('stwid--book');
            book.addEventListener('dragover', (evt)=>selectionDnDSlice()?.onBookDropTargetDragOver(evt, book));
            book.addEventListener('dragleave', (evt)=>selectionDnDSlice()?.onBookDropTargetDragLeave(evt, book));
            book.addEventListener('drop', async(evt)=>selectionDnDSlice()?.onBookDropTargetDrop(
                evt,
                name,
                book,
                ()=>getFolderFromMetadata(runtime.cache[name]?.metadata),
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
                        for (const bookDom of Object.values(runtime.cache)) {
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
                        const selected = runtime.getSelectedWorldInfo ? runtime.getSelectedWorldInfo() : runtime.selected_world_info;
                        active.checked = selected.includes(name);
                        active.addEventListener('click', async()=>{
                            active.disabled = true;
                            const select = /**@type {HTMLSelectElement}*/(document.querySelector(coreUiSelectors.worldInfoSelect));
                            const option = select ? [...select.options].find((opt)=>opt.textContent === name) : null;
                            if (option && select) {
                                option.selected = active.checked;
                                runtime.onWorldInfoChange('__notSlashCommand__');
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
                            const saveData = runtime.buildSavePayload(name);
                            const newEntry = runtime.createWorldInfoEntry(name, saveData);
                            runtime.cache[name].entries[newEntry.uid] = structuredClone(newEntry);
                            await runtime.renderEntry(newEntry, name);
                            runtime.cache[name].dom.entry[newEntry.uid].root.click();
                            await runtime.saveWorldInfo(name, saveData, true);
                        });
                        actions.append(add);
                    }
                    const menuTrigger = bookMenuSlice()?.buildBookMenuTrigger(name);
                    if (menuTrigger) {
                        actions.append(menuTrigger);
                    }
                    collapseToggle = document.createElement('div'); {
                        runtime.cache[name].dom.collapseToggle = collapseToggle;
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
                for (const e of runtime.sortEntries(Object.values(world.entries), sort, direction)) {
                    await runtime.renderEntry(e, name);
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

    const loadList = async()=>{
        runtime.dom.books.innerHTML = '';
        foldersViewSlice.resetFolderDoms();

        // Yield to the UI thread periodically to avoid long main-thread stalls on very
        // large lore collections.
        const yieldToUi = ()=>new Promise((resolve)=>setTimeout(resolve, 0));

        const worldNames = runtime.getWorldNames ? runtime.getWorldNames() : runtime.world_names;
        const sortedNames = runtime.safeToSorted(worldNames ?? [], (a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));

        // Load sequentially with occasional yields. This is slower than Promise.all,
        // but keeps the UI responsive for large datasets.
        const books = [];
        for (let i = 0; i < sortedNames.length; i++) {
            const name = sortedNames[i];
            books.push({ name, data: await runtime.loadWorldInfo(name) });
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
            const folderDom = foldersViewSlice.ensureFolderDom(folderName);
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
            await renderBook(book.name, null, book.data, runtime.dom.books);
            if (i > 0 && i % 2 === 0) {
                await yieldToUi();
            }
        }
        runtime.applyActiveFilter?.();
        updateCollapseAllToggle();
        foldersViewSlice.updateCollapseAllFoldersToggle();
    };

    return {
        loadList,
        renderBook,
    };
};

export { createBooksViewSlice };
