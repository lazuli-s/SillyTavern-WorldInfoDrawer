import { debounce, delay } from '../../../../../utils.js';
import { loadWorldInfo, saveWorldInfo, selected_world_info, world_names } from '../../../../../world-info.js';
import { Settings } from './settings.js';
import { refreshList } from '../book-browser/book-browser.js';
import { cloneMetadata, getSortFromMetadata, sortEntries } from './sort-helpers.js';
import { entryState, renderEntry } from '../book-browser/book-list/book-list.world-entry.js';
import { createDeferred } from './utils.js';

const LOG_PREFIX = '[STWID]';
const EDITOR_ROOT_SELECTOR = '.stwid--editor';
const EDITOR_DUPLICATE_REFRESH_TIMEOUT_MS = 15000;

const maybeTriggerEditorRefreshForField = ({ isCurrentEditor, selector, expectedValue, triggerEditorRefreshOnce }) => {
    if (!isCurrentEditor) return;
    const editorFieldInput = document.querySelector(selector);
    if (!editorFieldInput || editorFieldInput.value != expectedValue) {
        triggerEditorRefreshOnce();
    }
};

const removeStaleCachedBooks = ({ cache, worldNames }) => {
    for (const [worldName, cachedWorld] of Object.entries(cache)) {
        if (worldNames.includes(worldName)) continue;
        cachedWorld.dom.root.remove();
        delete cache[worldName];
    }
};

const renderMissingBooks = async ({ cache, worldNames, loadWorldInfo, listPanelApi }) => {
    for (const worldName of worldNames) {
        if (cache[worldName]) continue;
        const before = Object.keys(cache).find((it) => it.toLowerCase().localeCompare(worldName.toLowerCase()) == 1);
        const worldData = await loadWorldInfo(worldName);
        await listPanelApi.renderBook(worldName, before ? cache[before].dom.root : null, worldData);
    }
};

const applyEntryFieldDiff = ({ bookName, entryUid, oldEntry, updatedEntry, cache, editorPanelApi, isCurrentEditor, triggerEditorRefreshOnce, shouldRefreshEditor }) => {
    let hasChange = false;
    const currentEntryIsOpen = isCurrentEditor(bookName, entryUid);
    for (const fieldName of new Set([...Object.keys(oldEntry), ...Object.keys(updatedEntry)])) {
        const oldValue = oldEntry[fieldName];
        const newValue = updatedEntry[fieldName];
        if (oldValue == newValue) continue;
        if (typeof oldValue == 'object' && JSON.stringify(oldValue) == JSON.stringify(newValue)) continue;

        hasChange = true;
        switch (fieldName) {
            case 'content': {
                maybeTriggerEditorRefreshForField({
                    isCurrentEditor: currentEntryIsOpen,
                    selector: `${EDITOR_ROOT_SELECTOR} [name="content"]`,
                    expectedValue: updatedEntry.content,
                    triggerEditorRefreshOnce,
                });
                break;
            }
            case 'comment': {
                maybeTriggerEditorRefreshForField({
                    isCurrentEditor: currentEntryIsOpen,
                    selector: `${EDITOR_ROOT_SELECTOR} [name="comment"]`,
                    expectedValue: updatedEntry.comment,
                    triggerEditorRefreshOnce,
                });
                cache[bookName].dom.entry[entryUid].comment.textContent = updatedEntry.comment;
                break;
            }
            case 'key': {
                maybeTriggerEditorRefreshForField({
                    isCurrentEditor: hasChange && currentEntryIsOpen,
                    selector: `${EDITOR_ROOT_SELECTOR} textarea[name="${fieldName}"]`,
                    expectedValue: updatedEntry[fieldName].join(', '),
                    triggerEditorRefreshOnce,
                });
                cache[bookName].dom.entry[entryUid].key.textContent = updatedEntry.key.join(', ');
                break;
            }
            case 'disable': {
                if (hasChange && currentEntryIsOpen) {
                    triggerEditorRefreshOnce();
                }
                cache[bookName].dom.entry[entryUid].isEnabled.classList[newValue ? 'remove' : 'add']('fa-toggle-on');
                cache[bookName].dom.entry[entryUid].isEnabled.classList[newValue ? 'add' : 'remove']('fa-toggle-off');
                break;
            }
            case 'constant':
            case 'vectorized': {
                if (hasChange && currentEntryIsOpen) {
                    triggerEditorRefreshOnce();
                }
                cache[bookName].dom.entry[entryUid].strategy.value = entryState(updatedEntry);
                break;
            }
            default: {
                maybeTriggerEditorRefreshForField({
                    isCurrentEditor: hasChange && currentEntryIsOpen,
                    selector: `${EDITOR_ROOT_SELECTOR} [name="${fieldName}"]`,
                    expectedValue: updatedEntry[fieldName],
                    triggerEditorRefreshOnce,
                });
                break;
            }
        }
    }

    if (!currentEntryIsOpen) {
        return hasChange;
    }

    if (shouldRefreshEditor()) {
        cache[bookName].dom.entry[entryUid].root.click();
    } else if (editorPanelApi) {
        editorPanelApi.markClean(bookName, entryUid);
    }

    return hasChange;
};

