const FOLDER_METADATA_KEY = 'folder';
const FOLDER_REGISTRY_STORAGE_KEY = 'stwid--folder-registry';

const normalizeFolderName = (value)=>String(value ?? '').trim();

const validateFolderName = (value)=>{
    const normalized = normalizeFolderName(value);
    return {
        normalized,
        isValid: !normalized.includes('/'),
    };
};

const loadFolderRegistry = ()=>{
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(FOLDER_REGISTRY_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('[STWID] Failed to load folder registry', error);
        return [];
    }
};

const saveFolderRegistry = (folders)=>{
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(FOLDER_REGISTRY_STORAGE_KEY, JSON.stringify(folders));
    } catch (error) {
        console.warn('[STWID] Failed to save folder registry', error);
    }
};

const normalizeRegistry = (folders)=>{
    const normalized = [];
    const seen = new Set();
    for (const entry of folders) {
        const { normalized: folderName, isValid } = validateFolderName(entry);
        if (!isValid || !folderName) continue;
        if (seen.has(folderName)) continue;
        seen.add(folderName);
        normalized.push(folderName);
    }
    return normalized;
};

const getFolderRegistry = ()=>{
    const normalized = normalizeRegistry(loadFolderRegistry());
    saveFolderRegistry(normalized);
    return normalized;
};

const registerFolderName = (folderName)=>{
    const { normalized, isValid } = validateFolderName(folderName);
    if (!normalized) {
        return { ok: false, folder: null, reason: 'empty' };
    }
    if (!isValid) {
        return { ok: false, folder: null, reason: 'invalid' };
    }
    const registry = getFolderRegistry();
    if (!registry.includes(normalized)) {
        registry.push(normalized);
        registry.sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
        saveFolderRegistry(registry);
    }
    return { ok: true, folder: normalized };
};

const getFolderFromMetadata = (metadata)=>{
    if (!metadata || typeof metadata !== 'object') return null;
    if (!Object.hasOwn(metadata, FOLDER_METADATA_KEY)) return null;
    const { normalized, isValid } = validateFolderName(metadata[FOLDER_METADATA_KEY]);
    if (!isValid || !normalized) return null;
    return normalized;
};

const setFolderInMetadata = (metadata, folderName)=>{
    if (!metadata || typeof metadata !== 'object') {
        return { ok: false, folder: null };
    }
    const { normalized, isValid } = validateFolderName(folderName);
    if (!isValid) {
        return { ok: false, folder: null };
    }
    if (!normalized) {
        delete metadata[FOLDER_METADATA_KEY];
        return { ok: true, folder: null };
    }
    metadata[FOLDER_METADATA_KEY] = normalized;
    return { ok: true, folder: normalized };
};

const sanitizeFolderMetadata = (metadata)=>{
    if (!metadata || typeof metadata !== 'object') return null;
    if (!Object.hasOwn(metadata, FOLDER_METADATA_KEY)) return null;
    const { normalized, isValid } = validateFolderName(metadata[FOLDER_METADATA_KEY]);
    if (!isValid || !normalized) {
        delete metadata[FOLDER_METADATA_KEY];
        return null;
    }
    metadata[FOLDER_METADATA_KEY] = normalized;
    return normalized;
};

const getFolderBookNames = (cache, folderName)=>{
    if (!cache || !folderName) return [];
    return Object.keys(cache).filter((name)=>getFolderFromMetadata(cache[name]?.metadata) === folderName);
};

const getVisibleFolderBookNames = (cache, folderName)=>getFolderBookNames(cache, folderName).filter((name)=>{
    const bookRoot = cache?.[name]?.dom?.root;
    if (!bookRoot) return false;
    const isFilteredOut = bookRoot.classList.contains('stwid--filter-query')
        || bookRoot.classList.contains('stwid--filter-active');
    return !isFilteredOut;
});

