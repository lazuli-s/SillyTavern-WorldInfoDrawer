import { cloneMetadata } from '../../shared/sort-helpers.js';

const BOOK_COLLAPSE_TOOLTIP = 'Collapse/expand this book';
const UNSAVED_ENTRY_RETRY_MESSAGE = 'Entry was not saved. Keep this editor open and save again when ready.';

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
    const isFolderGroupingEnabled = ()=>Boolean(runtime?.Settings?.instance?.featureFolderGrouping);
    const yieldToUi = ()=>new Promise((resolve)=>setTimeout(resolve, 0));
    const compareCaseInsensitiveNames = (leftName, rightName)=>leftName.toLowerCase().localeCompare(rightName.toLowerCase());
    const toggleBookCollapsedState = (bookName, entryList)=>{
        const isCollapsed = !entryList.classList.contains('stwid--state-collapsed');
        setBookCollapsed(bookName, isCollapsed);
    };

    const createCachedBookState = (bookName, bookData, parentElement)=>{
        const data = bookData ?? null;
        if (!data || typeof data !== 'object') {
            console.warn(`[STWID] renderBook: skipping "${bookName}" — invalid or missing book payload.`);
            return null;
        }

        const world = {
            entries: {},
            metadata: cloneMetadata(data.metadata),
            sort: runtime.getSortFromMetadata(data.metadata),
        };
        for (const [entryId, entryData] of Object.entries(data.entries)) {
            world.entries[entryId] = structuredClone(entryData);
        }
        world.dom = {
            root: undefined,
            name: undefined,
            sourceLinks: undefined,
            active: undefined,
            entryList: undefined,
            entry: {},
        };
        runtime.cache[bookName] = world;
        setCacheMetadata(bookName, data.metadata);

        let targetParent = parentElement ?? runtime.dom.books;
        if (!parentElement) {
            const folderName = getFolderFromMetadata(runtime.cache[bookName].metadata);
            if (isFolderGroupingEnabled() && folderName) {
                const folderDom = foldersViewSlice.ensureFolderDom(folderName);
                targetParent = folderDom?.books ?? targetParent;
            }
        }

        return { world, targetParent };
    };

    const resolveFailedEntrySave = async(editorOpened, bookName, rollbackOptimisticEntry)=>{
        const hasUnsavedEditorChanges = Boolean(runtime.isDirtyCheck?.());
        const canConfirm = Boolean(runtime.Popup?.show?.confirm);
        if (!(editorOpened && hasUnsavedEditorChanges)) {
            rollbackOptimisticEntry();
            toastr.error('Failed to create new entry. Please try again.');
            return;
        }

        if (!canConfirm) {
            toastr.error(UNSAVED_ENTRY_RETRY_MESSAGE);
            return;
        }

        const retryNow = await runtime.Popup.show.confirm(
            'Failed to save this new entry. Retry now? Press Cancel to keep your edits open.',
        );
        if (retryNow) {
            try {
                const retryPayload = runtime.buildSavePayload(bookName);
                await runtime.saveWorldInfo(bookName, retryPayload, true);
                toastr.success('New entry saved after retry.');
                return;
            } catch (retryErr) {
                console.error('[STWID] add-entry: retry save failed; keeping editor open.', retryErr);
            }
        }

        const discardUnsaved = await runtime.Popup.show.confirm(
            'Save still failed. Discard this unsaved entry and close the editor?',
        );
        if (!discardUnsaved) {
            toastr.error(UNSAVED_ENTRY_RETRY_MESSAGE);
            return;
        }

        rollbackOptimisticEntry();
        toastr.error('Failed to create new entry. Please try again.');
    };

    const buildBookHeader = (bookName, worldState, entryList)=>{
        const head = document.createElement('div');
        head.classList.add('stwid--head');

        let collapseToggle;
        const title = document.createElement('div');
        worldState.dom.name = title;
        title.classList.add('stwid--title');
        title.textContent = bookName;
        title.title = BOOK_COLLAPSE_TOOLTIP;
        title.setAttribute('draggable', 'true');
        title.addEventListener('dragstart', (evt)=>{
            listPanelState.dragBookName = bookName;
            if (evt.dataTransfer) {
                evt.dataTransfer.effectAllowed = 'copyMove';
                evt.dataTransfer.setData('text/plain', bookName);
            }
        });
        title.addEventListener('dragend', ()=>{
            listPanelState.dragBookName = null;
            for (const folderDom of listPanelState.getFolderDomValues()) {
                folderDom.root.classList.remove('stwid--state-target');
            }
            for (const bookDom of Object.values(runtime.cache)) {
                bookDom.dom.root.classList.remove('stwid--state-target');
            }
        });
        title.addEventListener('click', ()=>{
            toggleBookCollapsedState(bookName, entryList);
        });
        head.append(title);

        const actions = document.createElement('div');
        actions.classList.add('stwid--actions');

        const sourceLinks = document.createElement('div');
        worldState.dom.sourceLinks = sourceLinks;
        sourceLinks.classList.add('stwid--sourceLinks', 'stwid--state-empty');
        actions.append(sourceLinks);

        const active = document.createElement('input');
        worldState.dom.active = active;
        active.title = 'Toggle global active status for this book';
        active.setAttribute('aria-label', 'Toggle global active status for this book');
        active.type = 'checkbox';
        const selected = runtime.getSelectedWorldInfo ? runtime.getSelectedWorldInfo() : runtime.selected_world_info;
        active.checked = selected.includes(bookName);
        active.addEventListener('click', async()=>{
            active.disabled = true;
            const select = (document.querySelector(coreUiSelectors.worldInfoSelect));
            const option = select ? [...select.options].find((opt)=>opt.textContent === bookName) : null;
            if (option && select) {
                option.selected = active.checked;
                runtime.onWorldInfoChange('__notSlashCommand__');
            }
            active.disabled = false;
        });
        actions.append(active);

        const add = document.createElement('div');
        add.classList.add('stwid--action');
        add.classList.add('stwid--add');
        add.classList.add('fa-solid', 'fa-fw', 'fa-plus');
        add.title = 'Create new entry in this book';
        add.setAttribute('aria-label', 'Create new entry in this book');
        add.addEventListener('click', async()=>{
            const saveData = runtime.buildSavePayload(bookName);
            const newEntry = runtime.createWorldInfoEntry(bookName, saveData);
            let entryRendered = false;
            let editorOpened = false;
            const rollbackOptimisticEntry = ()=>{
                delete runtime.cache[bookName]?.entries?.[newEntry.uid];
                if (entryRendered) {
                    const entryDom = runtime.cache[bookName]?.dom?.entry?.[newEntry.uid];
                    if (entryDom?.root?.parentElement) {
                        entryDom.root.remove();
                    }
                    if (runtime.cache[bookName]?.dom?.entry) {
                        delete runtime.cache[bookName].dom.entry[newEntry.uid];
                    }
                }
                if (editorOpened) {
                    runtime.resetEditor?.();
                }
            };
            try {
                runtime.cache[bookName].entries[newEntry.uid] = structuredClone(newEntry);
                await runtime.renderEntry(newEntry, bookName);
                entryRendered = true;
                runtime.cache[bookName].dom.entry[newEntry.uid].root.click();
                editorOpened = true;
                await runtime.saveWorldInfo(bookName, saveData, true);
            } catch (err) {
                console.error('[STWID] add-entry: save failed, rolling back optimistic state.', err);
                await resolveFailedEntrySave(editorOpened, bookName, rollbackOptimisticEntry);
            }
        });
        actions.append(add);

        const menuTrigger = bookMenuSlice()?.buildBookMenuTrigger(bookName);
        if (menuTrigger) {
            actions.append(menuTrigger);
        }

        collapseToggle = document.createElement('div');
        runtime.cache[bookName].dom.collapseToggle = collapseToggle;
        collapseToggle.classList.add('stwid--action');
        collapseToggle.classList.add('stwid--collapseToggle');
        collapseToggle.classList.add('fa-solid', 'fa-fw', 'fa-chevron-down');
        collapseToggle.title = BOOK_COLLAPSE_TOOLTIP;
        collapseToggle.setAttribute('aria-label', 'Collapse or expand this book');
        collapseToggle.addEventListener('click', ()=>{
            toggleBookCollapsedState(bookName, entryList);
        });
        actions.append(collapseToggle);

        updateBookSourceLinks(bookName);
        head.append(actions);

        return head;
    };

    const insertBookInAlphabeticalOrder = (bookName, bookElement, targetParent, beforeElement)=>{
        let insertBefore = beforeElement && beforeElement.parentElement === targetParent ? beforeElement : null;
        if (!insertBefore) {
            const normalizedName = bookName.toLowerCase();
            for (const child of targetParent.children) {
                if (!child.classList.contains('stwid--book')) continue;
                const childName = child.querySelector('.stwid--title')?.textContent?.toLowerCase() ?? '';
                if (childName.localeCompare(normalizedName) > 0) {
                    insertBefore = child;
                    break;
                }
            }
        }

        if (insertBefore) {
            insertBefore.insertAdjacentElement('beforebegin', bookElement);
            return;
        }
        targetParent.append(bookElement);
    };

    const loadValidBooksWithYield = async(sortedNames)=>{
        const books = [];
        for (let i = 0; i < sortedNames.length; i++) {
            const name = sortedNames[i];
            const data = await runtime.loadWorldInfo(name);
            if (!data || typeof data !== 'object') {
                console.warn(`[STWID] loadList: skipping book with invalid payload — "${name}"`);
            } else {
                books.push({ name, data });
            }
            if (i > 0 && i % 5 === 0) {
                await yieldToUi();
            }
        }
        return books;
    };

    const groupBooksByFolder = (books)=>{
        const folderGroups = new Map();
        const rootBooks = [];
        for (const book of books) {
            const folderName = getFolderFromMetadata(book.data?.metadata);
            if (isFolderGroupingEnabled() && folderName) {
                registerFolderName(folderName);
                if (!folderGroups.has(folderName)) {
                    folderGroups.set(folderName, []);
                }
                folderGroups.get(folderName).push(book);
                continue;
            }
            rootBooks.push(book);
        }

        const folderRegistry = getFolderRegistry();
        const allFolderNames = new Set(folderRegistry);
        for (const folderName of folderGroups.keys()) {
            allFolderNames.add(folderName);
        }

        return {
            folderGroups,
            rootBooks,
            sortedFolders: [...allFolderNames].sort(compareCaseInsensitiveNames),
        };
    };

    const renderBookBatch = async(booksToRender, getParentElement)=>{
        for (let i = 0; i < booksToRender.length; i++) {
            const book = booksToRender[i];
            await renderBook(book.name, null, book.data, getParentElement());
            if (i > 0 && i % 2 === 0) {
                await yieldToUi();
            }
        }
    };

    const renderGroupedBooks = async(sortedFolders, folderGroups, rootBooks)=>{
        for (const folderName of sortedFolders) {
            const folderDom = foldersViewSlice.ensureFolderDom(folderName);
            const folderBooks = folderGroups.get(folderName) ?? [];
            await renderBookBatch(folderBooks, ()=>folderDom.books);
            await yieldToUi();
        }
        await renderBookBatch(rootBooks, ()=>runtime.dom.books);
    };

    const renderBook = async(name, before = null, bookData = null, parent = null)=>{
        const data = bookData ?? await runtime.loadWorldInfo(name);
        const cachedBookState = createCachedBookState(name, data, parent);
        if (!cachedBookState) {
            return null;
        }
        const { world, targetParent } = cachedBookState;
        const book = document.createElement('div');
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

        const entryList = document.createElement('div');
        world.dom.entryList = entryList;
        entryList.classList.add('stwid--entryList');
        entryList.classList.add('stwid--state-collapsed');

        const head = buildBookHeader(name, world, entryList);
        book.append(head);

        const { sort, direction } = getBookSortChoice(name);
        for (const entry of runtime.sortEntries(Object.values(world.entries), sort, direction)) {
            await runtime.renderEntry(entry, name);
        }
        const initialCollapsed = listPanelState.getCollapseState(name) ?? entryList.classList.contains('stwid--state-collapsed');
        setBookCollapsed(name, initialCollapsed);
        book.append(entryList);

        insertBookInAlphabeticalOrder(name, book, targetParent, before);

        return book;
    };

    const loadList = async()=>{
        runtime.dom.books.innerHTML = '';
        foldersViewSlice.resetFolderDoms();

        const worldNames = runtime.getWorldNames ? runtime.getWorldNames() : runtime.world_names;
        const sortedNames = runtime.safeToSorted(worldNames ?? [], compareCaseInsensitiveNames);
        const books = await loadValidBooksWithYield(sortedNames);
        const { folderGroups, rootBooks, sortedFolders } = groupBooksByFolder(books);
        await renderGroupedBooks(sortedFolders, folderGroups, rootBooks);
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