const syncBookEntriesAndDom = async ({
    bookName,
    cache,
    data,
    listPanelApi,
    editorPanelApi,
    getCurrentEditor,
    setCurrentEditor,
    shouldAutoRefreshEditor,
}) => {
    const isCurrentEditor = (entryUid) => {
        const currentEditor = getCurrentEditor();
        return currentEditor?.name == bookName && currentEditor?.uid == entryUid;
    };
    const world = { entries: {}, metadata: cloneMetadata(data.metadata) };
    const updatedSort = getSortFromMetadata(world.metadata) ?? cache[bookName].sort;
    const sortChoice = {
        sort: updatedSort?.sort ?? Settings.instance.sortLogic,
        direction: updatedSort?.direction ?? Settings.instance.sortDirection,
    };

    for (const [entryUid, entryData] of Object.entries(data.entries)) {
        world.entries[entryUid] = structuredClone(entryData);
    }

    const updatedExtras = structuredClone(data ?? {});
    delete updatedExtras.entries;
    delete updatedExtras.metadata;
    cache[bookName].extras = updatedExtras;

    for (const entryUid of Object.keys(cache[bookName].entries)) {
        if (world.entries[entryUid]) continue;
        cache[bookName].dom.entry[entryUid].root.remove();
        delete cache[bookName].dom.entry[entryUid];
        delete cache[bookName].entries[entryUid];
        if (!isCurrentEditor(entryUid)) continue;
        if (editorPanelApi) {
            editorPanelApi.clearEditor();
        } else {
            setCurrentEditor(null);
        }
    }

    const alreadyAdded = [];
    for (const entryUid of Object.keys(world.entries)) {
        if (cache[bookName].entries[entryUid]) continue;
        const entryToInsert = world.entries[entryUid];
        const sorted = sortEntries([...Object.values(cache[bookName].entries), ...alreadyAdded, entryToInsert], sortChoice.sort, sortChoice.direction);
        const before = sorted.find((it, idx) => idx > sorted.indexOf(entryToInsert));
        await renderEntry(entryToInsert, bookName, before ? cache[bookName].dom.entry[before.uid].root : null);
        alreadyAdded.push(entryToInsert);
    }

    let hasUpdate = false;
    for (const [entryUid, cachedEntry] of Object.entries(cache[bookName].entries)) {
        const updatedEntry = world.entries[entryUid];
        let needsEditorRefresh = false;
        const triggerEditorRefreshOnce = () => {
            if (needsEditorRefresh) return true;
            if (!shouldAutoRefreshEditor(bookName, entryUid)) return false;
            needsEditorRefresh = true;
            return true;
        };

        const entryHasChange = applyEntryFieldDiff({
            bookName,
            entryUid,
            oldEntry: cachedEntry,
            updatedEntry,
            cache,
            editorPanelApi,
            isCurrentEditor: (_, currentEntryUid) => isCurrentEditor(currentEntryUid),
            triggerEditorRefreshOnce,
            shouldRefreshEditor: () => needsEditorRefresh,
        });

        if (entryHasChange) {
            hasUpdate = true;
        }
    }

    cache[bookName].entries = world.entries;
    const prevSort = cache[bookName].sort;
    listPanelApi.setCacheMetadata(bookName, world.metadata);
    const sortChanged = JSON.stringify(prevSort) !== JSON.stringify(cache[bookName].sort);
    if (hasUpdate || sortChanged) {
        listPanelApi.sortEntriesIfNeeded(bookName);
    }
};

