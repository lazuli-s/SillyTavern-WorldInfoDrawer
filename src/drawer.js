
import { extensionNames } from '../../../../extensions.js';

import { renderTemplateAsync } from '../../../../templates.js';
import { debounce, debounceAsync, delay, download, getSortableDelay, isTrueBoolean } from '../../../../utils.js';

import { createNewWorldInfo, createWorldInfoEntry, deleteWIOriginalDataValue, deleteWorldInfo, deleteWorldInfoEntry, getFreeWorldName, getWorldEntry, onWorldInfoChange, selected_world_info, world_names } from '../../../../world-info.js';
import { Settings, SORT, SORT_DIRECTION } from './shared/settings.js';
import { initSplitter } from './drawer.splitter.js';
import { initEditorPanel } from './editor-panel/editor-panel.js';
import { initBookBrowser } from './book-browser/book-browser.js';
import { registerFolderName } from './book-browser/book-list/book-folders/book-folders.lorebook-folders.js';
import { createLorebooksTabContent } from './book-browser/browser-tabs/browser-tabs.lorebooks-tab.js';
import { createFoldersTabContent } from './book-browser/browser-tabs/browser-tabs.folders-tab.js';
import { createSettingsTabContent } from './book-browser/browser-tabs/browser-tabs.settings-tab.js';
import { createSortingTabContent } from './book-browser/browser-tabs/browser-tabs.sorting-tab.js';
import { initEntryManager } from './entry-manager/entry-manager.js';
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
        lorebooksTabContent: undefined,
        foldersTabContent: undefined,
        settingsTabContent: undefined,
        folderControls: {
            group: undefined,
            add: undefined,
            import: undefined,
            collapseAll: undefined,
        },
        
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
        const { openEntryManager, refreshEntryManagerScope } = initEntryManager({
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
                    dom.lorebooksTabContent = createLorebooksTabContent({
                        dom,
                        cache,
                        getFreeWorldName,
                        createNewWorldInfo,
                        Popup,
                        wiHandlerApi,
                        getListPanelApi: ()=>listPanelApi,
                    });
                    dom.foldersTabContent = createFoldersTabContent({
                        dom,
                        registerFolderName,
                        Popup,
                        getListPanelApi: ()=>listPanelApi,
                    });
                    const { root: settingsTabRoot, setToggleVisible: setOrderToggleVisible } = createSettingsTabContent({
                        dom,
                        openEntryManager,
                        getListPanelApi: ()=>listPanelApi,
                        getEditorPanelApi: ()=>editorPanelApi,
                        getCurrentEditor,
                    });
                    dom.settingsTabContent = settingsTabRoot;
                    dom.setOrderToggleVisible = setOrderToggleVisible;
                    const controls = document.createElement('div'); {
                        controls.classList.add('stwid--controls');
                        dom.sortingRow = createSortingTabContent({ cache, getListPanelApi: ()=>listPanelApi });
                        controls.append(dom.sortingRow);
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
                        onBookVisibilityScopeChange: (scope)=>refreshEntryManagerScope(scope),
                        openEntryManager,
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
        setFolderControlsVisibility: (enabled)=>{
            const visible = Boolean(enabled);
            const group = dom.folderControls.group;
            if (group instanceof HTMLElement) {
                group.hidden = !visible;
            }
            const add = dom.folderControls.add;
            if (add instanceof HTMLElement) {
                add.hidden = !visible;
            }
            const importButton = dom.folderControls.import;
            if (importButton instanceof HTMLElement) {
                importButton.hidden = !visible;
            }
            const collapseAll = dom.folderControls.collapseAll;
            if (collapseAll instanceof HTMLElement) {
                collapseAll.hidden = !visible;
            }
        },
        getListPanelApi: ()=>listPanelApi,
        getOrderToggle: ()=>dom.order.toggle,
        listPanelApi,
        selectionState,
    };
};




