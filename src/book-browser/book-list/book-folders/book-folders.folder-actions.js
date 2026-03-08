import {
    validateFolderName,
    getFolderBookNames,
    registerFolderName,
    removeFolderName,
    summarizeBookNames,
    setFolderInMetadata,
} from './book-folders.lorebook-folders.js';

const hasFolderImportPayload = (payload)=>{
    const books = payload?.books;
    return Boolean(books && typeof books === 'object' && !Array.isArray(books));
};

const getFolderImportBookNames = (payload)=>{
    if (!hasFolderImportPayload(payload)) return [];
    return Object.keys(payload.books);
};

const collectFailedBookOperations = async(bookNames, runBookOperation, buildFailureMessage)=>{
    const failedBookNames = [];
    for (const bookName of bookNames) {
        try {
            const operationResult = await runBookOperation(bookName);
            if (operationResult === false || operationResult?.ok === false) {
                failedBookNames.push(bookName);
            }
        } catch (error) {
            console.warn(buildFailureMessage(bookName), error);
            failedBookNames.push(bookName);
        }
    }
    return failedBookNames;
};

const waitForImportedBooksToStabilize = async(getWorldNames, updatePromise)=>{
    const hasUpdate = await Promise.race([
        updatePromise ? updatePromise.then(()=>true) : Promise.resolve(false),
        new Promise((resolve)=>setTimeout(()=>resolve(false), 15000)),
    ]);
    if (!hasUpdate) {
        return false;
    }

    const deadline = Date.now() + 4000;
    let lastSnapshot = getWorldNames().slice().sort();
    while (Date.now() < deadline) {
        await new Promise((resolve)=>setTimeout(resolve, 250));
        const nextSnapshot = getWorldNames().slice().sort();
        const unchanged = nextSnapshot.length === lastSnapshot.length
            && nextSnapshot.every((value, index)=>value === lastSnapshot[index]);
        if (unchanged) break;
        lastSnapshot = nextSnapshot;
    }

    return true;
};

const matchImportedBookNames = (expectedBookNames, beforeNames, afterNames)=>{
    const newNames = afterNames.filter((name)=>!beforeNames.has(name));
    const importPrefixes = expectedBookNames.map((name)=>`${name} (imported`);
    const attributedNames = expectedBookNames.length
        ? newNames.filter((name)=>expectedBookNames.includes(name)
            || importPrefixes.some((prefix)=>name.startsWith(prefix)))
        : [];
    const unmatchedNames = newNames.filter((name)=>!attributedNames.includes(name));
    return { attributedNames, unmatchedNames };
};

const moveImportedBooksIntoFolder = async(attributedNames, folderName, menuActions, unmatchedNames)=>{
    const failedMoveNames = await collectFailedBookOperations(
        attributedNames,
        (bookName)=>menuActions.setBookFolder(bookName, folderName),
        (bookName)=>`[STWID] Failed to move imported book "${bookName}" into folder "${folderName}".`
    );
    const movedCount = Math.max(attributedNames.length - failedMoveNames.length, 0);

    if (unmatchedNames.length) {
        toastr.info(
            `Moved ${movedCount} books to folder "${folderName}". Could not identify: ${summarizeBookNames(unmatchedNames)}.`
        );
    }
    if (failedMoveNames.length) {
        toastr.warning(
            `Import partially completed (${movedCount}/${attributedNames.length} identified books moved). Failed: ${summarizeBookNames(failedMoveNames)}.`
        );
    }
    if (attributedNames.length) {
        await menuActions.refreshList?.();
    }
};

const moveBooksOutOfFolder = async(bookNames, menuActions, folderName)=>{
    return collectFailedBookOperations(
        bookNames,
        (bookName)=>menuActions.setBookFolder(bookName, null),
        (bookName)=>`[STWID] Failed to move "${bookName}" out of folder "${folderName}"`
    );
};

const setFolderBooksActive = async(bookNames, isActive, onWorldInfoChange)=>{
    const select = (document.querySelector('#world_info'));
    if (!select) return;
    const targets = new Set(bookNames ?? []);
    for (const option of select.options) {
        if (!targets.has(option.textContent ?? '')) continue;
        option.selected = isActive;
    }
    onWorldInfoChange?.('__notSlashCommand__');
};

const createBookInFolder = async({
    folderName,
    Popup,
    createNewWorldInfo,
    getFreeWorldName,
    loadWorldInfo,
    saveWorldInfo,
    refreshList,
})=>{
    if (!Popup || !createNewWorldInfo || !loadWorldInfo || !saveWorldInfo) return null;
    const tempName = getFreeWorldName?.() ?? 'New World Info';
    const finalName = await Popup.show.input('Create a new World Info', 'Enter a name for the new file:', tempName);
    if (!finalName) return null;
    const created = await createNewWorldInfo(finalName, { interactive: true });
    if (!created) return null;
    const newBookData = await loadWorldInfo(finalName);
    if (!newBookData || typeof newBookData !== 'object') {
        console.warn(`[STWID] Failed to load newly created book "${finalName}" for folder assignment.`);
        toastr.warning(`Created "${finalName}", but it could not be placed into folder "${folderName}". You can move it manually.`);
        await refreshList?.();
        return finalName;
    }
    const metadata = newBookData.metadata ?? {};
    const folderAssignmentResult = setFolderInMetadata(metadata, folderName);
    if (!folderAssignmentResult.ok) return null;
    newBookData.metadata = metadata;
    await saveWorldInfo(finalName, newBookData, true);
    registerFolderName(folderName);
    await refreshList?.();
    return finalName;
};

