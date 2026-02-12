import { event_types, eventSource } from '../../../../../script.js';
import { debounce, delay } from '../../../../utils.js';
import { loadWorldInfo, saveWorldInfo, selected_world_info, world_names } from '../../../../world-info.js';
import { Settings } from './Settings.js';
import { refreshList } from './listPanel.js';
import { cloneMetadata, getSortFromMetadata, sortEntries } from './sortHelpers.js';
import { entryState, renderEntry } from './worldEntry.js';
import { createDeferred } from './utils.js';

const EDITOR_DUPLICATE_REFRESH_TIMEOUT_MS = 15000;

export const initWIUpdateHandler = ({
    cache,
    getCurrentEditor,
    setCurrentEditor,
    getListPanelApi,
    getEditorPanelApi,
    getRefreshBookSourceLinks,
})=>{
    /**@type {ReturnType<typeof createDeferred>} */
    let updateWIChangeStarted = createDeferred();
    /**@type {ReturnType<typeof createDeferred>} */
    let updateWIChangeFinished;

    // Monotonic token to correlate a wait call with the specific update cycle it should observe.
    // This prevents a wait from resolving due to an earlier/later unrelated update.
    let updateWIChangeToken = 0;
    const editorDuplicateRefreshQueue = [];
    let isEditorDuplicateRefreshWorkerRunning = false;

    const shouldAutoRefreshEditor = (name, uid)=>{
        const editorPanelApi = getEditorPanelApi();
        // When the user is actively typing in the editor, rebuilding the editor DOM
        // (via a synthetic click) can discard unsaved input.
        // Guard auto-refreshes to prefer preserving in-progress edits.
        if (!editorPanelApi?.isDirty) return true;
        return !editorPanelApi.isDirty(name, uid);
    };

    const buildSavePayload = (name)=>({
        entries: structuredClone(cache[name].entries),
        metadata: cloneMetadata(cache[name].metadata),
    });

    const updateSettingsChange = ()=>{
        console.log('[STWID]', '[UPDATE-SETTINGS]');
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

    const updateWIChange = async(name = null, data = null)=>{
        console.log('[STWID]', '[UPDATE-WI]', name, data);
        updateWIChangeFinished = createDeferred();
        updateWIChangeToken += 1;
        updateWIChangeStarted.resolve();

        const listPanelApi = getListPanelApi();
        const editorPanelApi = getEditorPanelApi();
        const isCurrentEditor = (bookName, entryUid)=>{
            const currentEditor = getCurrentEditor();
            return currentEditor?.name == bookName && currentEditor?.uid == entryUid;
        };

        // If called with a book name but without the corresponding data payload,
        // fall back to a full refresh (robust against mutation observer / unexpected callers).
        if (name && cache[name] && !data) {
            name = null;
        }

        // removed books
        for (const [n, w] of Object.entries(cache)) {
            if (world_names.includes(n)) continue;
            else {
                w.dom.root.remove();
                delete cache[n];
            }
        }
        // added books
        for (const worldName of world_names) {
            if (cache[worldName]) continue;
            else {
                const before = Object.keys(cache).find((it)=>it.toLowerCase().localeCompare(worldName.toLowerCase()) == 1);
                const worldData = await loadWorldInfo(worldName);
                await listPanelApi.renderBook(worldName, before ? cache[before].dom.root : null, worldData);
            }
        }
        if (name && cache[name]) {
            const world = { entries:{}, metadata: cloneMetadata(data.metadata) };
            const updatedSort = getSortFromMetadata(world.metadata) ?? cache[name].sort;
            const sortChoice = {
                sort: updatedSort?.sort ?? Settings.instance.sortLogic,
                direction: updatedSort?.direction ?? Settings.instance.sortDirection,
            };
            for (const [k, v] of Object.entries(data.entries)) {
                world.entries[k] = structuredClone(v);
            }
            // removed entries
            for (const e of Object.keys(cache[name].entries)) {
                if (world.entries[e]) continue;
                cache[name].dom.entry[e].root.remove();
                delete cache[name].dom.entry[e];
                delete cache[name].entries[e];
                if (isCurrentEditor(name, e)) {
                    if (editorPanelApi) {
                        editorPanelApi.clearEditor();
                    } else {
                        setCurrentEditor(null);
                    }
                }
            }
            // added entries
            const alreadyAdded = [];
            for (const e of Object.keys(world.entries)) {
                if (cache[name].entries[e]) continue;
                const a = world.entries[e];
                const sorted = sortEntries([...Object.values(cache[name].entries), ...alreadyAdded, a], sortChoice.sort, sortChoice.direction);
                const before = sorted.find((it, idx)=>idx > sorted.indexOf(a));
                await renderEntry(a, name, before ? cache[name].dom.entry[before.uid].root : null);
                alreadyAdded.push(a);
            }
            // updated entries
            let hasUpdate = false;
            for (const [e, o] of Object.entries(cache[name].entries)) {
                const n = world.entries[e];
                let hasChange = false;
                let needsEditorRefresh = false;
                const triggerEditorRefreshOnce = ()=>{
                    if (shouldAutoRefreshEditor(name, e)) {
                        needsEditorRefresh = true;
                    }
                };
                for (const k of new Set([...Object.keys(o), ...Object.keys(n)])) {
                    if (o[k] == n[k]) continue;
                    if (typeof o[k] == 'object' && JSON.stringify(o[k]) == JSON.stringify(n[k])) continue;
                    hasChange = true;
                    hasUpdate = true;
                    switch (k) {
                        case 'content': {
                            if (isCurrentEditor(name, e)) {
                                const inp = /**@type {HTMLTextAreaElement|HTMLInputElement|null}*/(document.querySelector('.stwid--editor [name="content"]'));
                                if (!inp || inp.value != n.content) {
                                    triggerEditorRefreshOnce();
                                }
                            }
                            break;
                        }
                        case 'comment': {
                            if (isCurrentEditor(name, e)) {
                                const inp = /**@type {HTMLTextAreaElement|HTMLInputElement|null}*/(document.querySelector('.stwid--editor [name="comment"]'));
                                if (!inp || inp.value != n.comment) {
                                    triggerEditorRefreshOnce();
                                }
                            }
                            cache[name].dom.entry[e].comment.textContent = n.comment;
                            break;
                        }
                        case 'key': {
                            if (hasChange && isCurrentEditor(name, e)) {
                                const inp = /**@type {HTMLTextAreaElement|null}*/(document.querySelector(`.stwid--editor textarea[name="${k}"]`));
                                if (!inp || inp.value != n[k].join(', ')) {
                                    triggerEditorRefreshOnce();
                                }
                            }
                            cache[name].dom.entry[e].key.textContent = n.key.join(', ');
                            break;
                        }
                        case 'disable': {
                            if (hasChange && isCurrentEditor(name, e)) {
                                triggerEditorRefreshOnce();
                            }
                            cache[name].dom.entry[e].isEnabled.classList[n[k] ? 'remove' : 'add']('fa-toggle-on');
                            cache[name].dom.entry[e].isEnabled.classList[n[k] ? 'add' : 'remove']('fa-toggle-off');
                            break;
                        }
                        case 'constant':
                        case 'vectorized': {
                            if (hasChange && isCurrentEditor(name, e)) {
                                triggerEditorRefreshOnce();
                            }
                            cache[name].dom.entry[e].strategy.value = entryState(n);
                            break;
                        }
                        default: {
                            if (hasChange && isCurrentEditor(name, e)) {
                                const inp = /**@type {HTMLInputElement|null}*/(document.querySelector(`.stwid--editor [name="${k}"]`));
                                if (!inp || inp.value != n[k]) {
                                    triggerEditorRefreshOnce();
                                }
                            }
                            break;
                        }
                    }
                }
                if (needsEditorRefresh) {
                    cache[name].dom.entry[e].root.click();
                }
            }
            cache[name].entries = world.entries;
            const prevSort = cache[name].sort;
            listPanelApi.setCacheMetadata(name, world.metadata);
            const sortChanged = JSON.stringify(prevSort) !== JSON.stringify(cache[name].sort);
            if (hasUpdate || sortChanged) {
                listPanelApi.sortEntriesIfNeeded(name);
            }
        }
        getRefreshBookSourceLinks()?.('worldinfo_updated');
        updateWIChangeStarted = createDeferred();
        updateWIChangeFinished.resolve();
    };

    const updateWIChangeDebounced = debounce(updateWIChange);

    /**
     * Waits for the next WORLDINFO update cycle (start -> finish).
     *
     * NOTE: This must not resolve due to an update cycle that started before the call,
     * otherwise callers that open dialogs and then await an update can get a false-positive.
     */
    const waitForWorldInfoUpdate = async()=>{
        // Capture the token at call time so we only resolve for a strictly later update.
        const tokenAtCall = updateWIChangeToken;

        // Wait until a new cycle starts.
        while (updateWIChangeToken === tokenAtCall) {
            const startPromise = updateWIChangeStarted.promise;
            await startPromise;
            // Loop to re-check token in case the promise resolved from an older resolve
            // (e.g., if an update started and finished before this awaited line ran).
        }

        // Now wait for the finish of the cycle that started after we entered.
        await updateWIChangeFinished?.promise;
        return true;
    };

    const waitForWorldInfoUpdateWithTimeout = async(waitPromise, timeoutMs = EDITOR_DUPLICATE_REFRESH_TIMEOUT_MS)=>{
        const result = await Promise.race([
            waitPromise.then(() => true),
            delay(timeoutMs).then(() => false),
        ]);
        return result;
    };

    const reopenEditorEntry = (editorState)=>{
        if (!editorState?.name || !editorState?.uid) return;
        const entryDom = cache[editorState.name]?.dom?.entry?.[editorState.uid]?.root;
        if (entryDom) {
            entryDom.click();
        }
    };

    const runEditorDuplicateRefreshWorker = async()=>{
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

    const queueEditorDuplicateRefresh = ()=>{
        // Capture the specific "next update cycle" at click time so each duplicate click
        // maps to the update it triggers, then process refreshes serially.
        editorDuplicateRefreshQueue.push(waitForWorldInfoUpdate());
        void runEditorDuplicateRefreshWorker();
    };

    const fillEmptyTitlesWithKeywords = async(name)=>{
        const data = await loadWorldInfo(name);
        let hasUpdates = false;
        for (const entry of Object.values(data.entries)) {
            const hasTitle = Boolean(entry.comment?.trim());
            if (hasTitle) continue;
            const keywords = Array.isArray(entry.key) ? entry.key.map((it)=>it?.trim()).filter(Boolean) : [];
            if (keywords.length === 0) continue;
            entry.comment = keywords.join(', ');
            hasUpdates = true;
        }
        if (!hasUpdates) return;
        await saveWorldInfo(name, data, true);
        updateWIChange(name, data);
    };

    eventSource.on(event_types.WORLDINFO_UPDATED, (name, world)=>updateWIChangeDebounced(name, world));
    eventSource.on(event_types.WORLDINFO_SETTINGS_UPDATED, ()=>updateSettingsChange());

    return {
        buildSavePayload,
        fillEmptyTitlesWithKeywords,
        getUpdateWIChangeFinished: ()=>updateWIChangeFinished,
        getUpdateWIChangeStarted: ()=>updateWIChangeStarted,
        queueEditorDuplicateRefresh,
        updateWIChange,
        updateWIChangeDebounced,
        updateSettingsChange,
        waitForWorldInfoUpdate,
        waitForWorldInfoUpdateWithTimeout,
    };
};
