import {
    getVisibleFolderBookNames,
    getFolderActiveState,
} from './book-folders.lorebook-folders.js';
import {
    renameFolderAction,
    importFolderAction,
    exportFolderAction,
    entryManagerFolderAction,
    deleteFolderAction,
} from './book-folders.folder-actions.js';

const updateFolderCount = (countElement, count)=>{
    if (!countElement) return;
    countElement.textContent = `(${count})`;
};

const setFolderCollapsed = (folderDom, isCollapsed)=>{
    if (!folderDom) return;
    folderDom.books.classList.toggle('stwid--state-collapsed', Boolean(isCollapsed));
    if (isCollapsed) {
        folderDom.toggle.classList.remove('fa-chevron-up');
        folderDom.toggle.classList.add('fa-chevron-down');
    } else {
        folderDom.toggle.classList.add('fa-chevron-up');
        folderDom.toggle.classList.remove('fa-chevron-down');
    }
};

const createFolderDom = ({ folderName, onToggle, onDrop, onDragStateChange, menuActions })=>{
    let isDropTargetActive = false;
    const clearDropTargetState = (evt)=>{
        if (!onDrop) return;
        root.classList.remove('stwid--state-target');
        if (!isDropTargetActive) return;
        isDropTargetActive = false;
        onDragStateChange?.(false, evt);
    };
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
                if (!isDropTargetActive) {
                    const allowDrop = onDragStateChange?.(true, evt) ?? true;
                    if (!allowDrop) return;
                    isDropTargetActive = true;
                }
                evt.preventDefault();
                root.classList.add('stwid--state-target');
            });
            header.addEventListener('dragleave', (evt)=>{
                clearDropTargetState(evt);
            });
            header.addEventListener('drop', async(evt)=>{
                if (!onDrop) return;
                evt.preventDefault();
                clearDropTargetState(evt);
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
            const actions = document.createElement('div'); {
                actions.classList.add('stwid--actions');
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
                    actions.append(activeToggle);
                }
                const addButton = document.createElement('div'); {
                    addButton.classList.add('stwid--action');
                    addButton.classList.add('stwid--folderAction');
                    addButton.classList.add('stwid--add');
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
                    actions.append(addButton);
                }
                if (menuActions) {
                    const menuTrigger = document.createElement('div'); {
                        menuTrigger.classList.add('stwid--action');
                        menuTrigger.classList.add('stwid--folderMenu');
                        menuTrigger.classList.add('stwid--listDropdownTrigger');
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
                                    menu.classList.add('stwid--listDropdownMenu', 'stwid--menu');
                                    const rename = document.createElement('div'); {
                                        rename.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                                        rename.classList.add('stwid--rename');
                                        rename.addEventListener('click', async()=>{
                                            blocker.remove();
                                            menuTrigger.style.anchorName = '';
                                            await renameFolderAction({ folderName, menuActions });
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
                                        imp.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                                        imp.classList.add('stwid--import');
                                        imp.addEventListener('click', async()=>{
                                            blocker.remove();
                                            menuTrigger.style.anchorName = '';
                                            await importFolderAction({ folderName, menuActions });
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
                                        exp.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                                        exp.classList.add('stwid--export');
                                        exp.addEventListener('click', ()=>{
                                            blocker.remove();
                                            menuTrigger.style.anchorName = '';
                                            exportFolderAction({ folderName, menuActions });
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
                                    const entryManager = document.createElement('div'); {
                                        entryManager.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                                        entryManager.classList.add('stwid--entryManager');
                                        entryManager.addEventListener('click', ()=>{
                                            blocker.remove();
                                            menuTrigger.style.anchorName = '';
                                            entryManagerFolderAction({ folderName, menuActions });
                                        });
                                        const i = document.createElement('i'); {
                                            i.classList.add('stwid--icon');
                                            i.classList.add('fa-solid', 'fa-fw', 'fa-arrow-down-wide-short');
                                            entryManager.append(i);
                                        }
                                        const txt = document.createElement('span'); {
                                            txt.classList.add('stwid--label');
                                            txt.textContent = 'Entry Manager (Folder)';
                                            entryManager.append(txt);
                                        }
                                        menu.append(entryManager);
                                    }
                                    const del = document.createElement('div'); {
                                        del.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
                                        del.classList.add('stwid--delete');
                                        del.addEventListener('click', async()=>{
                                            blocker.remove();
                                            menuTrigger.style.anchorName = '';
                                            await deleteFolderAction({ folderName, menuActions });
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
                                }
                                blocker.append(menu);
                            }
                            document.body.append(blocker);
                        });
                        actions.append(menuTrigger);
                    }
                }
                const toggle = document.createElement('i'); {
                    toggle.classList.add('stwid--action');
                    toggle.classList.add('stwid--folderToggle');
                    toggle.classList.add('stwid--collapseToggle');
                    toggle.classList.add('fa-solid', 'fa-fw', 'fa-chevron-down');
                    toggle.title = 'Collapse/expand this folder';
                    toggle.setAttribute('aria-label', 'Collapse or expand this folder');
                    actions.append(toggle);
                }
                header.append(actions);
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
    const updateActiveToggle = (visibleBookNamesOverride = null)=>{
        if (!activeToggle || !menuActions?.cache || !menuActions?.getSelectedWorldInfo) return;
        const visibleBookNames = Array.isArray(visibleBookNamesOverride)
            ? visibleBookNamesOverride
            : getVisibleFolderBookNames(menuActions.cache, folderName);
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
        cleanup: ()=>observer.disconnect(),
        updateActiveToggle,
    };
};

export {
    createFolderDom,
    setFolderCollapsed,
    updateFolderCount,
};