const createWorldInfoUpdateWaiter = ({ delay, getUpdateWIChangeToken, isUpdateInProgress, getUpdateStarted, getUpdateFinished }) => {
    const waitForWorldInfoUpdate = async () => {
        const tokenAtCall = getUpdateWIChangeToken();

        while (getUpdateWIChangeToken() === tokenAtCall) {
            if (isUpdateInProgress()) {
                await getUpdateFinished()?.promise;
                continue;
            }
            await getUpdateStarted().promise;
        }

        await getUpdateFinished()?.promise;
        return true;
    };

    const waitForWorldInfoUpdateWithTimeout = async (waitPromise, timeoutMs = EDITOR_DUPLICATE_REFRESH_TIMEOUT_MS) => {
        const result = await Promise.race([
            waitPromise.then(() => true),
            delay(timeoutMs).then(() => false),
        ]);
        return result;
    };

    return {
        waitForWorldInfoUpdate,
        waitForWorldInfoUpdateWithTimeout,
    };
};

const createEditorDuplicateRefreshWorker = ({
    getCurrentEditor,
    refreshList,
    reopenEditorEntry,
    waitForWorldInfoUpdate,
    waitForWorldInfoUpdateWithTimeout,
}) => {
    const editorDuplicateRefreshQueue = [];
    let isEditorDuplicateRefreshWorkerRunning = false;

    const runEditorDuplicateRefreshWorker = async () => {
        if (isEditorDuplicateRefreshWorkerRunning) return;
        isEditorDuplicateRefreshWorkerRunning = true;
        try {
            while (editorDuplicateRefreshQueue.length > 0) {
                const waitPromise = editorDuplicateRefreshQueue.shift();
                const hasUpdate = await waitForWorldInfoUpdateWithTimeout(waitPromise);
                if (!hasUpdate) continue;

                const currentEditor = getCurrentEditor();
                const reopenTarget = currentEditor ? { ...currentEditor } : null;
                await refreshList();
                reopenEditorEntry(reopenTarget);
            }
        } finally {
            isEditorDuplicateRefreshWorkerRunning = false;
        }
    };

    const queueEditorDuplicateRefresh = () => {
        editorDuplicateRefreshQueue.push(waitForWorldInfoUpdate());
        void runEditorDuplicateRefreshWorker();
    };

    return { queueEditorDuplicateRefresh };
};

const registerWorldInfoListeners = ({ eventBus, eventTypes, onWorldInfoUpdated, onWorldInfoSettingsUpdated }) => {
    if (!eventBus || !eventTypes) {
        return () => {};
    }

    eventBus.on(eventTypes.WORLDINFO_UPDATED, onWorldInfoUpdated);
    eventBus.on(eventTypes.WORLDINFO_SETTINGS_UPDATED, onWorldInfoSettingsUpdated);

    return () => {
        eventBus.removeListener(eventTypes.WORLDINFO_UPDATED, onWorldInfoUpdated);
        eventBus.removeListener(eventTypes.WORLDINFO_SETTINGS_UPDATED, onWorldInfoSettingsUpdated);
    };
};

