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

const FILTER_QUERY_CLASS = 'stwid--filter-query';
const DRAWER_ACTIVE_CLASS = 'stwid--';
const STYLE_ATTRIBUTE = 'style';
const ENTRY_MANAGER_ACTIVE_CLASS = 'stwid--state-active';

const getEventTargetElement = (evt)=>evt.target instanceof HTMLElement ? evt.target : null;

const setHiddenIfElement = (el, hidden)=>{
    if (el instanceof HTMLElement) {
        el.hidden = hidden;
    }
};

const createDrawerRuntimeState = ({ saveWorldInfo, wiHandlerApi })=>{
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

    return {
        dom,
        activationBlock,
        activationBlockParent,
        entryStateSaveQueueByBook,
        enqueueEntryStateSave,
    };
};

const shouldHandleDrawerKeydown = (evt)=>{
    const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    if (!centerEl?.closest?.('.stwid--body')) return false;

    const target = getEventTargetElement(evt);
    const isTextEditing = Boolean(
        target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]'),
    );
    return !isTextEditing;
};

const isEntryVisible = (cache, bookName, uid)=>{
    const entryRoot = cache[bookName]?.dom?.entry?.[uid]?.root;
    return Boolean(entryRoot) && !entryRoot.classList.contains(FILTER_QUERY_CLASS);
};

const isSelectionVisible = (cache, bookName, selectedUids)=>{
    const bookRoot = cache[bookName]?.dom?.root;
    if (!bookRoot) return false;
    if (
        bookRoot.classList.contains('stwid--filter-visibility') ||
        bookRoot.classList.contains(FILTER_QUERY_CLASS)
    ) {
        return false;
    }
    return selectedUids.every((uid)=>isEntryVisible(cache, bookName, uid));
};

const deleteSelectedEntriesAndSave = async({
    selectFrom,
    selectedUids,
    loadWorldInfo,
    deleteWorldInfoEntryRuntime,
    saveWorldInfo,
    wiHandlerApi,
    listPanelApi,
})=>{
    const srcBook = await loadWorldInfo(selectFrom);
    if (!srcBook) return;

    for (const uid of selectedUids) {
        const deleted = await deleteWorldInfoEntryRuntime(srcBook, uid, { silent:true });
        if (deleted) {
            deleteWIOriginalDataValue(srcBook, uid);
        }
    }

    await saveWorldInfo(selectFrom, srcBook, true);
    wiHandlerApi.updateWIChange(selectFrom, srcBook);
    listPanelApi.selectEnd();
};

