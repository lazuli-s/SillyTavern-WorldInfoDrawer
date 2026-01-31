const FOLDER_METADATA_KEY = 'folder';

const normalizeFolderName = (value)=>String(value ?? '').trim();

const validateFolderName = (value)=>{
    const normalized = normalizeFolderName(value);
    return {
        normalized,
        isValid: !normalized.includes('/'),
    };
};

const getFolderFromMetadata = (metadata)=>{
    if (!metadata || typeof metadata !== 'object') return null;
    if (!Object.hasOwn(metadata, FOLDER_METADATA_KEY)) return null;
    const { normalized, isValid } = validateFolderName(metadata[FOLDER_METADATA_KEY]);
    if (!isValid) return null;
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
    metadata[FOLDER_METADATA_KEY] = normalized;
    return { ok: true, folder: normalized };
};

const sanitizeFolderMetadata = (metadata)=>{
    if (!metadata || typeof metadata !== 'object') return null;
    if (!Object.hasOwn(metadata, FOLDER_METADATA_KEY)) return null;
    const { normalized, isValid } = validateFolderName(metadata[FOLDER_METADATA_KEY]);
    if (!isValid) {
        delete metadata[FOLDER_METADATA_KEY];
        return null;
    }
    metadata[FOLDER_METADATA_KEY] = normalized;
    return normalized;
};

export {
    getFolderFromMetadata,
    setFolderInMetadata,
    sanitizeFolderMetadata,
};
