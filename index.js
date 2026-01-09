import { event_types, eventSource, getRequestHeaders } from '../../../../script.js';
import { extensionNames } from '../../../extensions.js';
import { Popup } from '../../../popup.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { renderTemplateAsync } from '../../../templates.js';
import { debounce, debounceAsync, delay, download, getSortableDelay, isTrueBoolean, uuidv4 } from '../../../utils.js';
import { createNewWorldInfo, createWorldInfoEntry, deleteWIOriginalDataValue, deleteWorldInfoEntry, getFreeWorldName, getWorldEntry, loadWorldInfo, onWorldInfoChange, saveWorldInfo, selected_world_info, world_names } from '../../../world-info.js';
import { Settings, SORT, SORT_DIRECTION } from './src/Settings.js';
import { initEditorPanel } from './src/editorPanel.js';
import { initListPanel, refreshList } from './src/listPanel.js';
import { initOrderHelper } from './src/orderHelper.js';
import { cloneMetadata, getSortFromMetadata, sortEntries } from './src/sortHelpers.js';
import { entryState, renderEntry, setWorldEntryContext } from './src/worldEntry.js';
import { appendSortOptions, getSortLabel, safeToSorted } from './src/utils.js';
import { fillEmptyTitlesWithKeywords, setWorldInfoSyncContext, updateSettingsChange, updateWIChange, updateWIChangeFinished, updateWIChangeStarted } from './src/worldInfoSync.js';

const NAME = new URL(import.meta.url).pathname.split('/').at(-2);
const watchCss = async()=>{
    if (new URL(import.meta.url).pathname.split('/').includes('reload')) return;
    try {
        const FilesPluginApi = (await import('../SillyTavern-FilesPluginApi/api.js')).FilesPluginApi;
        // watch CSS for changes
        const style = document.createElement('style');
        document.body.append(style);
        const path = [
            '~',
            'extensions',
            NAME,
            'style.css',
        ].join('/');
        const ev = await FilesPluginApi.watch(path);
        ev.addEventListener('message', async(/**@type {boolean}*/exists)=>{
            if (!exists) return;
            style.innerHTML = await (await FilesPluginApi.get(path)).text();
            document.querySelector(`#third-party_${NAME}-css`)?.remove();
        });
    } catch { /* empty */ }
};
watchCss();


const dom = {
    drawer: {
        /**@type {HTMLElement} */
        body: undefined,
    },
    /**@type {HTMLElement} */
    books: undefined,
    /**@type {HTMLElement} */
    editor: undefined,
    /**@type {HTMLButtonElement} */
    collapseAllToggle: undefined,
    /**@type {HTMLElement} */
    activationToggle: undefined,
    order: {
        /**@type {HTMLElement} */
        toggle: undefined,
        /**@type {HTMLInputElement} */
        start: undefined,
        /**@type {HTMLInputElement} */
        step: undefined,
        direction: {
            /**@type {HTMLInputElement} */
            up: undefined,
            /**@type {HTMLInputElement} */
            down: undefined,
        },
        filter: {
            /**@type {HTMLElement} */
            root: undefined,
            /**@type {HTMLElement} */
            preview: undefined,
        },
        /**@type {HTMLElement} */
        selectAll: undefined,
        /**@type {HTMLSelectElement} */
        sortSelect: undefined,
        /**@type {{[book:string]:{[uid:string]:HTMLElement}}} */
        entries: {},
        /**@type {HTMLElement} */
        tbody: undefined,
    },
};

const executeSlashCommand = async(command)=>{
    try {
        const parser = new SlashCommandParser();
        const closure = parser.parse(command);
        await closure.execute();
    } catch (error) {
        console.error('Failed to execute slash command', error);
    }
};

const getOutletPositionValue = () => document.querySelector('#entry_edit_template [name="position"] option[data-i18n="Outlet"]')?.value;
const isOutletPosition = (position) => {
    const outletValue = getOutletPositionValue();
    if (outletValue === undefined) return false;
    return String(position) === String(outletValue);
};
/**@type {{name:string, uid:string}} */
let currentEditor;

const activationBlock = document.querySelector('#wiActivationSettings');
const activationBlockParent = activationBlock?.parentElement;

