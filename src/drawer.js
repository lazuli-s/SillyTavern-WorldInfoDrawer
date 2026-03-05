
import { extensionNames } from '../../../../extensions.js';

import { renderTemplateAsync } from '../../../../templates.js';
import { debounce, debounceAsync, delay, download, getSortableDelay, isTrueBoolean } from '../../../../utils.js';

import { createNewWorldInfo, createWorldInfoEntry, deleteWIOriginalDataValue, deleteWorldInfo, deleteWorldInfoEntry, getFreeWorldName, getWorldEntry, onWorldInfoChange, selected_world_info, world_names } from '../../../../world-info.js';
import { Settings, SORT, SORT_DIRECTION } from './shared/settings.js';
import { initSplitter } from './drawer.splitter.js';
import { initEditorPanel } from './editor-panel/editor-panel.js';
import { initBookBrowser } from './book-browser/book-browser.js';
import { registerFolderName } from './book-browser/book-list/book-folders/book-folders.lorebook-folders.js';
import { initOrderHelper } from './entry-manager/entry-manager.js';
import { METADATA_NAMESPACE, METADATA_SORT_KEY, getSortFromMetadata, sortEntries } from './shared/sort-helpers.js';
import { entryState, renderEntry, setWorldEntryContext } from './book-browser/book-list/book-list.world-entry.js';
import { appendSortOptions, executeSlashCommand, getSortLabel, isOutletPosition, safeToSorted } from './shared/utils.js';