export const initWIUpdateHandler = ({
    cache,
    getCurrentEditor,
    setCurrentEditor,
    getListPanelApi,
    getEditorPanelApi,
    getRefreshBookSourceLinks,
}) => {
    const stContext = SillyTavern.getContext();
    const eventBus = stContext?.eventSource;
    const eventTypes = stContext?.eventTypes ?? stContext?.event_types;

    
    let updateWIChangeStarted = createDeferred();
    
    let updateWIChangeFinished;

    
    
    let updateWIChangeToken = 0;
    let isWIUpdateInProgress = false;

    const shouldAutoRefreshEditor = (name, uid) => {
        const editorPanelApi = getEditorPanelApi();
        
        
        
        if (!editorPanelApi?.isDirty) return true;
        return !editorPanelApi.isDirty(name, uid);
    };

    const buildSavePayload = (name) => ({
        ...structuredClone(cache[name].extras ?? {}),
        entries: structuredClone(cache[name].entries),
        metadata: cloneMetadata(cache[name].metadata),
    });

    const updateSettingsChange = () => {
        console.log(LOG_PREFIX, '[UPDATE-SETTINGS]');
        const listPanelApi = getListPanelApi();
        for (const [name, world] of Object.entries(cache)) {
            const active = selected_world_info.includes(name);
            if (world?.dom?.active && world.dom.active.checked != active) {
                world.dom.active.checked = active;
            }
        }
        listPanelApi?.applyActiveFilter?.();
        listPanelApi?.updateFolderActiveToggles?.();
        getRefreshBookSourceLinks()?.('worldinfo_settings_updated');
    };

    const updateWIChange = async (name = null, data = null) => {
        console.log(LOG_PREFIX, '[UPDATE-WI]', name, data);
        const cycleFinished = createDeferred();
        updateWIChangeFinished = cycleFinished;
        updateWIChangeToken += 1;
        isWIUpdateInProgress = true;
        updateWIChangeStarted.resolve();

        try {
            const listPanelApi = getListPanelApi();
            const editorPanelApi = getEditorPanelApi();

            
            
            if (name && cache[name] && !data) {
                name = null;
            }

            removeStaleCachedBooks({ cache, worldNames: world_names });
            await renderMissingBooks({ cache, worldNames: world_names, loadWorldInfo, listPanelApi });
            if (name && cache[name]) {
                await syncBookEntriesAndDom({
                    bookName: name,
                    cache,
                    data,
                    listPanelApi,
                    editorPanelApi,
                    getCurrentEditor,
                    setCurrentEditor,
                    shouldAutoRefreshEditor,
                });
            }
            getRefreshBookSourceLinks()?.('worldinfo_updated');
        } finally {
            isWIUpdateInProgress = false;
            updateWIChangeStarted = createDeferred();
            cycleFinished.resolve();
        }
    };

    const updateWIChangeDebounced = debounce(updateWIChange);

    const { waitForWorldInfoUpdate, waitForWorldInfoUpdateWithTimeout } = createWorldInfoUpdateWaiter({
        delay,
        getUpdateWIChangeToken: () => updateWIChangeToken,
        isUpdateInProgress: () => isWIUpdateInProgress,
        getUpdateStarted: () => updateWIChangeStarted,
        getUpdateFinished: () => updateWIChangeFinished,
    });

    const reopenEditorEntry = (editorState) => {
        if (!editorState?.name || !editorState?.uid) return;
        const entryDom = cache[editorState.name]?.dom?.entry?.[editorState.uid]?.root;
        if (entryDom) {
            entryDom.click();
        }
    };

    const { queueEditorDuplicateRefresh } = createEditorDuplicateRefreshWorker({
        getCurrentEditor,
        refreshList,
        reopenEditorEntry,
        waitForWorldInfoUpdate,
        waitForWorldInfoUpdateWithTimeout,
    });

    const fillEmptyTitlesWithKeywords = async (name) => {
        const data = await loadWorldInfo(name);
        if (!data || typeof data !== 'object' || !data.entries || typeof data.entries !== 'object') {
            return;
        }
        let hasUpdates = false;
        for (const entry of Object.values(data.entries)) {
            const hasTitle = Boolean(entry.comment?.trim());
            if (hasTitle) continue;
            const keywords = Array.isArray(entry.key) ? entry.key.map((it) => it?.trim()).filter(Boolean) : [];
            if (keywords.length === 0) continue;
            entry.comment = keywords.join(', ');
            hasUpdates = true;
        }
        if (!hasUpdates) return;
        await saveWorldInfo(name, data, true);
    };

    const onWorldInfoUpdated = (name, world) => updateWIChangeDebounced(name, world);
    const onWorldInfoSettingsUpdated = () => updateSettingsChange();
    const cleanup = registerWorldInfoListeners({
        eventBus,
        eventTypes,
        onWorldInfoUpdated,
        onWorldInfoSettingsUpdated,
    });

    return {
        buildSavePayload,
        cleanup,
        fillEmptyTitlesWithKeywords,
        getUpdateWIChangeFinished: () => updateWIChangeFinished,
        getUpdateWIChangeStarted: () => updateWIChangeStarted,
        queueEditorDuplicateRefresh,
        updateWIChange,
        updateWIChangeDebounced,
        updateSettingsChange,
        waitForWorldInfoUpdate,
        waitForWorldInfoUpdateWithTimeout,
    };
};
