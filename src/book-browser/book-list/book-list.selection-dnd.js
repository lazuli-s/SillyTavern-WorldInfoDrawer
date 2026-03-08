import { resetSelectionMemory } from '../book-browser.state.js';

const ENTRY_SELECTION_ICON_SELECTOR = '.stwid--selector > .stwid--icon';
const UNSELECTED_ENTRY_ICON_CLASS = 'fa-square';
const DROP_TARGET_CLASS = 'stwid--state-target';

const setEntrySelectionIcon = (entry, isSelected)=>{
    const icon = entry.querySelector(ENTRY_SELECTION_ICON_SELECTOR);
    if (!icon) return;
    icon.classList.toggle(UNSELECTED_ENTRY_ICON_CLASS, !isSelected);
    icon.classList.toggle('fa-square-check', isSelected);
};

const createSelectionStateHelpers = ({ listPanelState, runtime })=>{
    const selectEnd = ()=>{
        resetSelectionMemory((toast)=>toastr.clear(toast));
        runtime.dom.books.classList.remove('stwid--state-dragging');
        [...runtime.dom.books.querySelectorAll('.stwid--entry.stwid--state-selected')]
            .forEach((selectedEntry)=>{
                selectedEntry.classList.remove('stwid--state-selected');
                selectedEntry.removeAttribute('draggable');
                setEntrySelectionIcon(selectedEntry, false);
            })
        ;
        [...runtime.dom.books.querySelectorAll(`.stwid--book.${DROP_TARGET_CLASS}`)]
            .forEach((selectedEntry)=>{
                selectedEntry.classList.remove(DROP_TARGET_CLASS);
            })
        ;
    };

    const selectAdd = (entry)=>{
        entry.classList.add('stwid--state-selected');
        entry.setAttribute('draggable', 'true');
        setEntrySelectionIcon(entry, true);
    };

    const selectRemove = (entry)=>{
        entry.classList.remove('stwid--state-selected');
        entry.setAttribute('draggable', 'false');
        setEntrySelectionIcon(entry, false);
    };

    const keepOnlyFailedSelection = (failedUids)=>{
        const failedUidSet = new Set(failedUids.map((uid)=>String(uid)));
        for (const item of runtime.dom.books.querySelectorAll('.stwid--entry.stwid--state-selected')) {
            if (failedUidSet.has(item.dataset.uid)) continue;
            selectRemove(item);
        }
        listPanelState.selectList = listPanelState.selectList
            .filter((uid)=>failedUidSet.has(String(uid)))
        ;
        listPanelState.selectLast = listPanelState.selectList.at(-1) ?? null;
        listPanelState.selectMode = listPanelState.selectList.length > 0;
    };

    return {
        keepOnlyFailedSelection,
        selectAdd,
        selectEnd,
        selectRemove,
    };
};

const watchEntryTransferBooks = (targetBookName, sourceBookName, isCopy)=>{
    const stContext = SillyTavern.getContext();
    const eventBus = stContext?.eventSource;
    const eventTypes = stContext?.eventTypes ?? stContext?.event_types;
    const worldInfoUpdatedEvent = eventTypes?.WORLDINFO_UPDATED;
    const watchedBooks = new Set([targetBookName]);
    if (!isCopy && sourceBookName !== targetBookName) {
        watchedBooks.add(sourceBookName);
    }
    const state = { hasConcurrentBookUpdate:false };
    const onWorldInfoUpdated = (name)=>{
        if (watchedBooks.has(name)) {
            state.hasConcurrentBookUpdate = true;
        }
    };
    if (eventBus && worldInfoUpdatedEvent) {
        eventBus.on(worldInfoUpdatedEvent, onWorldInfoUpdated);
    }

    return {
        cleanup: ()=>{
            if (eventBus && worldInfoUpdatedEvent) {
                eventBus.removeListener(worldInfoUpdatedEvent, onWorldInfoUpdated);
            }
        },
        hasConcurrentBookUpdate: ()=>state.hasConcurrentBookUpdate,
    };
};

const tryDeleteTransferredSourceEntry = async(runtime, srcBook, uid)=>{
    try {
        const deleted = await runtime.deleteWorldInfoEntry(srcBook, uid, { silent:true });
        if (!deleted) {
            return false;
        }
        if (typeof runtime.deleteWIOriginalDataValue === 'function') {
            runtime.deleteWIOriginalDataValue(srcBook, uid);
        }
        return true;
    } catch {
        return false;
    }
};

