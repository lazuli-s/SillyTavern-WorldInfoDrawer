import { getRequestHeaders } from '../../../../../script.js';
import { extensionNames } from '../../../../extensions.js';
import { Popup } from '../../../../popup.js';
import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { renderTemplateAsync } from '../../../../templates.js';
import { debounce, debounceAsync, delay, download, getSortableDelay, isTrueBoolean, uuidv4 } from '../../../../utils.js';
import { createNewWorldInfo, createWorldInfoEntry, deleteWIOriginalDataValue, deleteWorldInfo, deleteWorldInfoEntry, getFreeWorldName, getWorldEntry, loadWorldInfo, onWorldInfoChange, saveWorldInfo, selected_world_info, world_names } from '../../../../world-info.js';
import { Settings, SORT, SORT_DIRECTION } from './Settings.js';
import { initEditorPanel } from './editorPanel.js';
import { initListPanel } from './listPanel.js';
import { registerFolderName } from './lorebookFolders.js';
import { initOrderHelper } from './orderHelper.js';
import { METADATA_NAMESPACE, METADATA_SORT_KEY, getSortFromMetadata, sortEntries } from './sortHelpers.js';
import { entryState, renderEntry, setWorldEntryContext } from './worldEntry.js';
import { appendSortOptions, executeSlashCommand, getSortLabel, isOutletPosition, safeToSorted } from './utils.js';