const cache = {};
let listPanelApi;
let selectionState;
let editorPanelApi;
setWorldInfoSyncContext({
    cache,
    dom,
    getListPanelApi: () => listPanelApi,
    getEditorPanelApi: () => editorPanelApi,
    getCurrentEditor: () => currentEditor,
    setCurrentEditor: (value) => {
        currentEditor = value;
    },
});

const METADATA_NAMESPACE = 'stwid';
const METADATA_SORT_KEY = 'sort';
const buildSavePayload = (name)=>({
    entries: structuredClone(cache[name].entries),
    metadata: cloneMetadata(cache[name].metadata),
});
const updateWIChangeDebounced = debounce(updateWIChange);

eventSource.on(event_types.WORLDINFO_UPDATED, (name, world)=>updateWIChangeDebounced(name, world));
eventSource.on(event_types.WORLDINFO_SETTINGS_UPDATED, ()=>updateSettingsChange());


export const jumpToEntry = async(name, uid)=>{
    if (dom.activationToggle.classList.contains('stwid--active')) {
        dom.activationToggle.click();
    }
    if (dom.order.toggle.classList.contains('stwid--active')) {
        dom.order.toggle.click();
    }
    listPanelApi.setBookCollapsed(name, false);
    cache[name].dom.entry[uid].root.scrollIntoView({ block:'center', inline:'center' });
    if (currentEditor?.name != name || currentEditor?.uid != uid) {
        cache[name].dom.entry[uid].root.click();
    }
};






