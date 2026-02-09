import { chat_metadata, characters, event_types, eventSource, getRequestHeaders, name1, this_chid } from '../../../../script.js';
import { extensionNames } from '../../../extensions.js';
import { groups, selected_group } from '../../../group-chats.js';
import { power_user } from '../../../power-user.js';
import { Popup } from '../../../popup.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { renderTemplateAsync } from '../../../templates.js';
import { debounce, debounceAsync, delay, download, getCharaFilename, getSortableDelay, isTrueBoolean, uuidv4 } from '../../../utils.js';
import { METADATA_KEY, createNewWorldInfo, createWorldInfoEntry, deleteWIOriginalDataValue, deleteWorldInfo, deleteWorldInfoEntry, getFreeWorldName, getWorldEntry, loadWorldInfo, onWorldInfoChange, saveWorldInfo, selected_world_info, world_info, world_names } from '../../../world-info.js';
import { Settings, SORT, SORT_DIRECTION } from './src/Settings.js';
import { initEditorPanel } from './src/editorPanel.js';
import { initListPanel, refreshList } from './src/listPanel.js';
import { registerFolderName } from './src/lorebookFolders.js';
import { initOrderHelper } from './src/orderHelper.js';
import { cloneMetadata, getSortFromMetadata, sortEntries } from './src/sortHelpers.js';
import { entryState, renderEntry, setWorldEntryContext } from './src/worldEntry.js';
import { appendSortOptions, createDeferred, getSortLabel, safeToSorted } from './src/utils.js';

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
    } catch (error) {
        console.debug('[STWID] CSS watch disabled', error);
    }
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
const SOURCE_ICON_LOG_PREFIX = '[STWID][SOURCE_ICONS]';
const EMPTY_BOOK_SOURCE_LINKS = Object.freeze({
    character: false,
    chat: false,
    persona: false,
});
let lorebookSourceLinks = {};
let lorebookSourceLinksSignature = '';

const addCharacterLinkedBooks = (target, character, fallbackCharacterId = null)=>{
    if (!character || typeof character !== 'object') return;
    const characterName = typeof character?.name === 'string' ? character.name.trim() : '';
    const addBookLink = (worldName)=>{
        if (typeof worldName !== 'string' || !worldName) return;
        if (!target.has(worldName)) {
            target.set(worldName, new Set());
        }
        if (characterName) {
            target.get(worldName).add(characterName);
        }
    };
    const primaryWorld = character?.data?.extensions?.world;
    if (typeof primaryWorld === 'string' && primaryWorld) {
        addBookLink(primaryWorld);
    }

    let avatarFileName = null;
    if (typeof character?.avatar === 'string' && character.avatar) {
        avatarFileName = getCharaFilename(null, { manualAvatarKey: character.avatar });
    } else if (fallbackCharacterId !== null && fallbackCharacterId !== undefined) {
        avatarFileName = getCharaFilename(fallbackCharacterId);
    }
    if (!avatarFileName) return;

    const extraCharLore = Array.isArray(world_info?.charLore)
        ? world_info.charLore.find((entry)=>entry?.name === avatarFileName)
        : null;
    const extraBooks = Array.isArray(extraCharLore?.extraBooks) ? extraCharLore.extraBooks : [];
    for (const worldName of extraBooks) {
        addBookLink(worldName);
    }
};

const getActivePersonaName = ()=>{
    const personaMap = power_user?.personas;
    if (!personaMap || typeof personaMap !== 'object') return '';

    const lockedPersonaAvatar = chat_metadata?.persona;
    if (typeof lockedPersonaAvatar === 'string' && lockedPersonaAvatar) {
        const lockedPersonaName = personaMap[lockedPersonaAvatar];
        if (typeof lockedPersonaName === 'string' && lockedPersonaName.trim()) {
            return lockedPersonaName.trim();
        }
    }

    const currentLorebook = power_user?.persona_description_lorebook;
    if (typeof currentLorebook === 'string' && currentLorebook) {
        const descriptors = power_user?.persona_descriptions;
        if (descriptors && typeof descriptors === 'object') {
            for (const [avatar, descriptor] of Object.entries(descriptors)) {
                if (descriptor?.lorebook !== currentLorebook) continue;
                const mappedName = personaMap[avatar];
                if (typeof mappedName === 'string' && mappedName.trim()) {
                    return mappedName.trim();
                }
            }
        }
    }

    if (typeof name1 === 'string' && name1.trim()) {
        return name1.trim();
    }
    return '';
};

