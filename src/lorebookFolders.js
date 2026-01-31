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

const createFolderDom = ({ folderName, onToggle, onDrop, onDragStateChange, menuActions })=>{
    const root = document.createElement('div'); {
        root.classList.add('stwid--folder');
        root.dataset.folder = folderName;
        const header = document.createElement('div'); {
            header.classList.add('stwid--folderHeader');
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
            if (menuActions) {
                const menuTrigger = document.createElement('div'); {
                    menuTrigger.classList.add('stwid--folderMenu');
                    menuTrigger.classList.add('stwid--menuTrigger');
                    menuTrigger.classList.add('fa-solid', 'fa-fw', 'fa-ellipsis-vertical');
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
                                        registerFolderName(normalized);
                                        const bookNames = getFolderBookNames(menuActions.cache, folderName);
                                        for (const bookName of bookNames) {
                                            await menuActions.setBookFolder(bookName, normalized);
                                        }
                                        removeFolderName(folderName);
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
                                        const beforeNames = new Set(menuActions.getWorldNames());
                                        menuActions.openImportDialog();
                                        const updatePromise = menuActions.waitForWorldInfoUpdate?.();
                                        const hasUpdate = await Promise.race([
                                            updatePromise ? updatePromise.then(()=>true) : Promise.resolve(false),
                                            new Promise((resolve)=>setTimeout(()=>resolve(false), 15000)),
                                        ]);
                                        if (!hasUpdate) return;
                                        await menuActions.refreshList?.();
                                        const afterNames = menuActions.getWorldNames();
                                        const newNames = afterNames.filter((name)=>!beforeNames.has(name));
                                        for (const name of newNames) {
                                            await menuActions.setBookFolder(name, folderName);
                                        }
                                        if (newNames.length) {
                                            await menuActions.refreshList?.();
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
                                        if (shouldDeleteBooks) {
                                            for (const bookName of bookNames) {
                                                await menuActions.deleteBook?.(bookName);
                                            }
                                        } else {
                                            for (const bookName of bookNames) {
                                                await menuActions.setBookFolder(bookName, null);
                                            }
                                        }
                                        removeFolderName(folderName);
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
    const observer = new MutationObserver(()=>{
        updateFolderCount(count, books.childElementCount);
    });
    observer.observe(books, { childList: true });
    updateFolderCount(count, books.childElementCount);
    return {
        root,
        header: root.querySelector('.stwid--folderHeader'),
        books,
        count,
        toggle,
        observer,
    };
};

export {
    createFolderDom,
    getFolderFromMetadata,
    getFolderRegistry,
    registerFolderName,
    setFolderCollapsed,
    setFolderInMetadata,
    sanitizeFolderMetadata,
    updateFolderCount,
};