const addDrawer = ()=>{
    const { openOrderHelper } = initOrderHelper({
        dom,
        cache,
        SORT,
        SORT_DIRECTION,
        sortEntries,
        appendSortOptions,
        saveWorldInfo,
        buildSavePayload,
        getSelectedWorldInfo: () => selected_world_info,
        getListPanelApi: () => listPanelApi,
        getEditorPanelApi: () => editorPanelApi,
        debounce,
        isTrueBoolean,
        SlashCommandParser,
        getSortableDelay,
        entryState,
        isOutletPosition,
        hljs,
        $,
    });
    document.addEventListener('keydown', async(evt)=>{
        // only run when drawer is open
        if (document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2).closest('.stwid--body')) {
            // abort if no active selection
            if (selectionState.selectFrom === null || !selectionState.selectList?.length) return;
            console.log('[STWID]', evt.key);
            switch (evt.key) {
                case 'Delete': {
                    evt.preventDefault();
                    evt.stopPropagation();
                    const srcBook = await loadWorldInfo(selectionState.selectFrom);
                    for (const srcEntry of selectionState.selectList) {
                        const uid = srcEntry.uid;
                        const deleted = await deleteWorldInfoEntry(srcBook, uid, { silent:true });
                        if (deleted) {
                            deleteWIOriginalDataValue(srcBook, uid);
                        }
                    }
                    await saveWorldInfo(selectionState.selectFrom, srcBook, true);
                    updateWIChange(selectionState.selectFrom, srcBook);
                    listPanelApi.selectEnd();
                    break;
                }
            }
        }
    });
    document.body.classList.add('stwid--');
    const drawerContent = document.querySelector('#WorldInfo'); {
        const SPLITTER_STORAGE_KEY = 'stwid--list-width';
        const MIN_LIST_WIDTH = 150;
        const MIN_EDITOR_WIDTH = 300;
        const body = document.createElement('div'); {
            dom.drawer.body = body;
            body.classList.add('stwid--body');
            body.classList.add('stwid--isLoading');
            const list = document.createElement('div'); {
                list.classList.add('stwid--list');
                    const controls = document.createElement('div'); {
                        controls.classList.add('stwid--controls');
                        const controlsPrimary = document.createElement('div');
                        controlsPrimary.classList.add('stwid--controlsRow');
                        const add = /**@type {HTMLElement}*/(document.querySelector('#world_create_button').cloneNode(true)); {
                            add.removeAttribute('id');
                            add.classList.add('stwid--addBook');
                            add.title = 'Create New Book';
                            add.querySelector('span')?.remove();
                            add.addEventListener('click', async()=>{
                                const startPromise = updateWIChangeStarted.promise;
                                const tempName = getFreeWorldName();
                                const finalName = await Popup.show.input('Create a new World Info', 'Enter a name for the new file:', tempName);
                                if (finalName) {
                                const created = await createNewWorldInfo(finalName, { interactive: true });
                                if (created) {
                                    await startPromise;
                                    await updateWIChangeFinished.promise;
                                    listPanelApi.setBookCollapsed(finalName, false);
                                    cache[finalName].dom.root.scrollIntoView({ block:'center', inline:'center' });
                                }
                            }
                        });
                        controlsPrimary.append(add);
                    }
                    const imp = document.createElement('div'); {
                        imp.classList.add('menu_button');
                        imp.classList.add('fa-solid', 'fa-fw', 'fa-file-import');
                        imp.title = 'Import Book';
                        imp.addEventListener('click', ()=>{
                            /**@type {HTMLInputElement}*/(document.querySelector('#world_import_file')).click();
                        });
                        controlsPrimary.append(imp);
                    }
                    const refresh = document.createElement('div'); {
                        refresh.classList.add('menu_button');
                        refresh.classList.add('fa-solid', 'fa-fw', 'fa-arrows-rotate');
                        refresh.title = 'Refresh';
                        refresh.addEventListener('click', async()=>{
                            await refreshList();
                        });
                        controlsPrimary.append(refresh);
                    }
                    const settings = document.createElement('div'); {
            dom.activationToggle = settings;
            settings.classList.add('stwid--activation');
            settings.classList.add('menu_button');
            settings.classList.add('fa-solid', 'fa-fw', 'fa-cog');
            settings.title = 'Global Activation Settings';
            settings.addEventListener('click', ()=>{
                editorPanelApi.toggleActivationSettings();
            });
            controlsPrimary.append(settings);
        }
                    const order = document.createElement('div'); {
                        dom.order.toggle = order;
                        order.classList.add('menu_button');
                        order.classList.add('fa-solid', 'fa-fw', 'fa-arrow-down-wide-short');
                        order.title = 'Order Helper\n---\nUse drag and drop to help assign an "Order" value to entries of all active books.';
                        order.addEventListener('click', ()=>{
                            const isActive = order.classList.contains('stwid--active');
                            if (isActive) {
                                order.classList.remove('stwid--active');
                                editorPanelApi.clearEditor();
                                return;
                            }
                            openOrderHelper();
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
                        controlsPrimary.append(collapseAllToggle);
                    }
                    const controlsSecondary = document.createElement('div');
                    controlsSecondary.classList.add('stwid--controlsRow', 'stwid--orderControls');
                    const sortSel = document.createElement('select'); {
                        sortSel.classList.add('text_pole');
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
                        controlsSecondary.append(sortSel);
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
                            bookSortToggle.classList.toggle('stwid--active', enabled);
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
                        controlsSecondary.append(bookSortToggle);
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
                        controlsSecondary.append(clearBookSorts);
                    }
                    controls.append(controlsPrimary, controlsSecondary);
                    list.append(controls);
                }
                editorPanelApi = initEditorPanel({
                    dom,
                    activationBlock,
                    activationBlockParent,
                    renderTemplateAsync,
                    getWorldEntry,
                    cache,
                    setCurrentEditor: (value) => {
                        currentEditor = value;
                    },
                    getSelectFrom: () => selectionState?.selectFrom,
                    selectEnd: () => listPanelApi.selectEnd(),
                });
                listPanelApi = initListPanel({
                    Settings,
                    METADATA_NAMESPACE,
                    METADATA_SORT_KEY,
                    appendSortOptions,
                    buildSavePayload,
                    cache,
                    debounce,
                    debounceAsync,
                    deleteWIOriginalDataValue,
                    deleteWorldInfoEntry,
                    delay,
                    dom,
                    download,
                    executeSlashCommand,
                    extensionNames,
                    fillEmptyTitlesWithKeywords,
                    getRequestHeaders,
                    getSortFromMetadata,
                    getSortLabel,
                    list,
                    loadWorldInfo,
                    onWorldInfoChange,
                    openOrderHelper,
                    renderEntry,
                    resetEditor: ()=>{
                        editorPanelApi.clearEditor();
                    },
                    safeToSorted,
                    saveWorldInfo,
                    getSelectedWorldInfo: () => selected_world_info,
                    sortEntries,
                    updateWIChange,
                    world_names,
                    createNewWorldInfo,
                    createWorldInfoEntry,
                    getFreeWorldName,
                });
                selectionState = listPanelApi.getSelectionState();
                setWorldEntryContext({
                    buildSavePayload,
                    cache,
                    dom,
                    getWorldEntry,
                    renderTemplateAsync,
                    saveWorldInfo,
                    selectAdd: listPanelApi.selectAdd,
                    selectEnd: listPanelApi.selectEnd,
                    selectRemove: listPanelApi.selectRemove,
                    uuidv4,
                    editorPanel: editorPanelApi,
                    get currentEditor() {
                        return currentEditor;
                    },
                    set currentEditor(value) {
                        currentEditor = value;
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
                body.append(list);
            }
            const splitter = document.createElement('div'); {
                splitter.classList.add('stwid--splitter');
                body.append(splitter);
                const applyListWidth = (value)=>{
                    const clamped = Math.max(MIN_LIST_WIDTH, value);
                    list.style.flexBasis = `${clamped}px`;
                    list.style.width = `${clamped}px`;
                };
                const storedWidth = Number.parseInt(localStorage.getItem(SPLITTER_STORAGE_KEY) ?? '', 10);
                if (!Number.isNaN(storedWidth)) {
                    applyListWidth(storedWidth);
                }
                splitter.addEventListener('pointerdown', (evt)=>{
                    evt.preventDefault();
                    splitter.setPointerCapture(evt.pointerId);
                    const startX = evt.clientX;
                    const startWidth = list.getBoundingClientRect().width;
                    const splitterWidth = splitter.getBoundingClientRect().width || 6;
                    const onMove = (moveEvt)=>{
                        const delta = moveEvt.clientX - startX;
                        const maxWidth = Math.max(MIN_LIST_WIDTH, body.clientWidth - splitterWidth - MIN_EDITOR_WIDTH);
                        const nextWidth = Math.min(Math.max(MIN_LIST_WIDTH, startWidth + delta), maxWidth);
                        applyListWidth(nextWidth);
                    };
                    const onUp = (upEvt)=>{
                        splitter.releasePointerCapture(upEvt.pointerId);
                        window.removeEventListener('pointermove', onMove);
                        window.removeEventListener('pointerup', onUp);
                        const finalWidth = Math.round(list.getBoundingClientRect().width);
                        localStorage.setItem(SPLITTER_STORAGE_KEY, String(finalWidth));
                    };
                    window.addEventListener('pointermove', onMove);
                    window.addEventListener('pointerup', onUp);
                });
            }
            const editor = document.createElement('div'); {
                dom.editor = editor;
                editor.classList.add('stwid--editor');
                body.append(editor);
            }
            drawerContent.append(body);
        }
    }
    drawerContent.querySelector('h3 > span').addEventListener('click', ()=>{
        const is = document.body.classList.toggle('stwid--');
        if (!is) {
            if (dom.activationToggle.classList.contains('stwid--active')) {
                dom.activationToggle.click();
            }
        }
    });
    const moSel = new MutationObserver(()=>updateWIChangeDebounced());
    moSel.observe(document.querySelector('#world_editor_select'), { childList: true });
    const moDrawer = new MutationObserver(evt=>{
        if (drawerContent.getAttribute('style').includes('display: none;')) return;
        if (currentEditor) {
            cache[currentEditor.name].dom.entry[currentEditor.uid].root.click();
        }
    });
    moDrawer.observe(drawerContent, { attributes:true, attributeFilter:['style'] });
};
addDrawer();
refreshList();


let isDiscord;
const checkDiscord = async()=>{
    let newIsDiscord = window.getComputedStyle(document.body).getPropertyValue('--nav-bar-width') !== '';
    if (isDiscord != newIsDiscord) {
        isDiscord = newIsDiscord;
        document.body.classList[isDiscord ? 'remove' : 'add']('stwid--nonDiscord');
    }
    setTimeout(()=>checkDiscord(), 1000);
};
checkDiscord();