const buildLorebookSourceLinks = ()=>{
    /**@type {{[book:string]:{character:boolean,chat:boolean,persona:boolean,characterNames:string[],personaName:string}}} */
    const linksByBook = {};
    const allWorldNames = Array.isArray(world_names) ? world_names : [];
    for (const bookName of allWorldNames) {
        linksByBook[bookName] = {
            ...EMPTY_BOOK_SOURCE_LINKS,
            characterNames: [],
            personaName: '',
        };
    }

    const chatWorld = chat_metadata?.[METADATA_KEY];
    if (typeof chatWorld === 'string' && linksByBook[chatWorld]) {
        linksByBook[chatWorld].chat = true;
    }

    const personaWorld = power_user?.persona_description_lorebook;
    if (typeof personaWorld === 'string' && linksByBook[personaWorld]) {
        linksByBook[personaWorld].persona = true;
        const activePersonaName = getActivePersonaName();
        if (activePersonaName) {
            linksByBook[personaWorld].personaName = activePersonaName;
        }
    }

    const characterBooks = new Map();
    if (selected_group) {
        const activeGroup = groups.find((group)=>group?.id == selected_group);
        const members = Array.isArray(activeGroup?.members) ? activeGroup.members : [];
        for (const member of members) {
            const character = characters.find((it)=>it?.avatar === member || it?.name === member);
            addCharacterLinkedBooks(characterBooks, character);
        }
    } else if (this_chid !== undefined && this_chid !== null && characters[this_chid]) {
        addCharacterLinkedBooks(characterBooks, characters[this_chid], this_chid);
    }

    for (const [worldName, characterNameSet] of characterBooks.entries()) {
        if (!linksByBook[worldName]) continue;
        linksByBook[worldName].character = true;
        linksByBook[worldName].characterNames = [...characterNameSet];
    }

    return linksByBook;
};

const summarizeSourceLinks = (linksByBook)=>{
    const summary = { character:0, chat:0, persona:0 };
    for (const links of Object.values(linksByBook)) {
        if (links.character) summary.character += 1;
        if (links.chat) summary.chat += 1;
        if (links.persona) summary.persona += 1;
    }
    return summary;
};

const refreshBookSourceLinks = (reason = 'manual')=>{
    const nextLinks = buildLorebookSourceLinks();
    const signature = JSON.stringify(nextLinks);
    if (signature === lorebookSourceLinksSignature) return false;
    lorebookSourceLinks = nextLinks;
    lorebookSourceLinksSignature = signature;
    listPanelApi?.updateAllBookSourceLinks?.(nextLinks);
    listPanelApi?.applyActiveFilter?.();
    console.debug(SOURCE_ICON_LOG_PREFIX, reason, summarizeSourceLinks(nextLinks));
    return true;
};

const shouldAutoRefreshEditor = (name, uid)=>{
    // When the user is actively typing in the editor, rebuilding the editor DOM
    // (via a synthetic click) can discard unsaved input.
    // Guard auto-refreshes to prefer preserving in-progress edits.
    if (!editorPanelApi?.isDirty) return true;
    return !editorPanelApi.isDirty(name, uid);
};

