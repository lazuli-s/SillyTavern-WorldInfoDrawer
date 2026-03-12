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

const FOLDER_MENU_ANCHOR_NAME = '--stwid--ctxAnchor';

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

const createFolderMenuItem = ({ itemClass, iconClass, label, onSelect })=>{
    const item = document.createElement('div'); {
        item.classList.add('stwid--listDropdownItem', 'stwid--menuItem');
        item.classList.add(itemClass);
        item.addEventListener('click', onSelect);
        const menuIcon = document.createElement('i'); {
            menuIcon.classList.add('stwid--icon');
            menuIcon.classList.add('fa-solid', 'fa-fw', iconClass);
            item.append(menuIcon);
        }
        const menuLabel = document.createElement('span'); {
            menuLabel.classList.add('stwid--label');
            menuLabel.textContent = label;
            item.append(menuLabel);
        }
    }
    return item;
};

const bindFolderHeaderDropHandlers = ({ header, root, onDrop, onDragStateChange, clearDropTargetState, setDropTargetActive })=>{
    header.addEventListener('dragover', (evt)=>{
        if (!onDrop) return;
        if (!setDropTargetActive()) {
            const allowDrop = onDragStateChange?.(true, evt) ?? true;
            if (!allowDrop) return;
            setDropTargetActive(true);
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
};

const buildFolderMenuOverlay = ({ folderName, menuActions, menuTrigger })=>{
    const blocker = document.createElement('div'); {
        const closeFolderMenu = ()=>{
            blocker.remove();
            menuTrigger.style.anchorName = '';
        };
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
            closeFolderMenu();
        });
        const menu = document.createElement('div'); {
            menu.classList.add('stwid--listDropdownMenu', 'stwid--menu');
            menu.append(createFolderMenuItem({
                itemClass: 'stwid--rename',
                iconClass: 'fa-pencil',
                label: 'Rename Folder',
                onSelect: async()=>{
                    closeFolderMenu();
                    await renameFolderAction({ folderName, menuActions });
                },
            }));
            menu.append(createFolderMenuItem({
                itemClass: 'stwid--import',
                iconClass: 'fa-file-import',
                label: 'Import Into Folder',
                onSelect: async()=>{
                    closeFolderMenu();
                    await importFolderAction({ folderName, menuActions });
                },
            }));
            menu.append(createFolderMenuItem({
                itemClass: 'stwid--export',
                iconClass: 'fa-file-export',
                label: 'Export Folder',
                onSelect: ()=>{
                    closeFolderMenu();
                    exportFolderAction({ folderName, menuActions });
                },
            }));
            menu.append(createFolderMenuItem({
                itemClass: 'stwid--entryManager',
                iconClass: 'fa-arrow-down-wide-short',
                label: 'Entry Manager (Folder)',
                onSelect: ()=>{
                    closeFolderMenu();
                    entryManagerFolderAction({ folderName, menuActions });
                },
            }));
            menu.append(createFolderMenuItem({
                itemClass: 'stwid--delete',
                iconClass: 'fa-trash-can',
                label: 'Delete Folder',
                onSelect: async()=>{
                    closeFolderMenu();
                    await deleteFolderAction({ folderName, menuActions });
                },
            }));
        }
        blocker.append(menu);
    }
    return blocker;
};

const createFolderActionsDom = ({ folderName, header, menuActions })=>{
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
                    menuTrigger.style.anchorName = FOLDER_MENU_ANCHOR_NAME;
                    document.body.append(buildFolderMenuOverlay({ folderName, menuActions, menuTrigger }));
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
    return actions;
};

const syncFolderActiveToggleState = ({ activeToggle, menuActions, folderName, visibleBookNamesOverride = null })=>{
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
            bindFolderHeaderDropHandlers({
                header,
                root,
                onDrop,
                onDragStateChange,
                clearDropTargetState,
                setDropTargetActive: (nextState = undefined)=>{
                    if (typeof nextState === 'boolean') {
                        isDropTargetActive = nextState;
                    }
                    return isDropTargetActive;
                },
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
            createFolderActionsDom({ folderName, header, menuActions });
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
    const updateActiveToggle = (visibleBookNamesOverride = null)=>syncFolderActiveToggleState({
        activeToggle,
        menuActions,
        folderName,
        visibleBookNamesOverride,
    });
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
