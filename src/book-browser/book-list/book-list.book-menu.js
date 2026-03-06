
import { createExtensionIntegrationsSlice } from './book-list.extension-integrations.js';

const UNSAVED_EDITS_WARNING_PREFIX = 'Unsaved edits detected. Save or discard changes before';

const createBookMenuSlice = ({
    listPanelState,
    runtime: state,
    coreUiSelectors,
    coreUiActionSelectors,
    folderDeps,
    setSelectedBookInCoreUi,
    clickCoreUiAction,
    getBookSortChoice,
    refreshList,
    setBookFolder,
    setBookSortPreference,
    applyBookFolderChange,
})=>{
    const addMenuItemKeyboardSupport = (item)=>{
        item.tabIndex = 0;
        item.addEventListener('keydown', (evt)=>{
            if (evt.key === 'Enter' || evt.key === ' ') {
                evt.preventDefault();
                item.click();
            }
        });
    };

    const createBookMenuActionItem = ({
        itemClass,
        iconClass,
        labelText,
        onClick,
        enableKeyboard = true,
        attributes = {},
    })=>{
        const item = document.createElement('div');
        item.classList.add('stwid--listDropdownItem', 'stwid--menuItem', itemClass);
        for (const [key, value] of Object.entries(attributes)) {
            if (value !== undefined && value !== null) {
                item.setAttribute(key, value);
            }
        }
        if (enableKeyboard) {
            addMenuItemKeyboardSupport(item);
        }
        item.addEventListener('click', onClick);

        const itemIcon = document.createElement('i');
        itemIcon.classList.add('stwid--icon', 'fa-solid', 'fa-fw', iconClass);
        item.append(itemIcon);

        const menuLabel = document.createElement('span');
        menuLabel.classList.add('stwid--label');
        menuLabel.textContent = labelText;
        item.append(menuLabel);

        return item;
    };

    const abortIfUnsavedChanges = (actionLabel)=>{
        if (!state.isDirtyCheck?.()) return false;
        toastr.warning(`${UNSAVED_EDITS_WARNING_PREFIX} ${actionLabel}.`);
        return true;
    };

    const openImportDialog = ()=>{
        const input = (document.querySelector(coreUiSelectors.importFileInput));
        if (!input) return null;

        
        
        
        const filePromise = new Promise((resolve)=>{
            let isDone = false;
            const abortController = new AbortController();
            const finish = (value)=>{
                if (isDone) return;
                isDone = true;
                abortController.abort();
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
                
                
                setTimeout(()=>{
                    if (isDone) return;
                    if ((input.files?.length ?? 0) === 0) {
                        finish(null);
                    }
                }, 0);
            };
            const timeoutId = setTimeout(()=>finish(null), 15000);
            input.value = '';
            input.addEventListener('change', onChange, { once:true, signal:abortController.signal });
            window.addEventListener('focus', onWindowFocus, { once:true, signal:abortController.signal });
            try {
                input.click();
            } catch {
                finish(null);
            }
        });
        return filePromise;
    };

    const parseFolderImportPayload = async(file)=>{
        if (!file) return null;
        let payload;
        try {
            payload = JSON.parse(await file.text());
        } catch (error) {
            console.warn('[STWID] Failed to parse folder import file', error);
            toastr.error('Folder import failed: invalid JSON.');
            return null;
        }
        const books = payload?.books;
        if (!books || typeof books !== 'object' || Array.isArray(books)) {
            toastr.error('Folder import failed: missing "books" object.');
            return null;
        }
        return books;
    };

    const buildImportedBookName = (rawName, currentNames)=>{
        let importedName = rawName;
        let index = 1;
        while (currentNames.has(importedName)) {
            const suffix = index === 1 ? ' (imported)' : ` (imported ${index})`;
            importedName = `${rawName}${suffix}`;
            index += 1;
        }
        return importedName;
    };

    const importSingleBook = async(rawName, bookData, currentNames)=>{
        if (!bookData || typeof bookData !== 'object') return null;
        const entries = bookData.entries;
        if (!entries || typeof entries !== 'object') return null;
        const metadata = typeof bookData.metadata === 'object' && bookData.metadata ? bookData.metadata : {};
        const importedName = buildImportedBookName(rawName, currentNames);
        let bookCreated = false;
        try {
            const created = await state.createNewWorldInfo(importedName, { interactive: false });
            if (!created) return null;
            const nextPayload = {
                entries: structuredClone(entries),
                metadata: structuredClone(metadata),
            };
            folderDeps.sanitizeFolderMetadata(nextPayload.metadata);
            await state.saveWorldInfo(importedName, nextPayload, true);
            bookCreated = true;
            currentNames.add(importedName);
            return { createdName: importedName };
        } catch (error) {
            console.warn('[STWID] Failed to import book:', importedName, error);
            if (bookCreated) {
                try {
                    await state.deleteWorldInfo?.(importedName);
                } catch (rollbackError) {
                    console.warn('[STWID] Rollback failed for book:', importedName, rollbackError);
                    toastr.warning(`Import cleanup failed for "${importedName}". Delete this book manually if it appears in the lorebook list.`);
                }
            }
            return { failedName: rawName };
        }
    };

    const showFolderImportResult = async(createdNames, failedBooks)=>{
        if (!createdNames.length && !failedBooks.length) {
            toastr.warning('Folder import finished with no new books.');
            return false;
        }
        if (createdNames.length) {
            await refreshList();
        }
        if (failedBooks.length) {
            toastr.error(`Import failed for ${failedBooks.length} book${failedBooks.length === 1 ? '' : 's'}: ${failedBooks.slice(0, 3).join(', ')}${failedBooks.length > 3 ? '\u2026' : ''}`);
        }
        if (createdNames.length) {
            toastr.success(`Imported ${createdNames.length} book${createdNames.length === 1 ? '' : 's'}.`);
        }
        return createdNames.length > 0;
    };

    const importFolderFile = async(file)=>{
        const books = await parseFolderImportPayload(file);
        if (!books) return false;
        const currentNames = new Set(state.getWorldNames ? state.getWorldNames() : state.world_names);
        const createdNames = [];
        const failedBooks = [];
        for (const [rawName, bookData] of Object.entries(books)) {
            const result = await importSingleBook(rawName, bookData, currentNames);
            if (result?.createdName) {
                createdNames.push(result.createdName);
            }
            if (result?.failedName) {
                failedBooks.push(result.failedName);
            }
        }
        return showFolderImportResult(createdNames, failedBooks);
    };

    const openFolderImportDialog = ()=>{
        if (!listPanelState.folderImportInput) {
            listPanelState.folderImportInput = document.createElement('input');
            listPanelState.folderImportInput.type = 'file';
            listPanelState.folderImportInput.accept = '.json,application/json';
            listPanelState.folderImportInput.hidden = true;
            listPanelState.folderImportInput.addEventListener('change', async()=>{
                const [file] = listPanelState.folderImportInput.files ?? [];
                listPanelState.folderImportInput.value = '';
                await importFolderFile(file);
            });
            document.body.append(listPanelState.folderImportInput);
        }
        listPanelState.folderImportInput.click();
    };

    
    const duplicateBook = async(name)=>{
        const getNames = ()=>state.getWorldNames ? state.getWorldNames() : state.world_names;
        const initialNames = [...(getNames() ?? [])];
        const initialNameSet = new Set(initialNames);
        const selected = await setSelectedBookInCoreUi(name);
        if (!selected) return null;

        
        
        const clicked = await clickCoreUiAction(coreUiActionSelectors.duplicateBook);
        if (!clicked) return null;

        const findNewName = ()=>{
            const currentNames = getNames() ?? [];
            const addedNames = currentNames.filter((entry)=>!initialNameSet.has(entry));
            
            return addedNames.length === 1 ? addedNames[0] : null;
        };

        
        const immediate = findNewName();
        if (immediate) return immediate;

        const timeoutMs = 8000;

        if (state.waitForWorldInfoUpdate) {
            
            
            const updated = await Promise.race([
                state.waitForWorldInfoUpdate().then(() => true),
                state.delay(timeoutMs).then(() => false),
            ]);
            return updated ? findNewName() : null;
        }

        
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            await state.delay(250);
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

        await clickCoreUiAction(coreUiActionSelectors.deleteBook);
    };

    const getSortedFolderNamesForMoveDialog = ()=>Array.from(new Set([
        ...folderDeps.getFolderRegistry(),
        ...listPanelState.getFolderDomNames(),
    ])).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));

    const createMoveBookDialogShell = (cleanName)=>{
        const modal = document.createElement('dialog');
        modal.classList.add('popup');
        modal.addEventListener('click', (evt)=>{
            if (evt.target === modal) {
                modal.close();
            }
        });
        modal.addEventListener('close', ()=>{
            modal.remove();
        });

        const popupBody = document.createElement('div');
        popupBody.classList.add('popup-body');

        const popupContent = document.createElement('div');
        popupContent.classList.add('popup-content', 'stwid--moveBookContent');

        const title = document.createElement('h3');
        title.textContent = `Move "${cleanName}" to folder`;
        popupContent.append(title);

        popupBody.append(popupContent);
        modal.append(popupBody);

        return { modal, popupContent };
    };

    const handleCreateFolderAndMoveBook = async({ name, modal })=>{
        const nextName = await state.Popup?.show.input('Create folder', 'Enter a new folder name:', 'New Folder');
        if (!nextName) return;
        const folderRegistrationResult = folderDeps.registerFolderName(nextName);
        if (!folderRegistrationResult.ok) {
            if (folderRegistrationResult.reason === 'empty') {
                toastr.warning('Folder name cannot be empty.');
            } else {
                toastr.error('Folder names cannot include "/".');
            }
            return;
        }
        if (abortIfUnsavedChanges('moving a book')) return;
        await applyBookFolderChange(name, folderRegistrationResult.folder, { centerAfterRefresh: true });
        modal.close();
    };

    const handleMoveBookToSelectedFolder = async({ selectedFolder, currentFolder, name, modal })=>{
        if (!selectedFolder) return;
        if (selectedFolder === currentFolder) {
            toastr.info('Book is already in that folder.');
            return;
        }
        if (abortIfUnsavedChanges('moving a book')) return;
        await applyBookFolderChange(name, selectedFolder, { centerAfterRefresh: true });
        modal.close();
    };

    const buildMoveBookSelectionRow = ({ folderNames, currentFolder, name, modal })=>{
        const row = document.createElement('div');
        row.classList.add('stwid--listDropdownItem', 'stwid--menuItem', 'stwid--moveBookRow');

        const select = document.createElement('select');
        select.classList.add('text_pole');
        select.disabled = folderNames.length === 0;
        if (folderNames.length === 0) {
            const emptyOption = document.createElement('option');
            emptyOption.textContent = '(no folders yet)';
            emptyOption.value = '';
            emptyOption.selected = true;
            select.append(emptyOption);
        } else {
            for (const folderName of folderNames) {
                const option = document.createElement('option');
                option.value = folderName;
                option.textContent = folderName;
                if (folderName === currentFolder) option.selected = true;
                select.append(option);
            }
        }
        row.append(select);

        const buttonRow = document.createElement('div');
        buttonRow.classList.add('stwid--moveBookQuickActions');

        const createFolderButton = document.createElement('button');
        createFolderButton.classList.add('menu_button', 'interactable');
        createFolderButton.title = 'New Folder';
        createFolderButton.setAttribute('aria-label', 'New Folder');
        const createFolderIcon = document.createElement('i');
        createFolderIcon.classList.add('fa-solid', 'fa-fw', 'fa-folder-plus');
        createFolderButton.append(createFolderIcon);
        createFolderButton.addEventListener('click', async(evt)=>{
            evt.preventDefault();
            evt.stopPropagation();
            await handleCreateFolderAndMoveBook({ name, modal });
        });
        buttonRow.append(createFolderButton);

        const noFolderButton = document.createElement('button');
        noFolderButton.classList.add('menu_button', 'interactable');
        noFolderButton.title = 'No Folder';
        noFolderButton.setAttribute('aria-label', 'No Folder');
        const noFolderIcon = document.createElement('i');
        noFolderIcon.classList.add('fa-solid', 'fa-fw', 'fa-folder-minus');
        noFolderButton.append(noFolderIcon);
        noFolderButton.addEventListener('click', async(evt)=>{
            evt.preventDefault();
            evt.stopPropagation();
            if (!currentFolder) {
                toastr.info('Book is already not in a folder.');
                return;
            }
            if (abortIfUnsavedChanges('moving a book')) return;
            await applyBookFolderChange(name, null, { centerAfterRefresh: true });
            modal.close();
        });
        buttonRow.append(noFolderButton);

        row.append(buttonRow);
        return { row, select };
    };

    const buildMoveBookPrimaryButtons = ({ folderNames, currentFolder, select, name, modal })=>{
        const buttonRow = document.createElement('div');
        buttonRow.classList.add('stwid--moveBookButtons', 'stwid--moveBookButtons--primary', 'popup-controls');

        const saveButton = document.createElement('button');
        saveButton.classList.add('menu_button', 'popup-button-ok');
        saveButton.textContent = 'Save';
        saveButton.disabled = folderNames.length === 0;
        saveButton.addEventListener('click', async(evt)=>{
            evt.preventDefault();
            evt.stopPropagation();
            const selectedFolder = select.disabled ? null : select.value;
            await handleMoveBookToSelectedFolder({ selectedFolder, currentFolder, name, modal });
        });
        buttonRow.append(saveButton);

        const cancelButton = document.createElement('button');
        cancelButton.classList.add('menu_button', 'popup-button-cancel');
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', (evt)=>{
            evt.preventDefault();
            evt.stopPropagation();
            modal.close();
        });
        buttonRow.append(cancelButton);

        return buttonRow;
    };

    const buildMoveBookMenuItem = (name, closeMenu)=>{
        if (typeof name !== 'string') return null;
        const { DOMPurify } = SillyTavern.libs;
        const cleanName = DOMPurify.sanitize(name);
        return createBookMenuActionItem({
            itemClass: 'stwid--moveToFolder',
            iconClass: 'fa-folder-tree',
            labelText: 'Move Book to Folder',
            onClick: async(evt)=>{
                evt.stopPropagation();
                closeMenu?.();

                const currentFolder = folderDeps.getFolderFromMetadata(state.cache[name]?.metadata);
                const folderNames = getSortedFolderNamesForMoveDialog();
                const { modal, popupContent } = createMoveBookDialogShell(cleanName);
                const { row, select } = buildMoveBookSelectionRow({ folderNames, currentFolder, name, modal });
                popupContent.append(row);
                popupContent.append(buildMoveBookPrimaryButtons({ folderNames, currentFolder, select, name, modal }));
                document.body.append(modal);
                modal.showModal();
            },
        });
    };

    const createBookMenuTriggerButton = ()=>{
        const menuTrigger = document.createElement('div');
        menuTrigger.classList.add('stwid--action', 'stwid--listDropdownTrigger', 'fa-solid', 'fa-fw', 'fa-ellipsis-vertical');
        menuTrigger.title = 'Book menu';
        menuTrigger.setAttribute('aria-label', 'Book menu');
        menuTrigger.setAttribute('aria-expanded', 'false');
        menuTrigger.setAttribute('aria-haspopup', 'true');
        menuTrigger.tabIndex = 0;
        menuTrigger.addEventListener('keydown', (evt)=>{
            if (evt.key === 'Enter' || evt.key === ' ') {
                evt.preventDefault();
                menuTrigger.click();
            }
        });
        return menuTrigger;
    };

    const createBookMenuOverlay = (menuTrigger)=>{
        menuTrigger.style.anchorName = '--stwid--ctxAnchor';
        const blocker = document.createElement('div');
        blocker.classList.add('stwid--blocker');
        for (const eventName of ['mousedown', 'pointerdown', 'touchstart']) {
            blocker.addEventListener(eventName, (evt)=>{
                evt.stopPropagation();
            });
        }
        const closeMenu = ()=>{
            blocker.remove();
            menuTrigger.style.anchorName = '';
            menuTrigger.setAttribute('aria-expanded', 'false');
            menuTrigger.focus();
        };
        blocker.addEventListener('click', (evt)=>{
            evt.stopPropagation();
            closeMenu();
        });
        const menu = document.createElement('div');
        menu.classList.add('stwid--listDropdownMenu', 'stwid--menu');
        menu.setAttribute('role', 'menu');
        menuTrigger.setAttribute('aria-expanded', 'true');
        return { blocker, menu, closeMenu };
    };

    const appendCoreBookMenuItems = (menu, name, closeMenu)=>{
        menu.append(createBookMenuActionItem({
            itemClass: 'stwid--rename',
            iconClass: 'fa-pencil',
            labelText: 'Rename Book',
            onClick: async()=>{
                closeMenu?.();
                const selected = await setSelectedBookInCoreUi(name);
                if (!selected) return;
                await clickCoreUiAction(coreUiActionSelectors.renameBook);
            },
        }));

        const moveBook = buildMoveBookMenuItem(name, closeMenu);
        if (moveBook) menu.append(moveBook);

        menu.append(createBookMenuActionItem({
            itemClass: 'stwid--fillTitles',
            iconClass: 'fa-wand-magic-sparkles',
            labelText: 'Fill Empty Titles',
            onClick: async()=>{
                if (abortIfUnsavedChanges('filling titles')) return;
                await state.fillEmptyTitlesWithKeywords(name);
                closeMenu?.();
            },
        }));

        const bookSort = document.createElement('div'); {
                            bookSort.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
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
                                const { sort, direction } = getBookSortChoice(name);
                                const globalLabel = state.getSortLabel(state.Settings.instance.sortLogic, state.Settings.instance.sortDirection) ?? 'Global default';
                                const globalOpt = document.createElement('option'); {
                                    globalOpt.value = 'null';
                                    globalOpt.textContent = `Use global (${globalLabel})`;
                                    globalOpt.selected = !hasCustomSort;
                                    sortSelect.append(globalOpt);
                                }
                                state.appendSortOptions(sortSelect, sort, direction);
                                sortSelect.addEventListener('change', async()=>{
                                    const value = sortSelect.value === 'null' ? null : JSON.parse(sortSelect.value);
                                    if (value) {
                                        await setBookSortPreference(name, value.sort, value.direction);
                                    } else {
                                        await setBookSortPreference(name, null, null);
                                    }
                                    closeMenu();
                                });
                            }
                            bookSort.append(sortSelect);
                            menu.append(bookSort);
                        }
        menu.append(createBookMenuActionItem({
            itemClass: 'stwid--entryManager',
            iconClass: 'fa-arrow-down-wide-short',
            labelText: 'Entry Manager',
            onClick: ()=>{
                state.openEntryManager(name);
                closeMenu?.();
            },
            enableKeyboard: false,
        }));

        menu.append(createBookMenuActionItem({
            itemClass: 'stwid--export',
            iconClass: 'fa-file-export',
            labelText: 'Export Book',
            onClick: async()=>{
                state.download(JSON.stringify({
                    entries: structuredClone(state.cache[name].entries),
                    metadata: structuredClone(state.cache[name].metadata ?? {}),
                }), name, 'application/json');
                closeMenu?.();
            },
        }));

        menu.append(createBookMenuActionItem({
            itemClass: 'stwid--duplicate',
            iconClass: 'fa-paste',
            labelText: 'Duplicate Book',
            onClick: async()=>{
                await duplicateBook(name);
                closeMenu?.();
            },
        }));

        menu.append(createBookMenuActionItem({
            itemClass: 'stwid--delete',
            iconClass: 'fa-trash-can',
            labelText: 'Delete Book',
            onClick: async()=>{
                await deleteBook(name);
                closeMenu?.();
            },
        }));
    };

    const { appendIntegrationMenuItems } = createExtensionIntegrationsSlice({
        extensionNames: state.extensionNames,
        getRequestHeaders: state.getRequestHeaders,
        executeSlashCommand: state.executeSlashCommand,
        setSelectedBookInCoreUi,
        clickCoreUiAction,
        createBookMenuActionItem,
    });

    const buildBookMenuTrigger = (name)=>{
        const menuTrigger = createBookMenuTriggerButton();
        menuTrigger.addEventListener('click', ()=>{
            const { blocker, menu, closeMenu } = createBookMenuOverlay(menuTrigger);
            appendCoreBookMenuItems(menu, name, closeMenu);
            appendIntegrationMenuItems(menu, name, closeMenu);
            blocker.append(menu);
            document.body.append(blocker);
        });
        return menuTrigger;
    };

    return {
        buildBookMenuTrigger,
        deleteBook,
        duplicateBookIntoFolder,
        openFolderImportDialog,
        openImportDialog,
    };
};

export { createBookMenuSlice };
