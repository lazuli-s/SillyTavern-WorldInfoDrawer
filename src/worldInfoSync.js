import { loadWorldInfo, saveWorldInfo, selected_world_info, world_names } from '../../../world-info.js';
import { Settings } from './Settings.js';
import { cloneMetadata, getSortFromMetadata, sortEntries } from './sortHelpers.js';
import { createDeferred } from './utils.js';
import { entryState, renderEntry } from './worldEntry.js';

/** @type {{
 *  cache?: Record<string, any>,
 *  dom?: any,
 *  getListPanelApi?: () => any,
 *  getEditorPanelApi?: () => any,
 *  getCurrentEditor?: () => any,
 *  setCurrentEditor?: (value: any) => void,
 * }} */
let context = {};

export const setWorldInfoSyncContext = (nextContext) => {
    context = nextContext ?? {};
};

const getContextValue = (key) => {
    if (!(key in context)) {
        throw new Error(`[STWID] Missing world info sync context: ${key}`);
    }
    return context[key];
};

export const updateSettingsChange = () => {
    console.log('[STWID]', '[UPDATE-SETTINGS]');
    const cache = getContextValue('cache');
    const listPanelApi = getContextValue('getListPanelApi')?.();
    for (const [name, world] of Object.entries(cache)) {
        const active = selected_world_info.includes(name);
        if (world.dom.active.checked != active) {
            world.dom.active.checked = active;
        }
    }
    listPanelApi?.applyActiveFilter?.();
};

/**@type {ReturnType<typeof createDeferred>} */
export let updateWIChangeStarted = createDeferred();
/**@type {ReturnType<typeof createDeferred>} */
export let updateWIChangeFinished;

export const updateWIChange = async (name = null, data = null) => {
    console.log('[STWID]', '[UPDATE-WI]', name, data);
    const cache = getContextValue('cache');
    const dom = getContextValue('dom');
    const listPanelApi = getContextValue('getListPanelApi')?.();
    const editorPanelApi = getContextValue('getEditorPanelApi')?.();
    const getCurrentEditor = getContextValue('getCurrentEditor');
    const setCurrentEditor = getContextValue('setCurrentEditor');
    let currentEditor = getCurrentEditor?.();

    updateWIChangeFinished = createDeferred();
    updateWIChangeStarted.resolve();
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
            const before = Object.keys(cache).find(it=>it.toLowerCase().localeCompare(worldName.toLowerCase()) == 1);
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
        for (const [k,v] of Object.entries(data.entries)) {
            world.entries[k] = structuredClone(v);
        }
        // removed entries
        for (const e of Object.keys(cache[name].entries)) {
            if (world.entries[e]) continue;
            cache[name].dom.entry[e].root.remove();
            delete cache[name].dom.entry[e];
            delete cache[name].entries[e];
            if (currentEditor?.name == name && currentEditor?.uid == e) {
                if (editorPanelApi) {
                    editorPanelApi.clearEditor();
                } else {
                    currentEditor = null;
                    setCurrentEditor?.(null);
                    dom.editor.innerHTML = '';
                }
            }
        }
        // added entries
        const alreadyAdded = [];
        for (const e of Object.keys(world.entries)) {
            if (cache[name].entries[e]) continue;
            let a = world.entries[e];
            const sorted = sortEntries([...Object.values(cache[name].entries), ...alreadyAdded, a], sortChoice.sort, sortChoice.direction);
            const before = sorted.find((it,idx)=>idx > sorted.indexOf(a));
            await renderEntry(a, name, before ? cache[name].dom.entry[before.uid].root : null);
            alreadyAdded.push(a);
        }
        // updated entries
        let hasUpdate = false;
        for (const [e,o] of Object.entries(cache[name].entries)) {
            const n = world.entries[e];
            let hasChange = false;
            for (const k of new Set([...Object.keys(o), ...Object.keys(n)])) {
                if (o[k] == n[k]) continue;
                if (typeof o[k] == 'object' && JSON.stringify(o[k]) == JSON.stringify(n[k])) continue;
                hasChange = true;
                hasUpdate = true;
                switch (k) {
                    case 'content': {
                        if (currentEditor?.name == name && currentEditor?.uid == e && dom.editor.querySelector('[name="content"]').value != n.content) {
                            cache[name].dom.entry[e].root.click();
                        }
                        break;
                    }
                    case 'comment': {
                        if (currentEditor?.name == name && currentEditor?.uid == e && dom.editor.querySelector('[name="comment"]').value != n.comment) {
                            cache[name].dom.entry[e].root.click();
                        }
                        cache[name].dom.entry[e].comment.textContent = n.comment;
                        break;
                    }
                    case 'key': {
                        if (hasChange && currentEditor?.name == name && currentEditor?.uid == e) {
                            const inp = /**@type {HTMLTextAreaElement}*/(dom.editor.querySelector(`textarea[name="${k}"]`));
                            if (!inp || inp.value != n[k].join(', ')) {
                                cache[name].dom.entry[e].root.click();
                            }
                        }
                        cache[name].dom.entry[e].key.textContent = n.key.join(', ');
                        break;
                    }
                    case 'disable': {
                        if (hasChange && currentEditor?.name == name && currentEditor?.uid == e) {
                            cache[name].dom.entry[e].root.click();
                        }
                        cache[name].dom.entry[e].isEnabled.classList[n[k] ? 'remove' : 'add']('fa-toggle-on');
                        cache[name].dom.entry[e].isEnabled.classList[n[k] ? 'add' : 'remove']('fa-toggle-off');
                        break;
                    }
                    case 'constant':
                    case 'vectorized': {
                        if (hasChange && currentEditor?.name == name && currentEditor?.uid == e) {
                            cache[name].dom.entry[e].root.click();
                        }
                        cache[name].dom.entry[e].strategy.value = entryState(n);
                        break;
                    }
                    default: {
                        if (hasChange && currentEditor?.name == name && currentEditor?.uid == e) {
                            const inp = /**@type {HTMLInputElement}*/(dom.editor.querySelector(`[name="${k}"]`));
                            if (!inp || inp.value != n[k]) {
                                cache[name].dom.entry[e].root.click();
                            }
                        }
                        break;
                    }
                }
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
    updateWIChangeStarted = createDeferred();
    updateWIChangeFinished.resolve();
};

export const fillEmptyTitlesWithKeywords = async (name) => {
    const data = await loadWorldInfo(name);
    let hasUpdates = false;
    for (const entry of Object.values(data.entries)) {
        const hasTitle = Boolean(entry.comment?.trim());
        if (hasTitle) continue;
        const keywords = Array.isArray(entry.key) ? entry.key.map(it=>it?.trim()).filter(Boolean) : [];
        if (keywords.length === 0) continue;
        entry.comment = keywords.join(', ');
        hasUpdates = true;
    }
    if (!hasUpdates) return;
    await saveWorldInfo(name, data, true);
    updateWIChange(name, data);
};
