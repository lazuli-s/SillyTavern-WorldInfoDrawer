import { resetSelectionMemory } from './listPanel.state.js';

const createSelectionDnDSlice = ({
    listPanelState,
    runtime,
    handleDraggedBookMoveOrCopy,
})=>{
    const selectEnd = ()=>{
        resetSelectionMemory((toast)=>toastr.clear(toast));
        runtime.dom.books.classList.remove('stwid--state-dragging');
        [...runtime.dom.books.querySelectorAll('.stwid--entry.stwid--state-selected')]
            .forEach((item)=>{
                item.classList.remove('stwid--state-selected');
                item.removeAttribute('draggable');
                const icon = item.querySelector('.stwid--selector > .stwid--icon');
                icon.classList.add('fa-square');
                icon.classList.remove('fa-square-check');
            })
        ;
        [...runtime.dom.books.querySelectorAll('.stwid--book.stwid--state-target')]
            .forEach((item)=>{
                item.classList.remove('stwid--state-target');
            })
        ;
    };

    const selectAdd = (entry)=>{
        entry.classList.add('stwid--state-selected');
        entry.setAttribute('draggable', 'true');
        const icon = entry.querySelector('.stwid--selector > .stwid--icon');
        icon.classList.remove('fa-square');
        icon.classList.add('fa-square-check');
    };

    const selectRemove = (entry)=>{
        entry.classList.remove('stwid--state-selected');
        entry.setAttribute('draggable', 'false');
        const icon = entry.querySelector('.stwid--selector > .stwid--icon');
        icon.classList.add('fa-square');
        icon.classList.remove('fa-square-check');
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

        const stContext = SillyTavern.getContext();
        const eventBus = stContext?.eventSource;
        const eventTypes = stContext?.eventTypes ?? stContext?.event_types;
        const worldInfoUpdatedEvent = eventTypes?.WORLDINFO_UPDATED;
        const watchedBooks = new Set([targetBookName]);
        if (!isCopy && sourceBookName !== targetBookName) {
            watchedBooks.add(sourceBookName);
        }
        let hasConcurrentBookUpdate = false;
        const onWorldInfoUpdated = (name)=>{
            if (watchedBooks.has(name)) {
                hasConcurrentBookUpdate = true;
            }
        };
        if (eventBus && worldInfoUpdatedEvent) {
            eventBus.on(worldInfoUpdatedEvent, onWorldInfoUpdated);
        }

        try {
            const srcBook = await runtime.loadWorldInfo(sourceBookName);
            const dstBook = await runtime.loadWorldInfo(targetBookName);
            if (!srcBook?.entries || !dstBook?.entries) {
                throw new Error('Could not load source or destination lorebook.');
            }

            let hasDstChanges = false;
            let hasSrcChanges = false;
            let attemptedMoveCount = 0;
            const failedUids = [];
            for (const uid of listPanelState.selectList) {
                if (hasConcurrentBookUpdate) {
                    throw new Error('Lorebook changed while moving entries. Please retry.');
                }

                const srcEntry = srcBook.entries[uid];
                if (!srcEntry) continue;
                attemptedMoveCount += 1;

                const entryPayload = Object.assign({}, srcEntry);
                delete entryPayload.uid;

                const dstEntry = runtime.createWorldInfoEntry(null, dstBook);
                Object.assign(dstEntry, entryPayload);
                hasDstChanges = true;

                if (!isCopy) {
                    if (typeof runtime.deleteWorldInfoEntry !== 'function') {
                        throw new Error('Move is unavailable: deleteWorldInfoEntry helper is missing.');
                    }
                    try {
                        const deleted = await runtime.deleteWorldInfoEntry(srcBook, uid, { silent:true });
                        if (deleted) {
                            if (typeof runtime.deleteWIOriginalDataValue === 'function') {
                                runtime.deleteWIOriginalDataValue(srcBook, uid);
                            }
                            hasSrcChanges = true;
                        } else {
                            failedUids.push(uid);
                        }
                    } catch (_error) {
                        failedUids.push(uid);
                    }
                }
            }

            if (hasConcurrentBookUpdate) {
                throw new Error('Lorebook changed during move/copy. No changes were saved.');
            }

            if (hasDstChanges) {
                await runtime.saveWorldInfo(targetBookName, dstBook, true);
                if (typeof runtime.updateWIChange === 'function') {
                    runtime.updateWIChange(targetBookName, dstBook);
                } else {
                    console.warn('[STWID] runtime.updateWIChange is unavailable for destination save.');
                }
            }

            if (!isCopy && sourceBookName !== targetBookName && hasSrcChanges) {
                await runtime.saveWorldInfo(sourceBookName, srcBook, true);
                if (typeof runtime.updateWIChange === 'function') {
                    runtime.updateWIChange(sourceBookName, srcBook);
                } else {
                    console.warn('[STWID] runtime.updateWIChange is unavailable for source save.');
                }
            }

            if (!isCopy && failedUids.length > 0) {
                keepOnlyFailedSelection(failedUids);
                const succeeded = Math.max(attemptedMoveCount - failedUids.length, 0);
                toastr.warning(`Move partially completed. ${succeeded} moved, ${failedUids.length} failed. Failed entries remain selected.`);
                return;
            }

            selectEnd();
        } catch (error) {
            console.error('[STWID] Failed to move/copy selected entries', error);
            const action = isCopy ? 'copy' : 'move';
            const reason = error instanceof Error ? error.message : 'Unknown error.';
            toastr.error(`Could not ${action} selected entries. ${reason}`);
        } finally {
            if (eventBus && worldInfoUpdatedEvent) {
                eventBus.removeListener(worldInfoUpdatedEvent, onWorldInfoUpdated);
            }
        }
    };

    const onBookDropTargetDragOver = (evt, book)=>{
        if (listPanelState.dragBookName) {
            evt.preventDefault();
            book.classList.add('stwid--state-target');
            return;
        }
        if (listPanelState.selectFrom === null) return;
        evt.preventDefault();
        book.classList.add('stwid--state-target');
    };

    const onBookDropTargetDragLeave = (_evt, book)=>{
        if (listPanelState.dragBookName) {
            book.classList.remove('stwid--state-target');
            return;
        }
        if (listPanelState.selectFrom === null) return;
        book.classList.remove('stwid--state-target');
    };

    const onBookDropTargetDrop = async(evt, targetBookName, book, getTargetFolder)=>{
        if (listPanelState.dragBookName) {
            evt.preventDefault();
            evt.stopPropagation();
            book.classList.remove('stwid--state-target');
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