export const initDrawer = ({
    cache,
    getCurrentEditor,
    setCurrentEditor,
    wiHandlerApi,
    bookSourceLinksApi,
})=>{
    const dom = {
        drawer: {
            
            body: undefined,
        },
        
        books: undefined,
        
        editor: undefined,
        
        collapseAllToggle: undefined,
        
        collapseAllFoldersToggle: undefined,
        
        activationToggle: undefined,
        
        visibilityAndSettingsRow: undefined,
        
        controlsRow: undefined,
        
        sortingRow: undefined,
        order: {
            
            toggle: undefined,
            
            start: undefined,
            
            step: undefined,
            direction: {
                
                up: undefined,
                
                down: undefined,
            },
            filter: {
                
                root: undefined,
                
                preview: undefined,
            },
            
            selectAll: undefined,
            
            sortSelect: undefined,
            
            entries: {},
            
            tbody: undefined,
        },
    };

    const activationBlock = document.querySelector('#wiActivationSettings');
    const activationBlockParent = activationBlock?.parentElement;

    let listPanelApi;
    let selectionState;
    let editorPanelApi;
    let moSel;
    let moDrawer;

    const context = SillyTavern.getContext();
    const {
        getRequestHeaders,
        Popup,
        SlashCommandParser,
        loadWorldInfo,
        saveWorldInfo,
        uuidv4,
    } = context;

    
    const deleteWorldInfoEntryRuntime = (book, uid, options)=>deleteWorldInfoEntry(book, uid, options);

    
    const updateWIChangeRuntime = (bookName, bookData)=>wiHandlerApi.updateWIChange(bookName, bookData);
    const entryStateSaveQueueByBook = new Map();
    const enqueueEntryStateSave = (bookName)=>{
        const previousSave = entryStateSaveQueueByBook.get(bookName) ?? Promise.resolve();
        const queuedSave = previousSave
            .catch(()=>{})
            .then(()=>saveWorldInfo(bookName, wiHandlerApi.buildSavePayload(bookName), true))
        ;
        entryStateSaveQueueByBook.set(bookName, queuedSave);
        return queuedSave.finally(()=>{
            if (entryStateSaveQueueByBook.get(bookName) === queuedSave) {
                entryStateSaveQueueByBook.delete(bookName);
            }
        });
    };

    const addDrawer = ()=>{
        const { openOrderHelper, refreshOrderHelperScope } = initOrderHelper({
            dom,
            cache,
            SORT,
            SORT_DIRECTION,
            sortEntries,
            appendSortOptions,
            saveWorldInfo,
            buildSavePayload: wiHandlerApi.buildSavePayload,
            getSelectedWorldInfo: ()=>selected_world_info,
            getListPanelApi: ()=>listPanelApi,
            getEditorPanelApi: ()=>editorPanelApi,
            getCurrentEditor,
            debounce,
            isTrueBoolean,
            SlashCommandParser,
            getSortableDelay,
            entryState,
            isOutletPosition,
            hljs,
            $,
        });

        const onDrawerKeydown = async(evt)=>{
            
            const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
            if (!centerEl?.closest?.('.stwid--body')) return;

            
            
            const target =  (evt.target instanceof HTMLElement ? evt.target : null);
            const isTextEditing = Boolean(
                target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]'),
            );
            if (isTextEditing) return;

            
            if (selectionState.selectFrom === null || !selectionState.selectList?.length) return;

            console.log('[STWID]', evt.key);
            switch (evt.key) {
                case 'Delete': {
                    evt.preventDefault();
                    evt.stopPropagation();

                    
                    
                    const selectFrom = selectionState.selectFrom;
                    const selectedUids = [...(selectionState.selectList ?? [])];
                    if (selectFrom === null || !selectedUids.length) return;

                    
                    
                    const isSelectionVisible = ()=>{
                        const bookRoot = cache[selectFrom]?.dom?.root;
                        if (!bookRoot) return false;
                        if (
                            bookRoot.classList.contains('stwid--filter-visibility') ||
                            bookRoot.classList.contains('stwid--filter-query')
                        ) return false;
                        return selectedUids.every((uid)=>{
                            const entryRoot = cache[selectFrom]?.dom?.entry?.[uid]?.root;
                            return entryRoot && !entryRoot.classList.contains('stwid--filter-query');
                        });
                    };
                    if (!isSelectionVisible()) {
                        const count = selectedUids.length;
                        const noun = count === 1 ? 'entry is' : 'entries are';
                        const confirmed = await Popup.show.confirm(
                            `${count} selected ${noun} currently hidden by filters. Delete anyway?`,
                        );
                        if (!confirmed) return;
                    }

                    const srcBook = await loadWorldInfo(selectFrom);
                    if (!srcBook) return;

                    for (const uid of selectedUids) {
                        const deleted = await deleteWorldInfoEntry(srcBook, uid, { silent:true });
                        if (deleted) {
                            deleteWIOriginalDataValue(srcBook, uid);
                        }
                    }

                    await saveWorldInfo(selectFrom, srcBook, true);
                    wiHandlerApi.updateWIChange(selectFrom, srcBook);
                    listPanelApi.selectEnd();
                    break;
                }
            }
        };
        document.addEventListener('keydown', onDrawerKeydown);

        
        globalThis.addEventListener?.('beforeunload', ()=>{
            document.removeEventListener('keydown', onDrawerKeydown);
            moSel?.disconnect();
            moDrawer?.disconnect();
            editorPanelApi?.cleanup?.();
            wiHandlerApi.cleanup?.();
            bookSourceLinksApi.cleanup();
        }, { once:true });

        document.body.classList.add('stwid--');
        let restoreSplitterForCurrentLayout = ()=>{};
        const drawerContent = document.querySelector('#WorldInfo'); {
            const body = document.createElement('div'); {
                dom.drawer.body = body;
                body.classList.add('stwid--body');
                body.classList.add('stwid--state-loading');
                const list = document.createElement('div'); {
                    list.classList.add('stwid--list');
                    const controls = document.createElement('div'); {
                        controls.classList.add('stwid--controls');
                        const controlsPrimary = document.createElement('div');
                        controlsPrimary.classList.add('stwid--controlsRow');
                        dom.controlsRow = controlsPrimary;
                        const lorebooksGroup = document.createElement('div');
                        lorebooksGroup.classList.add('stwid--thinContainer');
                        const lorebooksGroupLabel = document.createElement('span');
                        lorebooksGroupLabel.classList.add('stwid--thinContainerLabel');
                        lorebooksGroupLabel.textContent = 'Lorebooks';
                        const lorebooksGroupHint = document.createElement('i');
                        lorebooksGroupHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
                        lorebooksGroupHint.title = 'Create, import, or collapse lorebooks';
                        lorebooksGroupLabel.append(lorebooksGroupHint);
                        lorebooksGroup.append(lorebooksGroupLabel);
                        controlsPrimary.append(lorebooksGroup);
                        const foldersGroup = document.createElement('div');
                        foldersGroup.classList.add('stwid--thinContainer');
                        const foldersGroupLabel = document.createElement('span');
                        foldersGroupLabel.classList.add('stwid--thinContainerLabel');
                        foldersGroupLabel.textContent = 'Folders';
                        const foldersGroupHint = document.createElement('i');
                        foldersGroupHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
                        foldersGroupHint.title = 'Create, import, or collapse folders';
                        foldersGroupLabel.append(foldersGroupHint);
                        foldersGroup.append(foldersGroupLabel);
                        controlsPrimary.append(foldersGroup);
                        const settingsGroup = document.createElement('div');
                        settingsGroup.classList.add('stwid--thinContainer');
                        const settingsGroupLabel = document.createElement('span');
                        settingsGroupLabel.classList.add('stwid--thinContainerLabel');
                        settingsGroupLabel.textContent = 'Settings';
                        const settingsGroupHint = document.createElement('i');
                        settingsGroupHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
                        settingsGroupHint.title = 'Open activation settings or refresh the list';
                        settingsGroupLabel.append(settingsGroupHint);
                        settingsGroup.append(settingsGroupLabel);
                        controlsPrimary.append(settingsGroup);
                        const add = (document.querySelector('#world_create_button').cloneNode(true)); {
                            add.removeAttribute('id');
                            add.classList.add('stwid--addBook');
                            add.title = 'Create New Book';
                            add.setAttribute('aria-label', 'Create New Book');
                            add.querySelector('span')?.remove();
                            add.addEventListener('click', async()=>{
                                const tempName = getFreeWorldName();
                                const finalName = await Popup.show.input('Create a new World Info', 'Enter a name for the new file:', tempName);
                                if (!finalName) return;

                                
                                const waitForUpdate = wiHandlerApi.waitForWorldInfoUpdate();
                                const created = await createNewWorldInfo(finalName, { interactive: true });
                                if (!created) return;

                                await waitForUpdate;
                                await wiHandlerApi.getUpdateWIChangeFinished()?.promise;

                                
                                listPanelApi.setBookCollapsed(finalName, false);

                                if (!cache[finalName]?.dom?.root) {
                                    console.warn('[STWID] New book created but not yet present in cache/DOM; forcing refresh.', finalName);
                                    await listPanelApi.refreshList();
                                }

                                cache[finalName]?.dom?.root?.scrollIntoView({ block:'center', inline:'center' });
                            });
                            lorebooksGroup.append(add);
                        }
                        const addFolder = document.createElement('div'); {
                            addFolder.classList.add('menu_button');
                            addFolder.classList.add('fa-solid', 'fa-fw', 'fa-folder-plus');
                            addFolder.title = 'New Folder';
                            addFolder.setAttribute('aria-label', 'New Folder');
                            addFolder.addEventListener('click', async()=>{
                                const folderName = await Popup.show.input('Create a new folder', 'Enter a name for the new folder:', 'New Folder');
                                if (!folderName) return;
                                const result = registerFolderName(folderName);
                                if (!result.ok) {
                                    if (result.reason === 'invalid') {
                                        toastr.error('Folder names cannot include "/".');
                                        return;
                                    }
                                    toastr.warning('Folder name cannot be empty.');
                                    return;
                                }
                                await listPanelApi.refreshList();
                            });
                            foldersGroup.append(addFolder);
                        }
                        const imp = document.createElement('div'); {
                            imp.classList.add('menu_button');
                            imp.classList.add('fa-solid', 'fa-fw', 'fa-file-import');
                            imp.title = 'Import Book';
                            imp.setAttribute('aria-label', 'Import Book');
                            imp.addEventListener('click', ()=>{
                                (document.querySelector('#world_import_file')).click();
                            });
                            lorebooksGroup.append(imp);
                        }
                        const impFolder = document.createElement('div'); {
                            impFolder.classList.add('menu_button');
                            impFolder.classList.add('fa-solid', 'fa-fw', 'fa-file-import');
                            impFolder.title = 'Import Folder';
                            impFolder.setAttribute('aria-label', 'Import Folder');
                            impFolder.addEventListener('click', ()=>{
                                listPanelApi?.openFolderImportDialog?.();
                            });
                            foldersGroup.append(impFolder);
                        }
                        const settings = document.createElement('div'); {
                            dom.activationToggle = settings;
                            settings.classList.add('stwid--activation');
                            settings.classList.add('menu_button');
                            settings.classList.add('fa-solid', 'fa-fw', 'fa-cog');
                            settings.title = 'Global Activation Settings';
                            settings.setAttribute('aria-label', 'Global Activation Settings');
                            settings.addEventListener('click', ()=>{
                                const currentEditor = getCurrentEditor();
                                const isDirty = Boolean(
                                    currentEditor && editorPanelApi?.isDirty?.(currentEditor.name, currentEditor.uid),
                                );

                                
                                
                                if (isDirty && !settings.classList.contains('stwid--state-active')) {
                                    toastr.warning('Unsaved edits detected. Save or discard changes before opening Activation Settings.');
                                    return;
                                }

                                editorPanelApi.toggleActivationSettings();
                            });
                            settingsGroup.append(settings);
                        }
                        const refresh = document.createElement('div'); {
                            refresh.classList.add('menu_button');
                            refresh.classList.add('fa-solid', 'fa-fw', 'fa-arrows-rotate');
                            refresh.title = 'Refresh';
                            refresh.setAttribute('aria-label', 'Refresh');
                            refresh.addEventListener('click', async()=>{
                                await listPanelApi.refreshList();
                            });
                            settingsGroup.append(refresh);
                        }
                        const order = document.createElement('div'); {
                            dom.order.toggle = order;
                            order.classList.add('menu_button');
                            order.classList.add('fa-solid', 'fa-fw', 'fa-arrow-down-wide-short');
                            order.title = 'Open Entry Manager (Book Visibility scope)';
                            order.setAttribute('aria-label', 'Open Entry Manager for current Book Visibility scope');
                            order.addEventListener('click', ()=>{
                                const isActive = order.classList.contains('stwid--state-active');

                                const currentEditor = getCurrentEditor();
                                const isDirty = Boolean(
                                    currentEditor && editorPanelApi?.isDirty?.(currentEditor.name, currentEditor.uid),
                                );

                                
                                
                                if (!isActive && isDirty) {
                                    toastr.warning('Unsaved edits detected. Save or discard changes before opening Entry Manager.');
                                    return;
                                }

                                if (isActive) {
                                    
                                    if (isDirty) {
                                        toastr.warning('Unsaved edits detected. Save or discard changes before closing Entry Manager.');
                                        return;
                                    }

                                    order.classList.remove('stwid--state-active');
                                    editorPanelApi.clearEditor();
                                    return;
                                }

                                const visibilityScope = listPanelApi?.getBookVisibilityScope?.();
                                openOrderHelper(null, visibilityScope);
                            });
                            controlsPrimary.append(order);
                        }
                        const collapseAllToggle = document.createElement('button'); {
                            dom.collapseAllToggle = collapseAllToggle;
                            collapseAllToggle.type = 'button';
                            collapseAllToggle.classList.add('menu_button');
                            collapseAllToggle.classList.add('stwid--collapseAllToggle');
                            const icon = document.createElement('i'); {
                                icon.classList.add('fa-solid', 'fa-fw');
                                collapseAllToggle.append(icon);
                            }
                            collapseAllToggle.addEventListener('click', ()=>{
                                const shouldCollapse = listPanelApi.hasExpandedBooks();
                                for (const name of Object.keys(cache)) {
                                    listPanelApi.setBookCollapsed(name, shouldCollapse);
                                }
                                listPanelApi.updateCollapseAllToggle();
                            });
                            lorebooksGroup.append(collapseAllToggle);
                        }
                        const collapseAllFoldersToggle = document.createElement('button'); {
                            dom.collapseAllFoldersToggle = collapseAllFoldersToggle;
                            collapseAllFoldersToggle.type = 'button';
                            collapseAllFoldersToggle.classList.add('menu_button');
                            collapseAllFoldersToggle.classList.add('stwid--collapseAllFoldersToggle');
                            const icon = document.createElement('i'); {
                                icon.classList.add('fa-solid', 'fa-fw');
                                collapseAllFoldersToggle.append(icon);
                            }
                            collapseAllFoldersToggle.addEventListener('click', ()=>{
                                const shouldCollapse = listPanelApi.hasExpandedFolders();
                                listPanelApi.setAllFoldersCollapsed(shouldCollapse);
                                listPanelApi.updateCollapseAllFoldersToggle();
                            });
                            foldersGroup.append(collapseAllFoldersToggle);
                        }
                        const controlsSecondary = document.createElement('div');
                        controlsSecondary.classList.add('stwid--sortingRow');
                        dom.sortingRow = controlsSecondary;
                        const globalSortingWrapper = document.createElement('div');
                        globalSortingWrapper.classList.add('stwid--thinContainer');
                        const globalSortingWrapperLabel = document.createElement('span');
                        globalSortingWrapperLabel.classList.add('stwid--thinContainerLabel');
                        globalSortingWrapperLabel.textContent = 'Global Sorting';
                        const globalSortingWrapperHint = document.createElement('i');
                        globalSortingWrapperHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
                        globalSortingWrapperHint.title = 'This menu sets the default sorting for all lorebooks. If Per-book Sorting is on, books with saved per-book sorting use that instead.';
                        globalSortingWrapperLabel.append(globalSortingWrapperHint);
                        globalSortingWrapper.append(globalSortingWrapperLabel);
                        const globalSortingGroup = document.createElement('div');
                        globalSortingGroup.classList.add('stwid--globalSorting');
                        const sortSel = document.createElement('select'); {
                            sortSel.classList.add('text_pole', 'stwid--smallSelectTextPole');
                            sortSel.title = 'Global entry sort for the book browser';
                            sortSel.setAttribute('aria-label', 'Global entry sort');
                            sortSel.addEventListener('change', ()=>{
                                const value = JSON.parse(sortSel.value);
                                Settings.instance.sortLogic = value.sort;
                                Settings.instance.sortDirection = value.direction;
                                for (const name of Object.keys(cache)) {
                                    listPanelApi.sortEntriesIfNeeded(name);
                                }
                                Settings.instance.save();
                            });
                            appendSortOptions(sortSel, Settings.instance.sortLogic, Settings.instance.sortDirection);
                            globalSortingGroup.append(sortSel);
                        }
                        const bookSortToggle = document.createElement('button'); {
                            bookSortToggle.type = 'button';
                            bookSortToggle.classList.add('menu_button');
                            bookSortToggle.classList.add('stwid--bookSortToggle');
                            const icon = document.createElement('i'); {
                                icon.classList.add('fa-solid', 'fa-fw');
                                bookSortToggle.append(icon);
                            }
                            const updateToggleState = ()=>{
                                const enabled = Settings.instance.useBookSorts;
                                bookSortToggle.classList.toggle('stwid--state-active', enabled);
                                bookSortToggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
                                icon.classList.toggle('fa-toggle-on', enabled);
                                icon.classList.toggle('fa-toggle-off', !enabled);
                                const label = enabled ? 'Per-book sort: On' : 'Per-book sort: Off';
                                bookSortToggle.title = label;
                                bookSortToggle.setAttribute('aria-label', label);
                            };
                            updateToggleState();
                            bookSortToggle.addEventListener('click', ()=>{
                                Settings.instance.useBookSorts = !Settings.instance.useBookSorts;
                                Settings.instance.save();
                                updateToggleState();
                                for (const name of Object.keys(cache)) {
                                    listPanelApi.sortEntriesIfNeeded(name);
                                }
                            });
                        }
                        const clearBookSorts = document.createElement('button'); {
                            clearBookSorts.type = 'button';
                            clearBookSorts.classList.add('menu_button');
                            clearBookSorts.classList.add('stwid--clearBookSorts');
                            const icon = document.createElement('i'); {
                                icon.classList.add('fa-solid', 'fa-fw', 'fa-broom');
                                clearBookSorts.append(icon);
                            }
                            clearBookSorts.title = 'Clear All Preferences';
                            clearBookSorts.setAttribute('aria-label', 'Clear All Preferences');
                            clearBookSorts.addEventListener('click', async()=>{
                                clearBookSorts.disabled = true;
                                try {
                                    await listPanelApi.clearBookSortPreferences();
                                } finally {
                                    clearBookSorts.disabled = false;
                                }
                            });
                        }
                        const perBookSortingWrapper = document.createElement('div');
                        perBookSortingWrapper.classList.add('stwid--thinContainer');
                        const perBookSortingWrapperLabel = document.createElement('span');
                        perBookSortingWrapperLabel.classList.add('stwid--thinContainerLabel');
                        perBookSortingWrapperLabel.textContent = 'Per-book Sorting';
                        const perBookSortingWrapperHint = document.createElement('i');
                        perBookSortingWrapperHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
                        perBookSortingWrapperHint.title = 'Turn this on to let each lorebook use its own sorting preference. Turn it off to make every lorebook follow Global Sorting.';
                        perBookSortingWrapperLabel.append(perBookSortingWrapperHint);
                        perBookSortingWrapper.append(perBookSortingWrapperLabel);
                        const perBookSortingGroup = document.createElement('div');
                        perBookSortingGroup.classList.add('stwid--individualSorting');
                        const perBookButtons = document.createElement('div');
                        perBookButtons.classList.add('stwid--perBookSortButtons');
                        perBookButtons.append(bookSortToggle, clearBookSorts);
                        perBookSortingGroup.append(perBookButtons);
                        globalSortingWrapper.append(globalSortingGroup);
                        perBookSortingWrapper.append(perBookSortingGroup);
                        controlsSecondary.append(globalSortingWrapper, perBookSortingWrapper);
                        controls.append(controlsPrimary, controlsSecondary);
                        list.append(controls);
                    }
                    editorPanelApi = initEditorPanel({
                        dom,
                        activationBlock,
                        activationBlockParent,
                        renderTemplateAsync,
                        getWorldEntry,
                        buildSavePayload: wiHandlerApi.buildSavePayload,
                        cache,
                        setCurrentEditor,
                        getSelectFrom: ()=>selectionState?.selectFrom,
                        selectEnd: ()=>listPanelApi.selectEnd(),
                    });
                    listPanelApi = initBookBrowser({
                        Settings,
                        METADATA_NAMESPACE,
                        METADATA_SORT_KEY,
                        appendSortOptions,
                        buildSavePayload: wiHandlerApi.buildSavePayload,
                        cache,
                        debounce,
                        debounceAsync,
                        deleteWIOriginalDataValue,
                        deleteWorldInfo,
                        deleteWorldInfoEntry: deleteWorldInfoEntryRuntime,
                        delay,
                        dom,
                        download,
                        executeSlashCommand,
                        extensionNames,
                        fillEmptyTitlesWithKeywords: wiHandlerApi.fillEmptyTitlesWithKeywords,
                        getRequestHeaders,
                        getSortFromMetadata,
                        getSortLabel,
                        getBookSourceLinks: (name)=>bookSourceLinksApi.getBookSourceLinks(name),
                        list,
                        loadWorldInfo,
                        onWorldInfoChange,
                        onBookVisibilityScopeChange: (scope)=>refreshOrderHelperScope(scope),
                        openOrderHelper,
                        Popup,
                        renderEntry,
                        resetEditor: ()=>{
                            editorPanelApi.clearEditor();
                        },
                        safeToSorted,
                        saveWorldInfo,
                        getSelectedWorldInfo: ()=>selected_world_info,
                        getWorldNames: ()=>world_names,
                        sortEntries,
                        updateWIChange: updateWIChangeRuntime,
                        waitForWorldInfoUpdate: wiHandlerApi.waitForWorldInfoUpdate,
                        world_names,
                        createNewWorldInfo,
                        createWorldInfoEntry,
                        getFreeWorldName,
                        isDirtyCheck: ()=>{
                            const currentEditor = getCurrentEditor();
                            return Boolean(currentEditor && editorPanelApi?.isDirty?.(currentEditor.name, currentEditor.uid));
                        },
                    });
                    bookSourceLinksApi.refreshBookSourceLinks('list_panel_init');
                    selectionState = listPanelApi.getSelectionState();
                    setWorldEntryContext({
                        buildSavePayload: wiHandlerApi.buildSavePayload,
                        cache,
                        dom,
                        enqueueEntryStateSave,
                        getWorldEntry,
                        renderTemplateAsync,
                        saveWorldInfo,
                        selectAdd: listPanelApi.selectAdd,
                        selectEnd: listPanelApi.selectEnd,
                        selectRemove: listPanelApi.selectRemove,
                        uuidv4,
                        editorPanel: editorPanelApi,
                        get currentEditor() {
                            return getCurrentEditor();
                        },
                        set currentEditor(value) {
                            setCurrentEditor(value);
                        },
                        get selectFrom() {
                            return selectionState.selectFrom;
                        },
                        set selectFrom(value) {
                            selectionState.selectFrom = value;
                        },
                        get selectLast() {
                            return selectionState.selectLast;
                        },
                        set selectLast(value) {
                            selectionState.selectLast = value;
                        },
                        get selectList() {
                            return selectionState.selectList;
                        },
                        set selectList(value) {
                            selectionState.selectList = value;
                        },
                        get selectToast() {
                            return selectionState.selectToast;
                        },
                        set selectToast(value) {
                            selectionState.selectToast = value;
                        },
                    });
                    listPanelApi.updateCollapseAllToggle();
                    listPanelApi.updateCollapseAllFoldersToggle();
                    body.append(list);
                }
                restoreSplitterForCurrentLayout = initSplitter(body, list);
                const editor = document.createElement('div'); {
                    dom.editor = editor;
                    editor.classList.add('stwid--editor');
                    editor.addEventListener('click', (evt)=>{
                        const target = evt.target instanceof HTMLElement ? evt.target : null;
                        if (!target?.closest('.duplicate_entry_button')) return;
                        wiHandlerApi.queueEditorDuplicateRefresh();
                    }, true);
                    body.append(editor);
                }
                drawerContent.append(body);
                restoreSplitterForCurrentLayout();
            }
        }
        const closeButton = drawerContent.querySelector('h3 > span');
        if (closeButton) {
            closeButton.addEventListener('click', ()=>{
                const is = document.body.classList.toggle('stwid--');
                if (!is) {
                    if (dom.activationToggle?.classList?.contains('stwid--state-active')) {
                        dom.activationToggle.click();
                    }
                }
            });
        }

        const moSelTarget = document.querySelector('#world_editor_select');
        if (moSelTarget) {
            moSel = new MutationObserver(()=>wiHandlerApi.updateWIChangeDebounced());
            moSel.observe(moSelTarget, { childList:true });
        }

        moDrawer = new MutationObserver(()=>{
            const style = drawerContent.getAttribute('style') ?? '';
            if (style.includes('display: none;')) return;

            
            
            
            restoreSplitterForCurrentLayout();

            const currentEditor = getCurrentEditor();
            if (!currentEditor) return;

            const isDirty = Boolean(editorPanelApi?.isDirty?.(currentEditor.name, currentEditor.uid));
            if (isDirty) {
                console.debug('[STWID] Drawer reopen: editor is dirty; skipping auto-restore click.');
                return;
            }

            if (cache[currentEditor.name]?.dom?.entry?.[currentEditor.uid]?.root) {
                cache[currentEditor.name].dom.entry[currentEditor.uid].root.click();
            }
        });
        moDrawer.observe(drawerContent, { attributes:true, attributeFilter:['style'] });
    };

    addDrawer();

    return {
        editorPanelApi,
        getActivationToggle: ()=>dom.activationToggle,
        getListPanelApi: ()=>listPanelApi,
        getOrderToggle: ()=>dom.order.toggle,
        listPanelApi,
        selectionState,
    };
};