const METADATA_NAMESPACE = 'stwid';
const METADATA_SORT_KEY = 'sort';
const buildSavePayload = (name)=>({
    entries: structuredClone(cache[name].entries),
    metadata: cloneMetadata(cache[name].metadata),
});
const updateSettingsChange = ()=>{
    console.log('[STWID]', '[UPDATE-SETTINGS]');
    for (const [name, world] of Object.entries(cache)) {
        const active = selected_world_info.includes(name);
        if (world?.dom?.active && world.dom.active.checked != active) {
            world.dom.active.checked = active;
        }
    }
    listPanelApi?.applyActiveFilter?.();
    listPanelApi?.updateFolderActiveToggles?.();
    refreshBookSourceLinks('worldinfo_settings_updated');
};
/**@type {ReturnType<typeof createDeferred>} */
let updateWIChangeStarted = createDeferred();
/**@type {ReturnType<typeof createDeferred>} */
let updateWIChangeFinished;

// Monotonic token to correlate a wait call with the specific update cycle it should observe.
// This prevents a wait from resolving due to an earlier/later unrelated update.
let updateWIChangeToken = 0;
const EDITOR_DUPLICATE_REFRESH_TIMEOUT_MS = 15000;
const editorDuplicateRefreshQueue = [];
let isEditorDuplicateRefreshWorkerRunning = false;