const transferSelectedEntries = async(srcBook, dstBook, selectedUids, isCopy, hasConcurrentBookUpdate, runtime)=>{
    const result = {
        attemptedMoveCount: 0,
        failedUids: [],
        hasDstChanges: false,
        hasSrcChanges: false,
    };

    for (const uid of selectedUids) {
        if (hasConcurrentBookUpdate()) {
            throw new Error('Lorebook changed while moving entries. Please retry.');
        }

        const srcEntry = srcBook.entries[uid];
        if (!srcEntry) continue;
        result.attemptedMoveCount += 1;

        const entryPayload = Object.assign({}, srcEntry);
        delete entryPayload.uid;

        const dstEntry = runtime.createWorldInfoEntry(null, dstBook);
        Object.assign(dstEntry, entryPayload);
        result.hasDstChanges = true;

        if (isCopy) continue;
        if (typeof runtime.deleteWorldInfoEntry !== 'function') {
            throw new Error('Move is unavailable: deleteWorldInfoEntry helper is missing.');
        }

        const deleted = await tryDeleteTransferredSourceEntry(runtime, srcBook, uid);
        if (deleted) {
            result.hasSrcChanges = true;
            continue;
        }
        result.failedUids.push(uid);
    }

    return result;
};

const finalizeEntryTransfer = async(result, sourceBookName, targetBookName, srcBook, dstBook, isCopy, runtime, keepOnlyFailedSelection, selectEnd)=>{
    if (result.hasDstChanges) {
        await runtime.saveWorldInfo(targetBookName, dstBook, true);
        if (typeof runtime.updateWIChange === 'function') {
            runtime.updateWIChange(targetBookName, dstBook);
        } else {
            console.warn('[STWID] runtime.updateWIChange is unavailable for destination save.');
        }
    }

    if (!isCopy && sourceBookName !== targetBookName && result.hasSrcChanges) {
        await runtime.saveWorldInfo(sourceBookName, srcBook, true);
        if (typeof runtime.updateWIChange === 'function') {
            runtime.updateWIChange(sourceBookName, srcBook);
        } else {
            console.warn('[STWID] runtime.updateWIChange is unavailable for source save.');
        }
    }

    if (!isCopy && result.failedUids.length > 0) {
        keepOnlyFailedSelection(result.failedUids);
        const succeeded = Math.max(result.attemptedMoveCount - result.failedUids.length, 0);
        toastr.warning(`Move partially completed. ${succeeded} moved, ${result.failedUids.length} failed. Failed entries remain selected.`);
        return;
    }

    selectEnd();
};

const createEntryTransferHandlers = ({ listPanelState, runtime, keepOnlyFailedSelection, selectEnd })=>{
    const moveOrCopySelectedEntriesToBook = async(targetBookName, isCopy)=>{
        if (!listPanelState.selectList?.length) {
            selectEnd();
            return;
        }
        const sourceBookName = listPanelState.selectFrom;
        if (sourceBookName === targetBookName && !isCopy) {
            selectEnd();
            return;
        }

        const transferWatch = watchEntryTransferBooks(targetBookName, sourceBookName, isCopy);

        try {
            const srcBook = await runtime.loadWorldInfo(sourceBookName);
            const dstBook = await runtime.loadWorldInfo(targetBookName);
            if (!srcBook?.entries || !dstBook?.entries) {
                throw new Error('Could not load source or destination lorebook.');
            }

            const result = await transferSelectedEntries(
                srcBook,
                dstBook,
                listPanelState.selectList,
                isCopy,
                transferWatch.hasConcurrentBookUpdate,
                runtime,
            );

            if (transferWatch.hasConcurrentBookUpdate()) {
                throw new Error('Lorebook changed during move/copy. No changes were saved.');
            }

            await finalizeEntryTransfer(
                result,
                sourceBookName,
                targetBookName,
                srcBook,
                dstBook,
                isCopy,
                runtime,
                keepOnlyFailedSelection,
                selectEnd,
            );
        } catch (error) {
            console.error('[STWID] Failed to move/copy selected entries', error);
            const action = isCopy ? 'copy' : 'move';
            const reason = error instanceof Error ? error.message : 'Unknown error.';
            toastr.error(`Could not ${action} selected entries. ${reason}`);
        } finally {
            transferWatch.cleanup();
        }
    };

    return { moveOrCopySelectedEntriesToBook };
};

const updateBookDropTargetState = (targetBookRow, shouldHighlight)=>{
    targetBookRow.classList.toggle(DROP_TARGET_CLASS, shouldHighlight);
};

