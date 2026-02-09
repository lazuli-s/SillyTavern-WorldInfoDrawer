
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
        const input = /**@type {HTMLInputElement}*/(document.querySelector(coreUiSelectors.importFileInput));
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
        // Manual verification note:
        // - Valid folder JSON imports expected books
        // - Invalid JSON shows an error toast
        // - Name collision suffixing remains stable
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
            folderDeps.sanitizeFolderMetadata(nextPayload.metadata);
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

    // Book duplicate/delete actions delegated to core WI behavior.
    const duplicateBook = async(name)=>{
        const getNames = ()=>state.getWorldNames ? state.getWorldNames() : state.world_names;
        const initialNames = [...(getNames() ?? [])];
        const initialNameSet = new Set(initialNames);
        const selected = await setSelectedBookInCoreUi(name);
        if (!selected) return null;

        // Click the duplicate action once it exists.
        // Keep selector list flexible to tolerate minor ST UI changes.
        const clicked = await clickCoreUiAction(coreUiActionSelectors.duplicateBook);
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
        // Manual verification note:
        // - Duplicate to root and folder
        // - Duplicate while target folder is collapsed
        // - Confirm list refresh reflects the new book location
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
        const item = document.createElement('div'); {
            item.classList.add('stwid--listDropdownItem');
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
                title.textContent = `Move "${name}" to folder`;
                popupContent.append(title);

                const row = document.createElement('div');
                row.classList.add('stwid--listDropdownItem');
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

                    // Requirement: immediately add the book to the new folder.
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
        const menuTrigger = document.createElement('div'); {
            menuTrigger.classList.add('stwid--action');
            menuTrigger.classList.add('stwid--listDropdownTrigger');
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
                        menu.classList.add('stwid--listDropdownMenu');
                        const closeMenu = ()=>{
                            blocker.remove();
                            menuTrigger.style.anchorName = '';
                        };
                        const rename = document.createElement('div'); {
                            rename.classList.add('stwid--listDropdownItem');
                            rename.classList.add('stwid--rename');
                            rename.addEventListener('click', async()=>{
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
                        menu.append(buildMoveBookMenuItem(name, closeMenu));
                        if (state.extensionNames.includes('third-party/SillyTavern-WorldInfoBulkEdit')) {
                            const bulk = document.createElement('div'); {
                                bulk.classList.add('stwid--listDropdownItem');
                                bulk.classList.add('stwid--bulkEdit');
                                bulk.addEventListener('click', async()=>{
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
                                editor.classList.add('stwid--listDropdownItem');
                                editor.classList.add('stwid--externalEditor');
                                editor.addEventListener('click', async()=>{
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
                            fillTitles.classList.add('stwid--listDropdownItem');
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
                            bookSort.classList.add('stwid--listDropdownItem');
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
                                    blocker.remove();
                                    menuTrigger.style.anchorName = '';
                                });
                            }
                            bookSort.append(sortSelect);
                            menu.append(bookSort);
                        }
                        const orderHelper = document.createElement('div'); {
                            orderHelper.classList.add('stwid--listDropdownItem');
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
                            stloButton.classList.add('stwid--listDropdownItem');
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
                            exp.classList.add('stwid--listDropdownItem');
                            exp.classList.add('stwid--export');
                            exp.addEventListener('click', async()=>{
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
                            dup.classList.add('stwid--listDropdownItem');
                            dup.classList.add('stwid--duplicate');
                            dup.addEventListener('click', async()=>{
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
                            del.classList.add('stwid--listDropdownItem');
                            del.classList.add('stwid--delete');
                            del.addEventListener('click', async()=>{
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