const summarizeBookNames = (bookNames, { max = 3 } = {})=>{
    const names = Array.isArray(bookNames) ? bookNames : [];
    if (!names.length) return '';
    if (names.length <= max) return names.join(', ');
    const preview = names.slice(0, max).join(', ');
    return `${preview}, +${names.length - max} more`;
};

const getFolderActiveState = (cache, selected, folderName, bookNamesOverride = null)=>{
    const bookNames = Array.isArray(bookNamesOverride) ? bookNamesOverride : getFolderBookNames(cache, folderName);
    if (!bookNames.length) {
        return { checked: false, indeterminate: false };
    }
    const selectedSet = new Set(selected ?? []);
    const activeCount = bookNames.filter((name)=>selectedSet.has(name)).length;
    return {
        checked: activeCount === bookNames.length,
        indeterminate: activeCount > 0 && activeCount < bookNames.length,
    };
};

const setFolderBooksActive = async(bookNames, isActive, onWorldInfoChange)=>{
    const select = /**@type {HTMLSelectElement}*/(document.querySelector('#world_info'));
    if (!select) return;
    const targets = new Set(bookNames ?? []);
    for (const option of select.options) {
        if (!targets.has(option.textContent ?? '')) continue;
        option.selected = isActive;
    }
    onWorldInfoChange?.('__notSlashCommand__');
};

const createBookInFolder = async({
    folderName,
    Popup,
    createNewWorldInfo,
    getFreeWorldName,
    loadWorldInfo,
    saveWorldInfo,
    refreshList,
})=>{
    if (!Popup || !createNewWorldInfo || !loadWorldInfo || !saveWorldInfo) return null;
    const tempName = getFreeWorldName?.() ?? 'New World Info';
    const finalName = await Popup.show.input('Create a new World Info', 'Enter a name for the new file:', tempName);
    if (!finalName) return null;
    const created = await createNewWorldInfo(finalName, { interactive: true });
    if (!created) return null;
    const data = await loadWorldInfo(finalName);
    const metadata = data.metadata ?? {};
    const updated = setFolderInMetadata(metadata, folderName);
    if (!updated.ok) return null;
    data.metadata = metadata;
    await saveWorldInfo(finalName, data, true);
    registerFolderName(folderName);
    await refreshList?.();
    return finalName;
};

const removeFolderName = (folderName)=>{
    const normalized = normalizeFolderName(folderName);
    if (!normalized) return false;
    const registry = getFolderRegistry();
    const nextRegistry = registry.filter((entry)=>entry !== normalized);
    if (nextRegistry.length === registry.length) return false;
    saveFolderRegistry(nextRegistry);
    return true;
};

const updateFolderCount = (countElement, count)=>{
    if (!countElement) return;
    countElement.textContent = `(${count})`;
};

const setFolderCollapsed = (folderDom, isCollapsed)=>{
    if (!folderDom) return;
    folderDom.books.classList.toggle('stwid--isCollapsed', Boolean(isCollapsed));
    if (isCollapsed) {
        folderDom.toggle.classList.remove('fa-chevron-up');
        folderDom.toggle.classList.add('fa-chevron-down');
    } else {
        folderDom.toggle.classList.add('fa-chevron-up');
        folderDom.toggle.classList.remove('fa-chevron-down');
    }
};

const hasFolderImportPayload = (payload)=>{
    const books = payload?.books;
    return Boolean(books && typeof books === 'object' && !Array.isArray(books));
};

const getFolderImportBookNames = (payload)=>{
    if (!hasFolderImportPayload(payload)) return [];
    return Object.keys(payload.books);
};