const createBookDropHandlers = ({ listPanelState, handleDraggedBookMoveOrCopy, moveOrCopySelectedEntriesToBook })=>{
    const onBookDropTargetDragOver = (evt, targetBookRow)=>{
        if (listPanelState.dragBookName) {
            evt.preventDefault();
            updateBookDropTargetState(targetBookRow, true);
            return;
        }
        if (listPanelState.selectFrom === null) return;
        evt.preventDefault();
        updateBookDropTargetState(targetBookRow, true);
    };

    const onBookDropTargetDragLeave = (_evt, targetBookRow)=>{
        if (listPanelState.dragBookName) {
            updateBookDropTargetState(targetBookRow, false);
            return;
        }
        if (listPanelState.selectFrom === null) return;
        updateBookDropTargetState(targetBookRow, false);
    };

    const onBookDropTargetDrop = async(evt, targetBookName, targetBookRow, getTargetFolder)=>{
        if (listPanelState.dragBookName) {
            evt.preventDefault();
            evt.stopPropagation();
            updateBookDropTargetState(targetBookRow, false);
            const draggedName = listPanelState.dragBookName;
            listPanelState.dragBookName = null;
            const targetFolder = getTargetFolder?.() ?? null;
            await handleDraggedBookMoveOrCopy(draggedName, targetFolder, evt.ctrlKey);
            return;
        }
        if (listPanelState.selectFrom === null) return;
        evt.preventDefault();
        await moveOrCopySelectedEntriesToBook(targetBookName, evt.ctrlKey);
    };

    const onFolderDropTargetDragStateChange = (isOver)=>{
        if (!listPanelState.dragBookName) return false;
        return isOver;
    };

    const onFolderDropTargetDrop = async(evt, folderName)=>{
        if (!listPanelState.dragBookName) return;
        const draggedName = listPanelState.dragBookName;
        listPanelState.dragBookName = null;
        await handleDraggedBookMoveOrCopy(draggedName, folderName, evt.ctrlKey);
    };

    const onRootDropTargetDragOver = (evt)=>{
        if (!listPanelState.dragBookName) return;
        if (evt.target.closest('.stwid--folderHeader')) return;
        evt.preventDefault();
    };

    const onRootDropTargetDrop = async(evt)=>{
        if (!listPanelState.dragBookName) return;
        if (evt.target.closest('.stwid--folderHeader')) return;
        evt.preventDefault();
        const draggedName = listPanelState.dragBookName;
        listPanelState.dragBookName = null;
        await handleDraggedBookMoveOrCopy(draggedName, null, evt.ctrlKey, { skipIfSameFolder: false });
    };

    return {
        onBookDropTargetDragLeave,
        onBookDropTargetDragOver,
        onBookDropTargetDrop,
        onFolderDropTargetDragStateChange,
        onFolderDropTargetDrop,
        onRootDropTargetDragOver,
        onRootDropTargetDrop,
    };
};

const createSelectionDnDSlice = ({
    listPanelState,
    runtime,
    handleDraggedBookMoveOrCopy,
})=>{
    const { keepOnlyFailedSelection, selectAdd, selectEnd, selectRemove } = createSelectionStateHelpers({
        listPanelState,
        runtime,
    });
    const { moveOrCopySelectedEntriesToBook } = createEntryTransferHandlers({
        keepOnlyFailedSelection,
        listPanelState,
        runtime,
        selectEnd,
    });
    const {
        onBookDropTargetDragLeave,
        onBookDropTargetDragOver,
        onBookDropTargetDrop,
        onFolderDropTargetDragStateChange,
        onFolderDropTargetDrop,
        onRootDropTargetDragOver,
        onRootDropTargetDrop,
    } = createBookDropHandlers({
        handleDraggedBookMoveOrCopy,
        listPanelState,
        moveOrCopySelectedEntriesToBook,
    });

    const getSelectionState = ()=>({
        get selectFrom() {
            return listPanelState.selectFrom;
        },
        set selectFrom(value) {
            listPanelState.selectFrom = value;
        },
        get selectLast() {
            return listPanelState.selectLast;
        },
        set selectLast(value) {
            listPanelState.selectLast = value;
        },
        get selectList() {
            return listPanelState.selectList;
        },
        set selectList(value) {
            listPanelState.selectList = value;
        },
        get selectMode() {
            return listPanelState.selectMode;
        },
        set selectMode(value) {
            listPanelState.selectMode = value;
        },
        get selectToast() {
            return listPanelState.selectToast;
        },
        set selectToast(value) {
            listPanelState.selectToast = value;
        },
    });

    return {
        getSelectionState,
        onBookDropTargetDragLeave,
        onBookDropTargetDragOver,
        onBookDropTargetDrop,
        onFolderDropTargetDragStateChange,
        onFolderDropTargetDrop,
        onRootDropTargetDragOver,
        onRootDropTargetDrop,
        selectAdd,
        selectEnd,
        selectRemove,
    };
};

export { createSelectionDnDSlice };