const initDrawerEntryManager = ({
    dom,
    cache,
    saveWorldInfo,
    wiHandlerApi,
    getListPanelApi,
    getEditorPanelApi,
    getCurrentEditor,
    SlashCommandParser,
})=>initEntryManager({
    dom,
    cache,
    SORT,
    SORT_DIRECTION,
    sortEntries,
    appendSortOptions,
    saveWorldInfo,
    buildSavePayload: wiHandlerApi.buildSavePayload,
    getSelectedWorldInfo: ()=>selected_world_info,
    getListPanelApi,
    getEditorPanelApi,
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

const installDrawerKeyboardShortcuts = ({
    cache,
    Popup,
    loadWorldInfo,
    saveWorldInfo,
    wiHandlerApi,
    listPanelApi,
    selectionState,
    deleteWorldInfoEntryRuntime,
})=>{
    const onDrawerKeydown = async(evt)=>{
        if (!shouldHandleDrawerKeydown(evt)) return;
        if (selectionState.selectFrom === null || !selectionState.selectList?.length) return;

        console.log('[STWID]', evt.key);
        switch (evt.key) {
            case 'Delete': {
                evt.preventDefault();
                evt.stopPropagation();

                const selectFrom = selectionState.selectFrom;
                const selectedUids = [...(selectionState.selectList ?? [])];
                if (selectFrom === null || !selectedUids.length) return;

                if (!isSelectionVisible(cache, selectFrom, selectedUids)) {
                    const count = selectedUids.length;
                    const noun = count === 1 ? 'entry is' : 'entries are';
                    const confirmed = await Popup.show.confirm(
                        `${count} selected ${noun} currently hidden by filters. Delete anyway?`,
                    );
                    if (!confirmed) return;
                }

                await deleteSelectedEntriesAndSave({
                    selectFrom,
                    selectedUids,
                    loadWorldInfo,
                    deleteWorldInfoEntryRuntime,
                    saveWorldInfo,
                    wiHandlerApi,
                    listPanelApi,
                });
                break;
            }
        }
    };

    document.addEventListener('keydown', onDrawerKeydown);
    return ()=>document.removeEventListener('keydown', onDrawerKeydown);
};

const buildDrawerListContainer = ({
    dom,
    cache,
    Popup,
    wiHandlerApi,
    openEntryManager,
    getListPanelApi,
    getEditorPanelApi,
    getCurrentEditor,
})=>{
    const list = document.createElement('div');
    list.classList.add('stwid--list');

    dom.lorebooksTabContent = createLorebooksTabContent({
        dom,
        cache,
        getFreeWorldName,
        createNewWorldInfo,
        Popup,
        wiHandlerApi,
        getListPanelApi,
    });
    dom.foldersTabContent = createFoldersTabContent({
        dom,
        registerFolderName,
        Popup,
        getListPanelApi,
    });

    const { root: settingsTabRoot, setToggleVisible: setOrderToggleVisible } = createSettingsTabContent({
        dom,
        openEntryManager,
        getListPanelApi,
        getEditorPanelApi,
        getCurrentEditor,
    });
    dom.settingsTabContent = settingsTabRoot;
    dom.setOrderToggleVisible = setOrderToggleVisible;

    const controls = document.createElement('div');
    controls.classList.add('stwid--controls');
    dom.sortingRow = createSortingTabContent({ cache, getListPanelApi });
    controls.append(dom.sortingRow);
    list.append(controls);

    return list;
};

const buildDrawerEditorContainer = ({ dom, wiHandlerApi })=>{
    const editorPanel = document.createElement('div');
    editorPanel.classList.add('stwid--editor-panel');

    const mobileBackBtn = document.createElement('button');
    mobileBackBtn.classList.add('stwid--mobile-back-btn', 'menu_button');
    mobileBackBtn.type = 'button';
    const backIcon = document.createElement('i');
    backIcon.classList.add('fa-solid', 'fa-arrow-left');
    mobileBackBtn.append(backIcon, document.createTextNode(' Back to Books'));
    editorPanel.append(mobileBackBtn);

    const editor = document.createElement('div');
    dom.editor = editor;
    editor.classList.add('stwid--editor');
    editor.addEventListener('click', (evt)=>{
        const target = getEventTargetElement(evt);
        if (!target?.closest('.duplicate_entry_button')) return;
        wiHandlerApi.queueEditorDuplicateRefresh();
    }, true);
    editorPanel.append(editor);

    return { editorContainer: editorPanel, mobileBackBtn };
};

const buildAndAttachDrawerDom = ({
    dom,
    cache,
    activationBlock,
    activationBlockParent,
    wiHandlerApi,
    bookSourceLinksApi,
    getCurrentEditor,
    setCurrentEditor,
    getRequestHeaders,
    Popup,
    loadWorldInfo,
    saveWorldInfo,
    uuidv4,
    openEntryManager,
    refreshEntryManagerScope,
    enqueueEntryStateSave,
    deleteWorldInfoEntryRuntime,
    updateWIChangeRuntime,
    setListPanelApi,
    setEditorPanelApi,
    setSelectionState,
})=>{
    let restoreSplitterForCurrentLayout = ()=>{};
    const drawerContent = document.querySelector('#WorldInfo');
    const body = document.createElement('div');
    dom.drawer.body = body;
    body.classList.add('stwid--body');
    body.classList.add('stwid--state-loading');

    const list = buildDrawerListContainer({
        dom,
        cache,
        Popup,
        wiHandlerApi,
        openEntryManager,
        getListPanelApi: ()=>setListPanelApi.current,
        getEditorPanelApi: ()=>setEditorPanelApi.current,
        getCurrentEditor,
    });

    const { editorContainer, mobileBackBtn } = buildDrawerEditorContainer({ dom, wiHandlerApi });

    const editorPanelApi = initEditorPanel({
        dom,
        activationBlock,
        activationBlockParent,
        renderTemplateAsync,
        getWorldEntry,
        buildSavePayload: wiHandlerApi.buildSavePayload,
        cache,
        setCurrentEditor,
        getSelectFrom: ()=>setSelectionState.current?.selectFrom,
        selectEnd: ()=>setListPanelApi.current.selectEnd(),
    });
    setEditorPanelApi.current = editorPanelApi;

    mobileBackBtn.addEventListener('click', ()=>{
        if (dom.order.toggle?.classList?.contains(ENTRY_MANAGER_ACTIVE_CLASS)) {
            dom.order.toggle.click();
            return;
        }

        editorPanelApi.resetEditorState();
    });

    const listPanelApi = initBookBrowser({
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
    setListPanelApi.current = listPanelApi;

    bookSourceLinksApi.refreshBookSourceLinks('list_panel_init');

    const selectionState = listPanelApi.getSelectionState();
    setSelectionState.current = selectionState;
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

    restoreSplitterForCurrentLayout = initSplitter(body, list);
    body.append(editorContainer);
    drawerContent?.append(body);
    restoreSplitterForCurrentLayout();

    return {
        drawerContent,
        listPanelApi,
        editorPanelApi,
        selectionState,
        restoreSplitterForCurrentLayout,
    };
};

const installDrawerObservers = ({
    drawerContent,
    cache,
    getCurrentEditor,
    getEditorPanelApi,
    restoreSplitterForCurrentLayout,
    wiHandlerApi,
    onSelectObserverReady,
})=>{
    let moSel;
    let moDrawer;

    const moSelTarget = document.querySelector('#world_editor_select');
    if (moSelTarget) {
        moSel = new MutationObserver(()=>wiHandlerApi.updateWIChangeDebounced());
        moSel.observe(moSelTarget, { childList:true });
    }

    moDrawer = new MutationObserver(()=>{
        const drawerStyle = drawerContent.getAttribute(STYLE_ATTRIBUTE) ?? '';
        if (drawerStyle.includes('display: none;')) return;

        restoreSplitterForCurrentLayout();

        const currentEditor = getCurrentEditor();
        if (!currentEditor) return;

        const isDirty = Boolean(getEditorPanelApi()?.isDirty?.(currentEditor.name, currentEditor.uid));
        if (isDirty) {
            console.debug('[STWID] Drawer reopen: editor is dirty; skipping auto-restore click.');
            return;
        }

        if (cache[currentEditor.name]?.dom?.entry?.[currentEditor.uid]?.root) {
            cache[currentEditor.name].dom.entry[currentEditor.uid].root.click();
        }
    });
    moDrawer.observe(drawerContent, { attributes:true, attributeFilter:[STYLE_ATTRIBUTE] });

    onSelectObserverReady?.(moSel);
    return {
        moSel,
        moDrawer,
        cleanup: ()=>{
            moSel?.disconnect();
            moDrawer?.disconnect();
        },
    };
};

const mountDrawerUI = ({
    cache,
    dom,
    activationBlock,
    activationBlockParent,
    enqueueEntryStateSave,
    getCurrentEditor,
    setCurrentEditor,
    wiHandlerApi,
    bookSourceLinksApi,
    context,
    deleteWorldInfoEntryRuntime,
    updateWIChangeRuntime,
})=>{
    const listPanelApiRef = { current: undefined };
    const editorPanelApiRef = { current: undefined };
    const selectionStateRef = { current: undefined };

    const { Popup, SlashCommandParser, getRequestHeaders, loadWorldInfo, saveWorldInfo, uuidv4 } = context;
    const { openEntryManager, refreshEntryManagerScope } = initDrawerEntryManager({
        dom,
        cache,
        saveWorldInfo,
        wiHandlerApi,
        getListPanelApi: ()=>listPanelApiRef.current,
        getEditorPanelApi: ()=>editorPanelApiRef.current,
        getCurrentEditor,
        SlashCommandParser,
    });

    document.body.classList.add(DRAWER_ACTIVE_CLASS);
    const {
        drawerContent,
        listPanelApi,
        editorPanelApi,
        selectionState,
        restoreSplitterForCurrentLayout,
    } = buildAndAttachDrawerDom({
        dom,
        cache,
        activationBlock,
        activationBlockParent,
        wiHandlerApi,
        bookSourceLinksApi,
        getCurrentEditor,
        setCurrentEditor,
        getRequestHeaders,
        Popup,
        loadWorldInfo,
        saveWorldInfo,
        uuidv4,
        openEntryManager,
        refreshEntryManagerScope,
        enqueueEntryStateSave,
        deleteWorldInfoEntryRuntime,
        updateWIChangeRuntime,
        setListPanelApi: listPanelApiRef,
        setEditorPanelApi: editorPanelApiRef,
        setSelectionState: selectionStateRef,
    });

    const removeKeyboardShortcuts = installDrawerKeyboardShortcuts({
        cache,
        Popup,
        loadWorldInfo,
        saveWorldInfo,
        wiHandlerApi,
        listPanelApi,
        selectionState,
        deleteWorldInfoEntryRuntime,
    });

    const closeButton = drawerContent?.querySelector('h3 > span');
    if (closeButton) {
        closeButton.addEventListener('click', ()=>{
            const isDrawerActive = document.body.classList.toggle(DRAWER_ACTIVE_CLASS);
            if (!isDrawerActive && dom.activationToggle?.classList?.contains('stwid--state-active')) {
                dom.activationToggle.click();
            }
        });
    }

    const observerCleanup = installDrawerObservers({
        drawerContent,
        cache,
        getCurrentEditor,
        getEditorPanelApi: ()=>editorPanelApiRef.current,
        restoreSplitterForCurrentLayout,
        wiHandlerApi,
    });

    globalThis.addEventListener?.('beforeunload', ()=>{
        removeKeyboardShortcuts();
        observerCleanup.cleanup();
        editorPanelApiRef.current?.cleanup?.();
        wiHandlerApi.cleanup?.();
        bookSourceLinksApi.cleanup();
    }, { once:true });

    return {
        listPanelApi,
        editorPanelApi,
        selectionState,
    };
};

const buildDrawerApi = ({
    dom,
    editorPanelApi,
    listPanelApi,
    selectionState,
})=>({
    editorPanelApi,
    getActivationToggle: ()=>dom.activationToggle,
    setFolderControlsVisibility: (enabled)=>{
        const visible = Boolean(enabled);
        const folderControlsGroupEl = dom.folderControls.group;
        const addFolderButtonEl = dom.folderControls.add;
        [
            folderControlsGroupEl,
            addFolderButtonEl,
            dom.folderControls.import,
            dom.folderControls.collapseAll,
        ].forEach((el)=>setHiddenIfElement(el, !visible));
    },
    getListPanelApi: ()=>listPanelApi,
    getOrderToggle: ()=>dom.order.toggle,
    listPanelApi,
    selectionState,
});

export const initDrawer = ({
    cache,
    getCurrentEditor,
    setCurrentEditor,
    wiHandlerApi,
    bookSourceLinksApi,
})=>{
    const context = SillyTavern.getContext();
    const { saveWorldInfo } = context;
    const deleteWorldInfoEntryRuntime = (book, uid, options)=>deleteWorldInfoEntry(book, uid, options);
    const updateWIChangeRuntime = (bookName, bookData)=>wiHandlerApi.updateWIChange(bookName, bookData);

    const {
        dom,
        activationBlock,
        activationBlockParent,
        enqueueEntryStateSave,
    } = createDrawerRuntimeState({ saveWorldInfo, wiHandlerApi });

    const {
        listPanelApi,
        editorPanelApi,
        selectionState,
    } = mountDrawerUI({
        cache,
        dom,
        activationBlock,
        activationBlockParent,
        enqueueEntryStateSave,
        getCurrentEditor,
        setCurrentEditor,
        wiHandlerApi,
        bookSourceLinksApi,
        context,
        deleteWorldInfoEntryRuntime,
        updateWIChangeRuntime,
    });

    return buildDrawerApi({
        dom,
        editorPanelApi,
        listPanelApi,
        selectionState,
    });
};
