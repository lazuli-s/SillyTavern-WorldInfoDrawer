import { chat_metadata, characters, event_types, eventSource, name1, this_chid } from '../../../../../script.js';
import { groups, selected_group } from '../../../../group-chats.js';
import { power_user } from '../../../../power-user.js';
import { getCharaFilename } from '../../../../utils.js';
import { METADATA_KEY, world_info, world_names } from '../../../../world-info.js';

const SOURCE_ICON_LOG_PREFIX = '[STWID][SOURCE_ICONS]';
const EMPTY_STRING_ARRAY = Object.freeze([]);
const EMPTY_BOOK_SOURCE_LINKS = Object.freeze({
    character: false,
    chat: false,
    persona: false,
    characterNames: EMPTY_STRING_ARRAY,
    personaName: '',
});

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

const getActivePersonaName = ({ powerUserSettings, chatMetadata, fallbackName })=>{
    const personaMap = powerUserSettings?.personas;
    if (!personaMap || typeof personaMap !== 'object') return '';

    const lockedPersonaAvatar = chatMetadata?.persona;
    if (typeof lockedPersonaAvatar === 'string' && lockedPersonaAvatar) {
        const lockedPersonaName = personaMap[lockedPersonaAvatar];
        if (typeof lockedPersonaName === 'string' && lockedPersonaName.trim()) {
            return lockedPersonaName.trim();
        }
    }

    const currentLorebook = powerUserSettings?.persona_description_lorebook;
    if (typeof currentLorebook === 'string' && currentLorebook) {
        const descriptors = powerUserSettings?.persona_descriptions;
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

    if (typeof fallbackName === 'string' && fallbackName.trim()) {
        return fallbackName.trim();
    }
    return '';
};

export const initBookSourceLinks = ({ getListPanelApi })=>{
    let lorebookSourceLinks = {};
    let lorebookSourceLinksSignature = '';

    // Context-first with fallback for compatibility: some older ST versions may not expose getContext or all fields.
    const ctx = globalThis.SillyTavern?.getContext?.() ?? null;

    const chatMetadata = ctx?.chatMetadata ?? chat_metadata;
    const runtimeCharacters = ctx?.characters ?? characters;
    const runtimeEventSource = ctx?.eventSource ?? eventSource;
    const runtimeEventTypes = ctx?.eventTypes ?? event_types;
    const runtimeName1 = ctx?.name1 ?? name1;
    const runtimeCharacterId = ctx?.characterId ?? this_chid;
    const runtimeGroups = ctx?.groups ?? groups;
    const runtimeGroupId = ctx?.groupId ?? selected_group;
    const powerUserSettings = ctx?.powerUserSettings ?? power_user;

    const eventSubscriptions = [];

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

        const chatWorld = chatMetadata?.[METADATA_KEY];
        if (typeof chatWorld === 'string' && linksByBook[chatWorld]) {
            linksByBook[chatWorld].chat = true;
        }

        const personaWorld = powerUserSettings?.persona_description_lorebook;
        if (typeof personaWorld === 'string' && linksByBook[personaWorld]) {
            linksByBook[personaWorld].persona = true;
            const activePersonaName = getActivePersonaName({ powerUserSettings, chatMetadata, fallbackName: runtimeName1 });
            if (activePersonaName) {
                linksByBook[personaWorld].personaName = activePersonaName;
            }
        }

        const characterBooks = new Map();
        if (runtimeGroupId !== undefined && runtimeGroupId !== null) {
            const activeGroup = runtimeGroups.find((group)=>group?.id == runtimeGroupId);
            const members = Array.isArray(activeGroup?.members) ? activeGroup.members : [];
            for (const member of members) {
                const character = runtimeCharacters.find((it)=>it?.avatar === member || it?.name === member);
                addCharacterLinkedBooks(characterBooks, character);
            }
        } else if (runtimeCharacterId !== undefined && runtimeCharacterId !== null && runtimeCharacters[runtimeCharacterId]) {
            addCharacterLinkedBooks(characterBooks, runtimeCharacters[runtimeCharacterId], runtimeCharacterId);
        }

        for (const [worldName, characterNameSet] of characterBooks.entries()) {
            if (!linksByBook[worldName]) continue;
            linksByBook[worldName].character = true;

            // Canonicalize ordering to avoid churn in signature comparisons.
            linksByBook[worldName].characterNames = Array.from(characterNameSet).sort((a, b)=>a.localeCompare(b));
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
        const listPanelApi = getListPanelApi();
        listPanelApi?.updateAllBookSourceLinks?.(nextLinks);
        listPanelApi?.applyActiveFilter?.();
        console.debug(SOURCE_ICON_LOG_PREFIX, reason, summarizeSourceLinks(nextLinks));
        return true;
    };

    const onSourceSelectorChange = (evt)=>{
        const target = evt.target instanceof HTMLElement ? evt.target : null;
        if (!target) return;
        if (!target.matches('.chat_world_info_selector, .persona_world_info_selector')) return;
        refreshBookSourceLinks('lorebook_source_selector_change');
    };

    const subscribedEventTypes = [
        runtimeEventTypes?.CHAT_CHANGED,
        runtimeEventTypes?.GROUP_UPDATED,
        runtimeEventTypes?.CHARACTER_EDITED,
        runtimeEventTypes?.CHARACTER_PAGE_LOADED,
        runtimeEventTypes?.SETTINGS_UPDATED,
    ].filter(Boolean);

    for (const eventType of subscribedEventTypes) {
        const handler = ()=>refreshBookSourceLinks(eventType);
        eventSubscriptions.push({ eventType, handler });
        runtimeEventSource.on(eventType, handler);
    }
    document.addEventListener('change', onSourceSelectorChange);

    return {
        cleanup: ()=>{
            for (const { eventType, handler } of eventSubscriptions) {
                runtimeEventSource?.removeListener?.(eventType, handler);
            }
            eventSubscriptions.length = 0;
            document.removeEventListener('change', onSourceSelectorChange);
        },
        getBookSourceLinks: (name)=>lorebookSourceLinks[name] ?? EMPTY_BOOK_SOURCE_LINKS,
        refreshBookSourceLinks,
    };
};