const renameFolderAction = async({ folderName, menuActions })=>{
    const Popup = menuActions?.Popup;
    if (!Popup) return;
    const nextName = await Popup.show.input('Rename folder', 'Enter a new folder name:', folderName);
    if (!nextName) return;
    const { normalized, isValid } = validateFolderName(nextName);
    if (!normalized) {
        toastr.warning('Folder name cannot be empty.');
        return;
    }
    if (!isValid) {
        toastr.error('Folder names cannot include "/".');
        return;
    }
    if (normalized === folderName) return;
    const bookNames = getFolderBookNames(menuActions.cache, folderName);
    const failedBookNames = await collectFailedBookOperations(
        bookNames,
        (bookName)=>menuActions.setBookFolder(bookName, normalized),
        (bookName)=>`[STWID] Failed to move "${bookName}" while renaming folder "${folderName}"`
    );
    const movedCount = Math.max(bookNames.length - failedBookNames.length, 0);
    if (movedCount > 0) {
        registerFolderName(normalized);
    }
    if (!failedBookNames.length) {
        removeFolderName(folderName);
    } else {
        toastr.warning(
            `Folder rename partially completed (${movedCount}/${bookNames.length} books moved). Failed: ${summarizeBookNames(failedBookNames)}.`
        );
    }
    await menuActions.refreshList?.();
};

const importFolderAction = async({ folderName, menuActions })=>{
    if (!menuActions?.openImportDialog || !menuActions?.getWorldNames) return;

    if (menuActions.isFolderImporting?.()) return;
    menuActions.setFolderImporting?.(true);

    try {
        const beforeNames = new Set(menuActions.getWorldNames());
        const updatePromise = menuActions.waitForWorldInfoUpdate?.();
        const importPayload = await menuActions.openImportDialog();
        if (!importPayload) return;
        const expectedBookNames = getFolderImportBookNames(importPayload);
        if (!expectedBookNames.length) {
            toastr.warning('This import format cannot be attributed safely. New books will not be auto-moved into the folder.');
            return;
        }
        const hasUpdate = await waitForImportedBooksToStabilize(menuActions.getWorldNames, updatePromise);
        if (!hasUpdate) {
            console.warn(`[STWID] Folder import timed out waiting for WORLDINFO_UPDATED for folder "${folderName}".`);
            toastr.warning('Import did not complete in time. No books were moved into the folder.');
            return;
        }

        await menuActions.refreshList?.();
        const afterNames = menuActions.getWorldNames();
        const { attributedNames, unmatchedNames } = matchImportedBookNames(expectedBookNames, beforeNames, afterNames);

        if (!attributedNames.length) {
            toastr.warning('Import finished, but new books could not be confidently identified. No books were moved into the folder.');
            return;
        }

        await moveImportedBooksIntoFolder(attributedNames, folderName, menuActions, unmatchedNames);
    } finally {
        menuActions.setFolderImporting?.(false);
    }
};

const exportFolderAction = ({ folderName, menuActions })=>{
    if (!menuActions?.download || !menuActions?.buildSavePayload) return;
    const bookNames = getFolderBookNames(menuActions.cache, folderName);
    const payload = { books: {} };
    for (const bookName of bookNames) {
        payload.books[bookName] = menuActions.buildSavePayload(bookName);
    }
    menuActions.download(JSON.stringify(payload), folderName, 'application/json');
};

const entryManagerFolderAction = ({ folderName, menuActions })=>{
    const visibleScope = menuActions.getBookVisibilityScope?.()
        ?? menuActions.getSelectedWorldInfo?.()
        ?? [];
    const visibleLookup = new Set(visibleScope);
    const bookNames = getFolderBookNames(menuActions.cache, folderName)
        .filter((name)=>visibleLookup.has(name));
    menuActions.openEntryManager?.(null, bookNames);
};

const deleteFolderAction = async({ folderName, menuActions })=>{
    const Popup = menuActions?.Popup;
    if (!Popup) return;
    const shouldDeleteBooks = await Popup.show.confirm(
        `Delete folder: ${folderName}?`,
        'Choose what to do with the books in this folder.',
        'Delete books',
        'Move books out'
    );
    const bookNames = getFolderBookNames(menuActions.cache, folderName);
    let failedBookNames = [];
    if (shouldDeleteBooks) {
        failedBookNames = await collectFailedBookOperations(
            bookNames,
            (bookName)=>menuActions.deleteBook?.(bookName, { skipConfirm: true }) ?? true,
            (bookName)=>`[STWID] Failed to delete "${bookName}" while deleting folder "${folderName}"`
        );
    } else {
        failedBookNames = await moveBooksOutOfFolder(bookNames, menuActions, folderName);
    }
    if (!failedBookNames.length) {
        removeFolderName(folderName);
    } else {
        const completedCount = Math.max(bookNames.length - failedBookNames.length, 0);
        const action = shouldDeleteBooks ? 'deleted' : 'moved out';
        toastr.warning(
            `Folder delete partially completed (${completedCount}/${bookNames.length} books ${action}). Failed: ${summarizeBookNames(failedBookNames)}. Folder was kept.`
        );
    }
    await menuActions.refreshList?.();
};

export {
    setFolderBooksActive,
    createBookInFolder,
    renameFolderAction,
    importFolderAction,
    exportFolderAction,
    entryManagerFolderAction,
    deleteFolderAction,
};