export const initDrawer = ({
    cache,
    getCurrentEditor,
    setCurrentEditor,
    wiHandlerApi,
    bookSourceLinksApi,
})=>{
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
        /**@type {HTMLButtonElement} */
        collapseAllFoldersToggle: undefined,
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

    const activationBlock = document.querySelector('#wiActivationSettings');
    const activationBlockParent = activationBlock?.parentElement;

    let listPanelApi;
    let selectionState;
    let editorPanelApi;

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
            // only run when drawer is open
            const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
            if (!centerEl?.closest?.('.stwid--body')) return;

            // Prevent global Delete from firing while the user is typing/editing.
            // This avoids accidental deletion when focus is in any input/textarea/select/contenteditable.
            const target = /** @type {HTMLElement|null} */ (evt.target instanceof HTMLElement ? evt.target : null);
            const isTextEditing = Boolean(
                target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]'),
            );
            if (isTextEditing) return;

            // abort if no active selection
            if (selectionState.selectFrom === null || !selectionState.selectList?.length) return;

            console.log('[STWID]', evt.key);
            switch (evt.key) {
                case 'Delete': {
                    evt.preventDefault();
                    evt.stopPropagation();

                    // Snapshot selection at keypress time so changes during async operations
                    // can't affect which book/uids are deleted.
                    const selectFrom = selectionState.selectFrom;
                    const selectedUids = [...(selectionState.selectList ?? [])];
                    if (selectFrom === null || !selectedUids.length) return;

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

        // Best-effort cleanup: if ST tears down/reloads extensions, remove global listeners.
        globalThis.addEventListener?.('beforeunload', ()=>{
            document.removeEventListener('keydown', onDrawerKeydown);
            bookSourceLinksApi.cleanup();
        }, { once:true });

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
                            add.setAttribute('aria-label', 'Create New Book');
                            add.querySelector('span')?.remove();
                            add.addEventListener('click', async()=>{
                                const tempName = getFreeWorldName();
                                const finalName = await Popup.show.input('Create a new World Info', 'Enter a name for the new file:', tempName);
                                if (!finalName) return;

                                // Register the wait BEFORE creating the book so we can't miss the next update cycle.
                                const waitForUpdate = wiHandlerApi.waitForWorldInfoUpdate();
                                const created = await createNewWorldInfo(finalName, { interactive: true });
                                if (!created) return;

                                await waitForUpdate;
                                await wiHandlerApi.getUpdateWIChangeFinished()?.promise;

                                // Expand and center the new book once it exists in cache/DOM.
                                listPanelApi.setBookCollapsed(finalName, false);

                                if (!cache[finalName]?.dom?.root) {
                                    console.warn('[STWID] New book created but not yet present in cache/DOM; forcing refresh.', finalName);
                                    await listPanelApi.refreshList();
                                }

                                cache[finalName]?.dom?.root?.scrollIntoView({ block:'center', inline:'center' });
                            });
                            controlsPrimary.append(add);
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
                            controlsPrimary.append(addFolder);
                        }
                        const imp = document.createElement('div'); {
                            imp.classList.add('menu_button');
                            imp.classList.add('fa-solid', 'fa-fw', 'fa-file-import');
                            imp.title = 'Import Book';
                            imp.setAttribute('aria-label', 'Import Book');
                            imp.addEventListener('click', ()=>{
                                /**@type {HTMLInputElement}*/(document.querySelector('#world_import_file')).click();
                            });
                            controlsPrimary.append(imp);
                        }
                        const impFolder = document.createElement('div'); {
                            impFolder.classList.add('menu_button');
                            impFolder.classList.add('fa-solid', 'fa-fw', 'fa-folder-open');
                            impFolder.title = 'Import Folder';
                            impFolder.setAttribute('aria-label', 'Import Folder');
                            impFolder.addEventListener('click', ()=>{
                                listPanelApi?.openFolderImportDialog?.();
                            });
                            controlsPrimary.append(impFolder);
                        }
                        const refresh = document.createElement('div'); {
                            refresh.classList.add('menu_button');
                            refresh.classList.add('fa-solid', 'fa-fw', 'fa-arrows-rotate');
                            refresh.title = 'Refresh';
                            refresh.setAttribute('aria-label', 'Refresh');
                            refresh.addEventListener('click', async()=>{
                                await listPanelApi.refreshList();
                            });
                            controlsPrimary.append(refresh);
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

                                // Only guard the "open" direction. Closing activation settings doesn't discard entry edits
                                // because opening it already clears the entry editor (which this guard prevents while dirty).
                                if (isDirty && !settings.classList.contains('stwid--active')) {
                                    toastr.warning('Unsaved edits detected. Save or discard changes before opening Activation Settings.');
                                    return;
                                }

                                editorPanelApi.toggleActivationSettings();
                            });
                            controlsPrimary.append(settings);
                        }
                        const order = document.createElement('div'); {
                            dom.order.toggle = order;
                            order.classList.add('menu_button');
                            order.classList.add('fa-solid', 'fa-fw', 'fa-arrow-down-wide-short');
                            order.title = 'Open Order Helper (Book Visibility scope)';
                            order.setAttribute('aria-label', 'Open Order Helper for current Book Visibility scope');
                            order.addEventListener('click', ()=>{
                                const isActive = order.classList.contains('stwid--active');

                                const currentEditor = getCurrentEditor();
                                const isDirty = Boolean(
                                    currentEditor && editorPanelApi?.isDirty?.(currentEditor.name, currentEditor.uid),
                                );

                                // Guard the open direction: don't allow a mode switch that clears/replaces the editor
                                // while the current entry has unsaved edits.
                                if (!isActive && isDirty) {
                                    toastr.warning('Unsaved edits detected. Save or discard changes before opening Order Helper.');
                                    return;
                                }

                                if (isActive) {
                                    // Defensive: if an upstream flow left dirty state set, avoid clearing the editor.
                                    if (isDirty) {
                                        toastr.warning('Unsaved edits detected. Save or discard changes before closing Order Helper.');
                                        return;
                                    }

                                    order.classList.remove('stwid--active');
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
                            controlsPrimary.append(collapseAllToggle);
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
                            controlsPrimary.append(collapseAllFoldersToggle);
                        }
                        const controlsSecondary = document.createElement('div');
                        controlsSecondary.classList.add('stwid--controlsRow', 'stwid--orderControls');
                        const sortSel = document.createElement('select'); {
                            sortSel.classList.add('text_pole');
                            sortSel.title = 'Global entry sort for the list panel';
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
                        buildSavePayload: wiHandlerApi.buildSavePayload,
                        cache,
                        setCurrentEditor,
                        getSelectFrom: ()=>selectionState?.selectFrom,
                        selectEnd: ()=>listPanelApi.selectEnd(),
                    });
                    listPanelApi = initListPanel({
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
                        deleteWorldInfoEntry,
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
                        updateWIChange: wiHandlerApi.updateWIChange,
                        waitForWorldInfoUpdate: wiHandlerApi.waitForWorldInfoUpdate,
                        world_names,
                        createNewWorldInfo,
                        createWorldInfoEntry,
                        getFreeWorldName,
                    });
                    bookSourceLinksApi.refreshBookSourceLinks('list_panel_init');
                    selectionState = listPanelApi.getSelectionState();
                    setWorldEntryContext({
                        buildSavePayload: wiHandlerApi.buildSavePayload,
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
                const splitter = document.createElement('div'); {
                    splitter.classList.add('stwid--splitter');
                    body.append(splitter);
                    let appliedListWidth = MIN_LIST_WIDTH;
                    const applyListWidth = (value)=>{
                        const clamped = Math.max(MIN_LIST_WIDTH, value);
                        const width = `${clamped}px`;
                        if (clamped === appliedListWidth && list.style.flexBasis === width && list.style.width === width) return clamped;
                        if (list.style.flexBasis !== width) list.style.flexBasis = width;
                        if (list.style.width !== width) list.style.width = width;
                        return clamped;
                    };
                    const storedWidth = Number.parseInt(localStorage.getItem(SPLITTER_STORAGE_KEY) ?? '', 10);
                    if (!Number.isNaN(storedWidth)) {
                        appliedListWidth = applyListWidth(storedWidth);
                    }
                    splitter.addEventListener('pointerdown', (evt)=>{
                        evt.preventDefault();
                        splitter.setPointerCapture(evt.pointerId);
                        const startX = evt.clientX;
                        const startWidth = list.getBoundingClientRect().width;
                        appliedListWidth = startWidth;
                        const splitterWidth = splitter.getBoundingClientRect().width || 6;
                        const bodyWidth = body.getBoundingClientRect().width;
                        const maxWidth = Math.max(MIN_LIST_WIDTH, bodyWidth - splitterWidth - MIN_EDITOR_WIDTH);
                        let pendingWidth = startWidth;
                        let rafId = null;
                        const queueWidthApply = (value)=>{
                            pendingWidth = value;
                            if (rafId !== null) return;
                            rafId = requestAnimationFrame(()=>{
                                rafId = null;
                                appliedListWidth = applyListWidth(pendingWidth);
                            });
                        };
                        const onMove = (moveEvt)=>{
                            const delta = moveEvt.clientX - startX;
                            const nextWidth = Math.min(Math.max(MIN_LIST_WIDTH, startWidth + delta), maxWidth);
                            queueWidthApply(nextWidth);
                        };

                        const cleanupDrag = (endEvt)=>{
                            try {
                                splitter.releasePointerCapture(endEvt.pointerId);
                            } catch {
                                // ignore (capture may already be released/canceled)
                            }

                            window.removeEventListener('pointermove', onMove);
                            window.removeEventListener('pointerup', onUp);
                            window.removeEventListener('pointercancel', onCancel);
                            splitter.removeEventListener('lostpointercapture', onLostCapture);

                            if (rafId !== null) {
                                cancelAnimationFrame(rafId);
                                rafId = null;
                                appliedListWidth = applyListWidth(pendingWidth);
                            }

                            localStorage.setItem(SPLITTER_STORAGE_KEY, String(Math.round(appliedListWidth)));
                        };

                        const onUp = (upEvt)=>cleanupDrag(upEvt);
                        const onCancel = (cancelEvt)=>cleanupDrag(cancelEvt);
                        const onLostCapture = (lostEvt)=>cleanupDrag(lostEvt);

                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp);
                        window.addEventListener('pointercancel', onCancel);
                        splitter.addEventListener('lostpointercapture', onLostCapture);
                    });
                }
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
            }
        }
        const closeButton = drawerContent.querySelector('h3 > span');
        if (closeButton) {
            closeButton.addEventListener('click', ()=>{
                const is = document.body.classList.toggle('stwid--');
                if (!is) {
                    if (dom.activationToggle?.classList?.contains('stwid--active')) {
                        dom.activationToggle.click();
                    }
                }
            });
        }

        const moSelTarget = document.querySelector('#world_editor_select');
        if (moSelTarget) {
            const moSel = new MutationObserver(()=>wiHandlerApi.updateWIChangeDebounced());
            moSel.observe(moSelTarget, { childList:true });
        }

        const moDrawer = new MutationObserver(()=>{
            const style = drawerContent.getAttribute('style') ?? '';
            if (style.includes('display: none;')) return;

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
