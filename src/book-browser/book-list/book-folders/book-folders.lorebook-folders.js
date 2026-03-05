const FOLDER_METADATA_KEY = 'folder';
const FOLDER_REGISTRY_STORAGE_KEY = 'stwid--folder-registry';

const normalizeFolderName = (value)=>String(value ?? '').trim();

const validateFolderName = (value)=>{
    const normalized = normalizeFolderName(value);
    return {
        normalized,
        isValid: !normalized.includes('/'),
    };
};

const loadFolderRegistry = ()=>{
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(FOLDER_REGISTRY_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('[STWID] Failed to load folder registry', error);
        return [];
    }
};

const saveFolderRegistry = (folders)=>{
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(FOLDER_REGISTRY_STORAGE_KEY, JSON.stringify(folders));
    } catch (error) {
        console.warn('[STWID] Failed to save folder registry', error);
    }
};

const normalizeRegistry = (folders)=>{
    const normalized = [];
    const seen = new Set();
    for (const entry of folders) {
        const { normalized: folderName, isValid } = validateFolderName(entry);
        if (!isValid || !folderName) continue;
        if (seen.has(folderName)) continue;
        seen.add(folderName);
        normalized.push(folderName);
    }
    return normalized;
};

const getFolderRegistry = ()=>{
    const normalized = normalizeRegistry(loadFolderRegistry());
    saveFolderRegistry(normalized);
    return normalized;
};

const registerFolderName = (folderName)=>{
    const { normalized, isValid } = validateFolderName(folderName);
    if (!normalized) {
        return { ok: false, folder: null, reason: 'empty' };
    }
    if (!isValid) {
        return { ok: false, folder: null, reason: 'invalid' };
    }
    const registry = getFolderRegistry();
    if (!registry.includes(normalized)) {
        registry.push(normalized);
        registry.sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
        saveFolderRegistry(registry);
    }
    return { ok: true, folder: normalized };
};

const getFolderFromMetadata = (metadata)=>{
    if (!metadata || typeof metadata !== 'object') return null;
    if (!Object.hasOwn(metadata, FOLDER_METADATA_KEY)) return null;
    const { normalized, isValid } = validateFolderName(metadata[FOLDER_METADATA_KEY]);
    if (!isValid || !normalized) return null;
    return normalized;
};

const setFolderInMetadata = (metadata, folderName)=>{
    if (!metadata || typeof metadata !== 'object') {
        return { ok: false, folder: null };
    }
    const { normalized, isValid } = validateFolderName(folderName);
    if (!isValid) {
        return { ok: false, folder: null };
    }
    if (!normalized) {
        delete metadata[FOLDER_METADATA_KEY];
        return { ok: true, folder: null };
    }
    metadata[FOLDER_METADATA_KEY] = normalized;
    return { ok: true, folder: normalized };
};

const sanitizeFolderMetadata = (metadata)=>{
    if (!metadata || typeof metadata !== 'object') return null;
    if (!Object.hasOwn(metadata, FOLDER_METADATA_KEY)) return null;
    const { normalized, isValid } = validateFolderName(metadata[FOLDER_METADATA_KEY]);
    if (!isValid || !normalized) {
        delete metadata[FOLDER_METADATA_KEY];
        return null;
    }
    metadata[FOLDER_METADATA_KEY] = normalized;
    return normalized;
};

const getFolderBookNames = (cache, folderName)=>{
    if (!cache || !folderName) return [];
    return Object.keys(cache).filter((name)=>getFolderFromMetadata(cache[name]?.metadata) === folderName);
};

const getVisibleFolderBookNames = (cache, folderName)=>getFolderBookNames(cache, folderName).filter((name)=>{
    const bookRoot = cache?.[name]?.dom?.root;
    if (!bookRoot) return false;
    const isFilteredOut = bookRoot.classList.contains('stwid--filter-query')
        || bookRoot.classList.contains('stwid--filter-visibility');
    return !isFilteredOut;
});

const summarizeBookNames = (bookNames, { max = 3 } = {})=>{
    const names = Array.isArray(bookNames) ? bookNames : [];
    if (!names.length) return '';
    if (names.length <= max) return names.join(', ');
    const preview = names.slice(0, max).join(', ');
    return `${preview}, +${names.length - max} more`;
};

const getFolderActiveState = (cache, selected, folderName, bookNamesOverride = null)=>{
    const bookNames = Array.isArray(bookNamesOverride) ? bookNamesOverride : getFolderBookNames(cache, folderName);
    if (!bookNames.length) {
        return { checked: false, indeterminate: false };
    }
    const selectedSet = new Set(selected ?? []);
    const activeCount = bookNames.filter((name)=>selectedSet.has(name)).length;
    return {
        checked: activeCount === bookNames.length,
        indeterminate: activeCount > 0 && activeCount < bookNames.length,
    };
};

const removeFolderName = (folderName)=>{
    const normalized = normalizeFolderName(folderName);
    if (!normalized) return false;
    const registry = getFolderRegistry();
    const nextRegistry = registry.filter((entry)=>entry !== normalized);
    if (nextRegistry.length === registry.length) return false;
    saveFolderRegistry(nextRegistry);
    return true;
};

export {
    getFolderFromMetadata,
    getFolderRegistry,
    registerFolderName,
    removeFolderName,
    setFolderInMetadata,
    sanitizeFolderMetadata,
    validateFolderName,
    getFolderBookNames,
    getVisibleFolderBookNames,
    summarizeBookNames,
    getFolderActiveState,
};