const updateWIChange = async(name = null, data = null)=>{
    console.log('[STWID]', '[UPDATE-WI]', name, data);
    updateWIChangeFinished = createDeferred();
    updateWIChangeToken += 1;
    updateWIChangeStarted.resolve();

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
    for (const name of world_names) {
        if (cache[name]) continue;
        else {
            const before = Object.keys(cache).find(it=>it.toLowerCase().localeCompare(name.toLowerCase()) == 1);
            const data = await loadWorldInfo(name);
            await listPanelApi.renderBook(name, before ? cache[before].dom.root : null, data);
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
                        if (currentEditor?.name == name && currentEditor?.uid == e) {
                            const inp = /**@type {HTMLTextAreaElement|HTMLInputElement}*/(dom.editor.querySelector('[name="content"]'));
                            if (!inp || inp.value != n.content) {
                                triggerEditorRefreshOnce();
                            }
                        }
                        break;
                    }
                    case 'comment': {
                        if (currentEditor?.name == name && currentEditor?.uid == e) {
                            const inp = /**@type {HTMLTextAreaElement|HTMLInputElement}*/(dom.editor.querySelector('[name="comment"]'));
                            if (!inp || inp.value != n.comment) {
                                triggerEditorRefreshOnce();
                            }
                        }
                        cache[name].dom.entry[e].comment.textContent = n.comment;
                        break;
                    }
                    case 'key': {
                        if (hasChange && currentEditor?.name == name && currentEditor?.uid == e) {
                            const inp = /**@type {HTMLTextAreaElement}*/(dom.editor.querySelector(`textarea[name="${k}"]`));
                            if (!inp || inp.value != n[k].join(', ')) {
                                triggerEditorRefreshOnce();
                            }
                        }
                        cache[name].dom.entry[e].key.textContent = n.key.join(', ');
                        break;
                    }
                    case 'disable': {
                        if (hasChange && currentEditor?.name == name && currentEditor?.uid == e) {
                            triggerEditorRefreshOnce();
                        }
                        cache[name].dom.entry[e].isEnabled.classList[n[k] ? 'remove' : 'add']('fa-toggle-on');
                        cache[name].dom.entry[e].isEnabled.classList[n[k] ? 'add' : 'remove']('fa-toggle-off');
                        break;
                    }
                    case 'constant':
                    case 'vectorized': {
                        if (hasChange && currentEditor?.name == name && currentEditor?.uid == e) {
                            triggerEditorRefreshOnce();
                        }
                        cache[name].dom.entry[e].strategy.value = entryState(n);
                        break;
                    }
                    default: {
                        if (hasChange && currentEditor?.name == name && currentEditor?.uid == e) {
                            const inp = /**@type {HTMLInputElement}*/(dom.editor.querySelector(`[name="${k}"]`));
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
    refreshBookSourceLinks('worldinfo_updated');
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
        const keywords = Array.isArray(entry.key) ? entry.key.map(it=>it?.trim()).filter(Boolean) : [];
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
for (const eventType of [
    event_types.CHAT_CHANGED,
    event_types.GROUP_UPDATED,
    event_types.CHARACTER_EDITED,
    event_types.CHARACTER_PAGE_LOADED,
    event_types.SETTINGS_UPDATED,
]) {
    eventSource.on(eventType, ()=>refreshBookSourceLinks(eventType));
}
const onSourceSelectorChange = (evt)=>{
    const target = evt.target instanceof HTMLElement ? evt.target : null;
    if (!target) return;
    if (!target.matches('.chat_world_info_selector, .persona_world_info_selector')) return;
    refreshBookSourceLinks('lorebook_source_selector_change');
};
document.addEventListener('change', onSourceSelectorChange);


export const jumpToEntry = async(name, uid)=>{
    const entryDom = cache[name]?.dom?.entry?.[uid]?.root;
    if (!entryDom) return false;

    if (dom.activationToggle.classList.contains('stwid--active')) {
        dom.activationToggle.click();
    }
    if (dom.order.toggle.classList.contains('stwid--active')) {
        dom.order.toggle.click();
    }
    listPanelApi.setBookCollapsed(name, false);
    entryDom.scrollIntoView({ block:'center', inline:'center' });
    if (currentEditor?.name != name || currentEditor?.uid != uid) {
        entryDom.click();
    }
    return true;
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
                const srcBook = await loadWorldInfo(selectionState.selectFrom);
                for (const uid of selectionState.selectList) {
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
    };
    document.addEventListener('keydown', onDrawerKeydown);

    // Best-effort cleanup: if ST tears down/reloads extensions, remove global listeners.
    globalThis.addEventListener?.('beforeunload', ()=>{
        document.removeEventListener('keydown', onDrawerKeydown);
        document.removeEventListener('change', onSourceSelectorChange);
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
                            await refreshList();
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
            settings.setAttribute('aria-label', 'Global Activation Settings');
            settings.addEventListener('click', ()=>{
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
                            if (isActive) {
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
                    buildSavePayload,
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
                    deleteWorldInfo,
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
                    getBookSourceLinks: (name) => lorebookSourceLinks[name] ?? EMPTY_BOOK_SOURCE_LINKS,
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
                    getSelectedWorldInfo: () => selected_world_info,
                    getWorldNames: () => world_names,
                    sortEntries,
                    updateWIChange,
                    waitForWorldInfoUpdate,
                    world_names,
                    createNewWorldInfo,
                    createWorldInfoEntry,
                    getFreeWorldName,
                });
                refreshBookSourceLinks('list_panel_init');
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
                    const onUp = (upEvt)=>{
                        splitter.releasePointerCapture(upEvt.pointerId);
                        window.removeEventListener('pointermove', onMove);
                        window.removeEventListener('pointerup', onUp);
                        if (rafId !== null) {
                            cancelAnimationFrame(rafId);
                            rafId = null;
                            appliedListWidth = applyListWidth(pendingWidth);
                        }
                        localStorage.setItem(SPLITTER_STORAGE_KEY, String(Math.round(appliedListWidth)));
                    };
                    window.addEventListener('pointermove', onMove);
                    window.addEventListener('pointerup', onUp);
                });
            }
            const editor = document.createElement('div'); {
                dom.editor = editor;
                editor.classList.add('stwid--editor');
                editor.addEventListener('click', (evt)=>{
                    const target = evt.target instanceof HTMLElement ? evt.target : null;
                    if (!target?.closest('.duplicate_entry_button')) return;
                    queueEditorDuplicateRefresh();
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
        const moSel = new MutationObserver(()=>updateWIChangeDebounced());
        moSel.observe(moSelTarget, { childList: true });
    }

    const moDrawer = new MutationObserver(()=>{
        const style = drawerContent.getAttribute('style') ?? '';
        if (style.includes('display: none;')) return;
        if (currentEditor && cache[currentEditor.name]?.dom?.entry?.[currentEditor.uid]?.root) {
            cache[currentEditor.name].dom.entry[currentEditor.uid].root.click();
        }
    });
    moDrawer.observe(drawerContent, { attributes:true, attributeFilter:['style'] });
};
addDrawer();
refreshList();

// NOTE: Discord/non-Discord layout detection removed.
