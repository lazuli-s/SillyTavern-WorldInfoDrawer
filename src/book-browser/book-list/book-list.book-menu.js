
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
        const failedBooks = [];
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
            let bookCreated = false;
            try {
                const created = await state.createNewWorldInfo(name, { interactive: false });
                if (!created) continue;
                const nextPayload = {
                    entries: structuredClone(entries),
                    metadata: structuredClone(metadata),
                };
                folderDeps.sanitizeFolderMetadata(nextPayload.metadata);
                await state.saveWorldInfo(name, nextPayload, true);
                bookCreated = true;
                currentNames.add(name);
                createdNames.push(name);
            } catch (error) {
                console.warn('[STWID] Failed to import book:', name, error);
                failedBooks.push(rawName);
                if (bookCreated) {
                    try {
                        await state.deleteWorldInfo?.(name);
                    } catch (rollbackError) {
                        console.warn('[STWID] Rollback failed for book:', name, rollbackError);
                        toastr.warning(`Import cleanup failed for "${name}". Delete this book manually if it appears in the lorebook list.`);
                    }
                }
            }
        }
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

    const buildMoveBookMenuItem = (name, closeMenu)=>{
        if (typeof name !== 'string') return null;
        const { DOMPurify } = SillyTavern.libs;
        const cleanName = DOMPurify.sanitize(name);
        const item = document.createElement('div'); {
            item.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
            item.classList.add('stwid--moveToFolder');
            item.addEventListener('click', async(evt)=>{
                evt.stopPropagation();
                closeMenu?.();

                const currentFolder = folderDeps.getFolderFromMetadata(state.cache[name]?.metadata);
                const registry = folderDeps.getFolderRegistry();
                const folderNames = Array.from(new Set([
                    ...registry,
                    ...listPanelState.getFolderDomNames(),
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
                title.textContent = `Move "${cleanName}" to folder`;
                popupContent.append(title);

                const row = document.createElement('div');
                row.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
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
                    const reg = folderDeps.registerFolderName(nextName);
                    if (!reg.ok) {
                        if (reg.reason === 'empty') {
                            toastr.warning('Folder name cannot be empty.');
                        } else {
                            toastr.error('Folder names cannot include "/".');
                        }
                        return;
                    }

                    
                    if (state.isDirtyCheck?.()) {
                        toastr.warning('Unsaved edits detected. Save or discard changes before moving a book.');
                        return;
                    }
                    
                    await applyBookFolderChange(name, reg.folder, { centerAfterRefresh: true });
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
                    
                    if (state.isDirtyCheck?.()) {
                        toastr.warning('Unsaved edits detected. Save or discard changes before moving a book.');
                        return;
                    }
                    await applyBookFolderChange(name, null, { centerAfterRefresh: true });
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
                        toastr.info('Book is already in that folder.');
                        return;
                    }

                    
                    if (state.isDirtyCheck?.()) {
                        toastr.warning('Unsaved edits detected. Save or discard changes before moving a book.');
                        return;
                    }
                    await applyBookFolderChange(name, selectedFolder, { centerAfterRefresh: true });
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

    const buildBookMenuTrigger = (name)=>{
        const addMenuItemKeyboardSupport = (item)=>{
            item.tabIndex = 0;
            item.addEventListener('keydown', (evt)=>{
                if (evt.key === 'Enter' || evt.key === ' ') {
                    evt.preventDefault();
                    item.click();
                }
            });
        };
        const menuTrigger = document.createElement('div'); {
            menuTrigger.classList.add('stwid--action');
            menuTrigger.classList.add('stwid--listDropdownTrigger');
            menuTrigger.classList.add('fa-solid', 'fa-fw', 'fa-ellipsis-vertical');
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
                        menuTrigger.setAttribute('aria-expanded', 'false');
                    });
                    const menu = document.createElement('div'); {
                        menu.classList.add('stwid--listDropdownMenu', 'stwid--menu');
                        menu.setAttribute('role', 'menu');
                        const closeMenu = ()=>{
                            blocker.remove();
                            menuTrigger.style.anchorName = '';
                            menuTrigger.setAttribute('aria-expanded', 'false');
                            menuTrigger.focus();
                        };
                        menuTrigger.setAttribute('aria-expanded', 'true');
                        const rename = document.createElement('div'); {
                            rename.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                            rename.classList.add('stwid--rename');
                            rename.addEventListener('click', async()=>{
                                closeMenu?.();
                                const selected = await setSelectedBookInCoreUi(name);
                                if (!selected) return;
                                await clickCoreUiAction(coreUiActionSelectors.renameBook);
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
                        const moveBook = buildMoveBookMenuItem(name, closeMenu);
                        if (moveBook) menu.append(moveBook);
                        if (state.extensionNames.includes('third-party/SillyTavern-WorldInfoBulkEdit')) {
                            const bulk = document.createElement('div'); {
                                bulk.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                                bulk.classList.add('stwid--bulkEdit');
                                addMenuItemKeyboardSupport(bulk);
                                bulk.addEventListener('click', async()=>{
                                    const selected = await setSelectedBookInCoreUi(name);
                                    if (!selected) return;
                                    await clickCoreUiAction([
                                        '.stwibe--trigger',
                                    ]);
                                    closeMenu?.();
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
                                editor.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                                editor.classList.add('stwid--externalEditor');
                                addMenuItemKeyboardSupport(editor);
                                editor.addEventListener('click', async()=>{
                                    try {
                                        const response = await fetch('/api/plugins/wiee/editor', {
                                            method: 'POST',
                                            headers: state.getRequestHeaders(),
                                            body: JSON.stringify({
                                                book: name,
                                                command: 'code',
                                                commandArguments: ['.'],
                                            }),
                                        });
                                        if (!response.ok) {
                                            toastr.error(`External Editor request failed (${response.status}).`);
                                        }
                                    } catch (error) {
                                        console.warn('[STWID] External Editor request failed.', error);
                                        toastr.error('External Editor request failed. Check the browser console for details.');
                                    }
                                    closeMenu?.();
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
                            fillTitles.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                            fillTitles.classList.add('stwid--fillTitles');
                            addMenuItemKeyboardSupport(fillTitles);
                            fillTitles.addEventListener('click', async()=>{
                                if (state.isDirtyCheck?.()) {
                                    toastr.warning('Unsaved edits detected. Save or discard changes before filling titles.');
                                    return;
                                }
                                await state.fillEmptyTitlesWithKeywords(name);
                                closeMenu?.();
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
                        const orderHelper = document.createElement('div'); {
                            orderHelper.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                            orderHelper.classList.add('stwid--orderHelper');
                            orderHelper.addEventListener('click', ()=>{
                                state.openOrderHelper(name);
                                closeMenu?.();
                            });
                            const i = document.createElement('i'); {
                                i.classList.add('stwid--icon');
                                i.classList.add('fa-solid', 'fa-fw', 'fa-arrow-down-wide-short');
                                orderHelper.append(i);
                            }
                            const txt = document.createElement('span'); {
                                txt.classList.add('stwid--label');
                                txt.textContent = 'Entry Manager';
                                orderHelper.append(txt);
                            }
                            menu.append(orderHelper);
                        }
                        const stloButton = document.createElement('div'); {
                            stloButton.id = 'lorebook_ordering_button';
                            stloButton.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                            stloButton.classList.add('stwid--stlo');
                            stloButton.dataset.i18n = '[title]stlo.button.configure; [aria-label]stlo.button.configure';
                            stloButton.title = 'Configure STLO Priority & Budget';
                            stloButton.setAttribute('aria-label', 'Configure STLO Priority & Budget');
                            stloButton.tabIndex = 0;
                            stloButton.setAttribute('role', 'button');
                            stloButton.addEventListener('click', async(evt)=>{
                                evt.stopPropagation();
                                const escapedName = name.replaceAll('"', '\\"');
                                const didExecute = await state.executeSlashCommand(`/stlo "${escapedName}"`);
                                if (!didExecute) {
                                    toastr.error('STLO command failed. Check the browser console for details.');
                                    return;
                                }
                                closeMenu();
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
                            exp.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                            exp.classList.add('stwid--export');
                            addMenuItemKeyboardSupport(exp);
                            exp.addEventListener('click', async()=>{
                                state.download(JSON.stringify({
                                    entries: structuredClone(state.cache[name].entries),
                                    metadata: structuredClone(state.cache[name].metadata ?? {}),
                                }), name, 'application/json');
                                closeMenu?.();
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
                            dup.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                            dup.classList.add('stwid--duplicate');
                            addMenuItemKeyboardSupport(dup);
                            dup.addEventListener('click', async()=>{
                                await duplicateBook(name);
                                closeMenu?.();
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
                            del.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                            del.classList.add('stwid--delete');
                            addMenuItemKeyboardSupport(del);
                            del.addEventListener('click', async()=>{
                                await deleteBook(name);
                                closeMenu?.();
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
        }
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
