import { getCharaFilename } from '../../../../../../utils.js';
// Keep direct world-info imports for values not available via context.
import { METADATA_KEY, world_info, world_names } from '../../../../../../world-info.js';

const SOURCE_ICON_LOG_PREFIX = '[STWID][SOURCE_ICONS]';
const EMPTY_BOOK_SOURCE_LINKS = Object.freeze({
    character: false,
    chat: false,
    persona: false,
    characterNames: Object.freeze([]),
    personaName: '',
});

const getBookSourceRuntimeContext = ()=>{
    const context = globalThis.SillyTavern?.getContext?.() ?? null;
    const eventTypes = context?.eventTypes && typeof context.eventTypes === 'object'
        ? context.eventTypes
        : (context?.event_types && typeof context.event_types === 'object' ? context.event_types : {});
    return {
        chatMetadata: context?.chatMetadata && typeof context.chatMetadata === 'object' ? context.chatMetadata : {},
        characters: Array.isArray(context?.characters) ? context.characters : [],
        groups: Array.isArray(context?.groups) ? context.groups : [],
        name1: typeof context?.name1 === 'string' ? context.name1 : '',
        characterId: context?.characterId ?? null,
        groupId: context?.groupId ?? null,
        powerUserSettings: context?.powerUserSettings && typeof context.powerUserSettings === 'object'
            ? context.powerUserSettings
            : {},
        eventSource: context?.eventSource ?? null,
        eventTypes,
    };
};

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

const getActivePersonaName = ({ powerUserSettings, chatMetadata, name1 })=>{
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

    if (typeof name1 === 'string' && name1.trim()) {
        return name1.trim();
    }
    return '';
};

export const initBookSourceLinks = ({ getListPanelApi })=>{
    let lorebookSourceLinks = {};
    let lorebookSourceLinksSignature = '';
    const eventSubscriptions = [];
    const { eventSource, eventTypes } = getBookSourceRuntimeContext();

    const buildSourceLinksSignature = (linksByBook)=>{
        const signatureEntries = [];
        for (const bookName of Object.keys(linksByBook).sort()) {
            const links = linksByBook[bookName] ?? EMPTY_BOOK_SOURCE_LINKS;
            const characterNames = Array.isArray(links.characterNames)
                ? [...links.characterNames].sort((a, b)=>String(a).localeCompare(String(b)))
                : [];
            const personaName = typeof links.personaName === 'string' ? links.personaName : '';
            signatureEntries.push([
                bookName,
                Boolean(links.character),
                Boolean(links.chat),
                Boolean(links.persona),
                personaName,
                characterNames.join('\u0001'),
            ].join('\u0002'));
        }
        return signatureEntries.join('\u0003');
    };

    const buildLorebookSourceLinks = ()=>{
        /**@type {{[book:string]:{character:boolean,chat:boolean,persona:boolean,characterNames:string[],personaName:string}}} */
        const linksByBook = {};
        const runtime = getBookSourceRuntimeContext();
        const allWorldNames = Array.isArray(world_names) ? world_names : [];
        for (const bookName of allWorldNames) {
            linksByBook[bookName] = {
                ...EMPTY_BOOK_SOURCE_LINKS,
                characterNames: [],
                personaName: '',
            };
        }

        const chatWorld = runtime.chatMetadata?.[METADATA_KEY];
        if (typeof chatWorld === 'string' && linksByBook[chatWorld]) {
            linksByBook[chatWorld].chat = true;
        }

        const personaWorld = runtime.powerUserSettings?.persona_description_lorebook;
        if (typeof personaWorld === 'string' && linksByBook[personaWorld]) {
            linksByBook[personaWorld].persona = true;
            const activePersonaName = getActivePersonaName(runtime);
            if (activePersonaName) {
                linksByBook[personaWorld].personaName = activePersonaName;
            }
        }

        const characterBooks = new Map();
        if (runtime.groupId) {
            const activeGroup = runtime.groups.find((group)=>group?.id == runtime.groupId);
            const members = Array.isArray(activeGroup?.members) ? activeGroup.members : [];
            const characterByAvatar = new Map();
            const charactersByName = new Map();
            for (const character of runtime.characters) {
                if (!character || typeof character !== 'object') continue;
                const avatar = typeof character.avatar === 'string' ? character.avatar : '';
                const name = typeof character.name === 'string' ? character.name : '';
                if (avatar && !characterByAvatar.has(avatar)) {
                    characterByAvatar.set(avatar, character);
                }
                if (name) {
                    if (!charactersByName.has(name)) {
                        charactersByName.set(name, []);
                    }
                    charactersByName.get(name).push(character);
                }
            }
            for (const member of members) {
                if (typeof member !== 'string' || !member) continue;
                let character = characterByAvatar.get(member) ?? null;
                if (!character) {
                    const matchingNameCharacters = charactersByName.get(member) ?? [];
                    if (matchingNameCharacters.length === 1) {
                        character = matchingNameCharacters[0];
                    } else if (matchingNameCharacters.length > 1) {
                        console.debug(SOURCE_ICON_LOG_PREFIX, 'skip_ambiguous_group_member', member);
                    }
                }
                addCharacterLinkedBooks(characterBooks, character);
            }
        } else if (runtime.characterId !== undefined && runtime.characterId !== null && runtime.characters[runtime.characterId]) {
            addCharacterLinkedBooks(characterBooks, runtime.characters[runtime.characterId], runtime.characterId);
        }

        for (const [worldName, characterNameSet] of characterBooks.entries()) {
            if (!linksByBook[worldName]) continue;
            linksByBook[worldName].character = true;
            linksByBook[worldName].characterNames = [...characterNameSet].sort((a, b)=>a.localeCompare(b));
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
        const signature = buildSourceLinksSignature(nextLinks);
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

    for (const eventType of [
        eventTypes?.CHAT_CHANGED,
        eventTypes?.GROUP_UPDATED,
        eventTypes?.CHARACTER_EDITED,
        eventTypes?.CHARACTER_PAGE_LOADED,
        eventTypes?.SETTINGS_UPDATED,
    ]) {
        if (!eventType) continue;
        const handler = ()=>refreshBookSourceLinks(eventType);
        eventSource?.on?.(eventType, handler);
        eventSubscriptions.push({ eventType, handler });
    }
    document.addEventListener('change', onSourceSelectorChange);

    return {
        cleanup: ()=>{
            for (const { eventType, handler } of eventSubscriptions) {
                eventSource?.removeListener?.(eventType, handler);
            }
            eventSubscriptions.length = 0;
            document.removeEventListener('change', onSourceSelectorChange);
        },
        getBookSourceLinks: (name)=>lorebookSourceLinks[name] ?? EMPTY_BOOK_SOURCE_LINKS,
        refreshBookSourceLinks,
    };
};