const createFolderDom = ({ folderName, onToggle, onDrop, onDragStateChange, menuActions })=>{
    const root = document.createElement('div'); {
        root.classList.add('stwid--folder');
        root.dataset.folder = folderName;
        const header = document.createElement('div'); {
            header.classList.add('stwid--folderHeader');
            header.title = 'Collapse/expand this folder';
            if (menuActions) {
                header.classList.add('stwid--hasMenu');
            }
            header.addEventListener('click', (evt)=>{
                evt.preventDefault();
                onToggle?.();
            });
            header.addEventListener('dragover', (evt)=>{
                if (!onDrop) return;
                const allowDrop = onDragStateChange?.(true, evt) ?? true;
                if (!allowDrop) return;
                evt.preventDefault();
                root.classList.add('stwid--isTarget');
            });
            header.addEventListener('dragleave', (evt)=>{
                if (!onDrop) return;
                root.classList.remove('stwid--isTarget');
                onDragStateChange?.(false, evt);
            });
            header.addEventListener('drop', async(evt)=>{
                if (!onDrop) return;
                evt.preventDefault();
                root.classList.remove('stwid--isTarget');
                await onDrop(evt);
            });
            const icon = document.createElement('i'); {
                icon.classList.add('stwid--folderIcon');
                icon.classList.add('fa-solid', 'fa-fw', 'fa-folder');
                header.append(icon);
            }
            const label = document.createElement('span'); {
                label.classList.add('stwid--folderLabel');
                label.textContent = folderName;
                header.append(label);
            }
            const count = document.createElement('span'); {
                count.classList.add('stwid--folderCount');
                header.append(count);
            }
            const activeToggle = document.createElement('input'); {
                activeToggle.classList.add('stwid--folderActiveToggle');
                activeToggle.type = 'checkbox';
                activeToggle.title = 'Toggle global active status for visible books in this folder';
                activeToggle.setAttribute('aria-label', 'Toggle global active status for visible books in this folder');
                activeToggle.addEventListener('click', (evt)=>{
                    evt.stopPropagation();
                });
                activeToggle.addEventListener('change', async()=>{
                    if (!menuActions?.setBooksActive) return;
                    const bookNames = getVisibleFolderBookNames(menuActions.cache, folderName);
                    if (!bookNames.length) {
                        activeToggle.checked = false;
                        activeToggle.indeterminate = false;
                        return;
                    }
                    activeToggle.disabled = true;
                    try {
                        await menuActions.setBooksActive(bookNames, activeToggle.checked);
                    } finally {
                        activeToggle.disabled = false;
                    }
                });
                header.append(activeToggle);
            }
            const addButton = document.createElement('div'); {
                addButton.classList.add('stwid--folderAction');
                addButton.classList.add('stwid--folderAdd');
                addButton.classList.add('fa-solid', 'fa-fw', 'fa-plus');
                addButton.title = 'New Book in Folder';
                addButton.setAttribute('aria-label', 'New Book in Folder');
                addButton.addEventListener('click', async(evt)=>{
                    evt.preventDefault();
                    evt.stopPropagation();
                    if (!menuActions?.createBookInFolder) return;
                    addButton.setAttribute('aria-busy', 'true');
                    try {
                        await menuActions.createBookInFolder(folderName);
                    } finally {
                        addButton.removeAttribute('aria-busy');
                    }
                });
                header.append(addButton);
            }
            if (menuActions) {
                const menuTrigger = document.createElement('div'); {
                    menuTrigger.classList.add('stwid--folderMenu');
                    menuTrigger.classList.add('stwid--menuTrigger');
                    menuTrigger.classList.add('fa-solid', 'fa-fw', 'fa-ellipsis-vertical');
                    menuTrigger.title = 'Folder menu';
                    menuTrigger.setAttribute('aria-label', 'Folder menu');
                    menuTrigger.addEventListener('click', (evt)=>{
                        evt.preventDefault();
                        evt.stopPropagation();
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
                                const rename = document.createElement('div'); {
                                    rename.classList.add('stwid--item');
                                    rename.classList.add('stwid--rename');
                                    rename.addEventListener('click', async()=>{
                                        blocker.remove();
                                        menuTrigger.style.anchorName = '';
                                        const Popup = menuActions.Popup;
                                        if (!Popup) return;
                                        const nextName = await Popup.show.input('Rename folder', 'Enter a new folder name:', folderName);
                                        if (!nextName) return;
                                        const { normalized, isValid } = validateFolderName(nextName);
                                        if (!normalized) {
                                            toastr.warning('Folder name cannot be empty.');
                                            return;
                                        }
                                        if (!isValid) {
                                            toastr.error('Folder names cannot include "/".');
                                            return;
                                        }
                                        if (normalized === folderName) return;
                                        const targetFolderExisted = getFolderRegistry().includes(normalized);
                                        registerFolderName(normalized);
                                        const bookNames = getFolderBookNames(menuActions.cache, folderName);
                                        const failedBookNames = [];
                                        for (const bookName of bookNames) {
                                            try {
                                                const updated = await menuActions.setBookFolder(bookName, normalized);
                                                if (!updated) {
                                                    failedBookNames.push(bookName);
                                                }
                                            } catch (error) {
                                                console.warn(`[STWID] Failed to move "${bookName}" while renaming folder "${folderName}"`, error);
                                                failedBookNames.push(bookName);
                                            }
                                        }
                                        if (!failedBookNames.length) {
                                            removeFolderName(folderName);
                                        } else {
                                            const movedCount = Math.max(bookNames.length - failedBookNames.length, 0);
                                            if (movedCount === 0 && !targetFolderExisted) {
                                                removeFolderName(normalized);
                                            }
                                            toastr.warning(
                                                `Folder rename partially completed (${movedCount}/${bookNames.length} books moved). Failed: ${summarizeBookNames(failedBookNames)}.`
                                            );
                                        }
                                        await menuActions.refreshList?.();
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-pencil');
                                        rename.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Rename Folder';
                                        rename.append(txt);
                                    }
                                    menu.append(rename);
                                }
                                const imp = document.createElement('div'); {
                                    imp.classList.add('stwid--item');
                                    imp.classList.add('stwid--import');
                                    imp.addEventListener('click', async()=>{
                                        blocker.remove();
                                        menuTrigger.style.anchorName = '';
                                        if (!menuActions.openImportDialog || !menuActions.getWorldNames) return;

                                        // Prevent overlapping imports from racing and mis-assigning books.
                                        if (menuActions.isFolderImporting?.()) return;
                                        menuActions.setFolderImporting?.(true);

                                        try {
                                            // F4: Avoid mis-assigning books when other actions create/duplicate
                                            // books during the import window.
                                            //
                                            // Prefer an import-specific identifier: the JSON file's declared
                                            // book names. This lets us only assign imported books to the folder.
                                            const beforeNames = new Set(menuActions.getWorldNames());
                                            const importPayload = await menuActions.openImportDialog();
                                            if (!importPayload) return;
                                            const expectedBookNames = getFolderImportBookNames(importPayload);
                                            if (!expectedBookNames.length) {
                                                toastr.warning('This import format cannot be attributed safely. New books will not be auto-moved into the folder.');
                                                return;
                                            }

                                            const updatePromise = menuActions.waitForWorldInfoUpdate?.();
                                            const hasUpdate = await Promise.race([
                                                updatePromise ? updatePromise.then(()=>true) : Promise.resolve(false),
                                                new Promise((resolve)=>setTimeout(()=>resolve(false), 15000)),
                                            ]);
                                            if (!hasUpdate) {
                                                toastr.warning('Import did not complete in time. No books were moved into the folder.');
                                                return;
                                            }

                                            // Allow the list of world names to settle (some imports can trigger
                                            // multiple update cycles).
                                            const deadline = Date.now() + 4000;
                                            let lastSnapshot = menuActions.getWorldNames().slice().sort();
                                            while (Date.now() < deadline) {
                                                await new Promise((resolve)=>setTimeout(resolve, 250));
                                                const nextSnapshot = menuActions.getWorldNames().slice().sort();
                                                const unchanged = nextSnapshot.length === lastSnapshot.length
                                                    && nextSnapshot.every((v, i)=>v === lastSnapshot[i]);
                                                if (unchanged) break;
                                                lastSnapshot = nextSnapshot;
                                            }

                                            await menuActions.refreshList?.();
                                            const afterNames = menuActions.getWorldNames();
                                            const newNames = afterNames.filter((name)=>!beforeNames.has(name));

                                            // If we could read the folder import file, only assign books that we
                                            // can strongly attribute to this import.
                                            //
                                            // importFolderFile() can rename books if the raw name already exists,
                                            // so we match by prefix.
                                            const importPrefixes = expectedBookNames.map((name)=>`${name} (imported`);
                                            const attributedNames = expectedBookNames.length
                                                ? newNames.filter((name)=>expectedBookNames.includes(name)
                                                    || importPrefixes.some((prefix)=>name.startsWith(prefix)))
                                                : [];

                                            // If there's a mismatch between expected names and what appeared,
                                            // be conservative: don't move anything automatically.
                                            if (expectedBookNames.length && attributedNames.length !== newNames.length) {
                                                toastr.warning('Import finished, but new books could not be confidently identified. No books were moved into the folder.');
                                                return;
                                            }

                                            for (const name of attributedNames) {
                                                await menuActions.setBookFolder(name, folderName);
                                            }
                                            if (attributedNames.length) {
                                                await menuActions.refreshList?.();
                                            }
                                        } finally {
                                            menuActions.setFolderImporting?.(false);
                                        }
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-file-import');
                                        imp.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Import Into Folder';
                                        imp.append(txt);
                                    }
                                    menu.append(imp);
                                }
                                const exp = document.createElement('div'); {
                                    exp.classList.add('stwid--item');
                                    exp.classList.add('stwid--export');
                                    exp.addEventListener('click', async()=>{
                                        blocker.remove();
                                        menuTrigger.style.anchorName = '';
                                        if (!menuActions.download || !menuActions.buildSavePayload) return;
                                        const bookNames = getFolderBookNames(menuActions.cache, folderName);
                                        const payload = { books: {} };
                                        for (const bookName of bookNames) {
                                            payload.books[bookName] = menuActions.buildSavePayload(bookName);
                                        }
                                        menuActions.download(JSON.stringify(payload), folderName, 'application/json');
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-file-export');
                                        exp.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Export Folder';
                                        exp.append(txt);
                                    }
                                    menu.append(exp);
                                }
                                const orderHelper = document.createElement('div'); {
                                    orderHelper.classList.add('stwid--item');
                                    orderHelper.classList.add('stwid--orderHelper');
                                    orderHelper.addEventListener('click', ()=>{
                                        blocker.remove();
                                        menuTrigger.style.anchorName = '';
                                        const activeNames = menuActions.getSelectedWorldInfo?.() ?? [];
                                        const bookNames = getFolderBookNames(menuActions.cache, folderName)
                                            .filter((name)=>activeNames.includes(name));
                                        menuActions.openOrderHelper?.(null, bookNames);
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-arrow-down-wide-short');
                                        orderHelper.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Order Helper (Folder)';
                                        orderHelper.append(txt);
                                    }
                                    menu.append(orderHelper);
                                }
                                const del = document.createElement('div'); {
                                    del.classList.add('stwid--item');
                                    del.classList.add('stwid--delete');
                                    del.addEventListener('click', async()=>{
                                        blocker.remove();
                                        menuTrigger.style.anchorName = '';
                                        const Popup = menuActions.Popup;
                                        if (!Popup) return;
                                        const shouldDeleteBooks = await Popup.show.confirm(
                                            `Delete folder: ${folderName}?`,
                                            'Choose what to do with the books in this folder.',
                                            'Delete books',
                                            'Move books out'
                                        );
                                        const bookNames = getFolderBookNames(menuActions.cache, folderName);
                                        const failedBookNames = [];
                                        if (shouldDeleteBooks) {
                                            for (const bookName of bookNames) {
                                                try {
                                                    await menuActions.deleteBook?.(bookName, { skipConfirm: true });
                                                } catch (error) {
                                                    console.warn(`[STWID] Failed to delete "${bookName}" while deleting folder "${folderName}"`, error);
                                                    failedBookNames.push(bookName);
                                                }
                                            }
                                        } else {
                                            for (const bookName of bookNames) {
                                                try {
                                                    const updated = await menuActions.setBookFolder(bookName, null);
                                                    if (!updated) {
                                                        failedBookNames.push(bookName);
                                                    }
                                                } catch (error) {
                                                    console.warn(`[STWID] Failed to move "${bookName}" out of folder "${folderName}"`, error);
                                                    failedBookNames.push(bookName);
                                                }
                                            }
                                        }
                                        if (!failedBookNames.length) {
                                            removeFolderName(folderName);
                                        } else {
                                            const completedCount = Math.max(bookNames.length - failedBookNames.length, 0);
                                            const action = shouldDeleteBooks ? 'deleted' : 'moved out';
                                            toastr.warning(
                                                `Folder delete partially completed (${completedCount}/${bookNames.length} books ${action}). Failed: ${summarizeBookNames(failedBookNames)}. Folder was kept.`
                                            );
                                        }
                                        await menuActions.refreshList?.();
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-trash-can');
                                        del.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Delete Folder';
                                        del.append(txt);
                                    }
                                    menu.append(del);
                                }
                                blocker.append(menu);
                            }
                            document.body.append(blocker);
                        }
                    });
                    header.append(menuTrigger);
                }
            }
            const toggle = document.createElement('i'); {
                toggle.classList.add('stwid--folderToggle');
                toggle.classList.add('fa-solid', 'fa-fw', 'fa-chevron-down');
                toggle.title = 'Collapse/expand this folder';
                toggle.setAttribute('aria-label', 'Collapse or expand this folder');
                header.append(toggle);
            }
            root.append(header);
        }
        const books = document.createElement('div'); {
            books.classList.add('stwid--folderBooks');
            root.append(books);
        }
    }
    const books = root.querySelector('.stwid--folderBooks');
    const count = root.querySelector('.stwid--folderCount');
    const toggle = root.querySelector('.stwid--folderToggle');
    const activeToggle = root.querySelector('.stwid--folderActiveToggle');
    const observer = new MutationObserver(()=>{
        updateFolderCount(count, books.childElementCount);
    });
    observer.observe(books, { childList: true });
    updateFolderCount(count, books.childElementCount);
    const updateActiveToggle = ()=>{
        if (!activeToggle || !menuActions?.cache || !menuActions?.getSelectedWorldInfo) return;
        const visibleBookNames = getVisibleFolderBookNames(menuActions.cache, folderName);
        const state = getFolderActiveState(
            menuActions.cache,
            menuActions.getSelectedWorldInfo(),
            folderName,
            visibleBookNames
        );
        const hasVisibleBooks = visibleBookNames.length > 0;
        activeToggle.checked = state.checked;
        activeToggle.indeterminate = state.indeterminate;
        activeToggle.disabled = !hasVisibleBooks;
        activeToggle.dataset.state = !hasVisibleBooks
            ? 'empty'
            : state.indeterminate
                ? 'partial'
                : state.checked
                    ? 'on'
                    : 'off';
        activeToggle.setAttribute('aria-checked', state.indeterminate ? 'mixed' : String(state.checked));
    };
    updateActiveToggle();
    return {
        root,
        header: root.querySelector('.stwid--folderHeader'),
        books,
        count,
        toggle,
        activeToggle,
        observer,
        updateActiveToggle,
    };
};

export {
    createFolderDom,
    getFolderFromMetadata,
    getFolderRegistry,
    registerFolderName,
    createBookInFolder,
    setFolderBooksActive,
    setFolderCollapsed,
    setFolderInMetadata,
    sanitizeFolderMetadata,
    updateFolderCount,
};
