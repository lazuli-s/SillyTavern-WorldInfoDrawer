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

const createFolderDom = ({ folderName, onToggle })=>{
    const root = document.createElement('div'); {
        root.classList.add('stwid--folder');
        root.dataset.folder = folderName;
        const header = document.createElement('div'); {
            header.classList.add('stwid--folderHeader');
            header.addEventListener('click', (evt)=>{
                evt.preventDefault();
                onToggle?.();
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
    setFolderCollapsed,
    setFolderInMetadata,
    sanitizeFolderMetadata,
    updateFolderCount,
};
