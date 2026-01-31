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

const updateFolderCount = (countElement, count)=>{
    if (!countElement) return;
    countElement.textContent = `(${count})`;
};

const setFolderCollapsed = (folderDom, isCollapsed)=>{
    if (!folderDom) return;
    folderDom.books.classList.toggle('stwid--isCollapsed', Boolean(isCollapsed));
    if (isCollapsed) {
        folderDom.toggle.classList.remove('fa-chevron-up');
        folderDom.toggle.classList.add('fa-chevron-down');
    } else {
        folderDom.toggle.classList.add('fa-chevron-up');
        folderDom.toggle.classList.remove('fa-chevron-down');
    }
};

const createFolderDom = ({ folderName, onToggle, onDrop, onDragStateChange })=>{
    const root = document.createElement('div'); {
        root.classList.add('stwid--folder');
        root.dataset.folder = folderName;
        const header = document.createElement('div'); {
            header.classList.add('stwid--folderHeader');
            header.addEventListener('click', (evt)=>{
                evt.preventDefault();
                onToggle?.();
            });
            header.addEventListener('dragover', (evt)=>{
                if (!onDrop) return;
                const allowDrop = onDragStateChange?.(true, evt) ?? true;
                if (!allowDrop) return;
                evt.preventDefault();
                root.classList.add('stwid--isTarget');
            });
            header.addEventListener('dragleave', (evt)=>{
                if (!onDrop) return;
                root.classList.remove('stwid--isTarget');
                onDragStateChange?.(false, evt);
            });
            header.addEventListener('drop', async(evt)=>{
                if (!onDrop) return;
                evt.preventDefault();
                root.classList.remove('stwid--isTarget');
                await onDrop(evt);
            });
            const icon = document.createElement('i'); {
                icon.classList.add('stwid--folderIcon');
                icon.classList.add('fa-solid', 'fa-fw', 'fa-folder');
                header.append(icon);
            }
            const label = document.createElement('span'); {
                label.classList.add('stwid--folderLabel');
                label.textContent = folderName;
                header.append(label);
            }
            const count = document.createElement('span'); {
                count.classList.add('stwid--folderCount');
                header.append(count);
            }
            const toggle = document.createElement('i'); {
                toggle.classList.add('stwid--folderToggle');
                toggle.classList.add('fa-solid', 'fa-fw', 'fa-chevron-down');
                header.append(toggle);
            }
            root.append(header);
        }
        const books = document.createElement('div'); {
            books.classList.add('stwid--folderBooks');
            root.append(books);
        }
    }
    const books = root.querySelector('.stwid--folderBooks');
    const count = root.querySelector('.stwid--folderCount');
    const toggle = root.querySelector('.stwid--folderToggle');
    const observer = new MutationObserver(()=>{
        updateFolderCount(count, books.childElementCount);
    });
    observer.observe(books, { childList: true });
    updateFolderCount(count, books.childElementCount);
    return {
        root,
        header: root.querySelector('.stwid--folderHeader'),
        books,
        count,
        toggle,
        observer,
    };
};

export {
    createFolderDom,
    getFolderFromMetadata,
    getFolderRegistry,
    registerFolderName,
    setFolderCollapsed,
    setFolderInMetadata,
    sanitizeFolderMetadata,
    updateFolderCount,
};
