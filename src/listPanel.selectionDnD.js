import { resetSelectionMemory } from './listPanel.state.js';

const createSelectionDnDSlice = ({
    listPanelState,
    runtime,
    handleDraggedBookMoveOrCopy,
})=>{
    const selectEnd = ()=>{
        resetSelectionMemory((toast)=>toastr.clear(toast));
        runtime.dom.books.classList.remove('stwid--isDragging');
        [...runtime.dom.books.querySelectorAll('.stwid--entry.stwid--isSelected')]
            .forEach((item)=>{
                item.classList.remove('stwid--isSelected');
                item.removeAttribute('draggable');
                const icon = item.querySelector('.stwid--selector > .stwid--icon');
                icon.classList.add('fa-square');
                icon.classList.remove('fa-square-check');
            })
        ;
        [...runtime.dom.books.querySelectorAll('.stwid--book.stwid--isTarget')]
            .forEach((item)=>{
                item.classList.remove('stwid--isTarget');
            })
        ;
    };

    const selectAdd = (entry)=>{
        entry.classList.add('stwid--isSelected');
        entry.setAttribute('draggable', 'true');
        const icon = entry.querySelector('.stwid--selector > .stwid--icon');
        icon.classList.remove('fa-square');
        icon.classList.add('fa-square-check');
    };

    const selectRemove = (entry)=>{
        entry.classList.remove('stwid--isSelected');
        entry.setAttribute('draggable', 'false');
        const icon = entry.querySelector('.stwid--selector > .stwid--icon');
        icon.classList.add('fa-square');
        icon.classList.remove('fa-square-check');
    };

    const moveOrCopySelectedEntriesToBook = async(targetBookName, isCopy)=>{
        if (!listPanelState.selectList?.length) {
            selectEnd();
            return;
        }
        if (listPanelState.selectFrom !== targetBookName || isCopy) {
            const srcBook = await runtime.loadWorldInfo(listPanelState.selectFrom);
            const dstBook = await runtime.loadWorldInfo(targetBookName);

            let hasDstChanges = false;
            let hasSrcChanges = false;
            for (const uid of listPanelState.selectList) {
                const srcEntry = srcBook.entries[uid];
                if (!srcEntry) continue;

                const entryPayload = Object.assign({}, srcEntry);
                delete entryPayload.uid;

                const dstEntry = runtime.createWorldInfoEntry(null, dstBook);
                Object.assign(dstEntry, entryPayload);
                hasDstChanges = true;

                if (!isCopy) {
                    const deleted = await runtime.deleteWorldInfoEntry(srcBook, uid, { silent:true });
                    if (deleted) {
                        runtime.deleteWIOriginalDataValue(srcBook, uid);
                        hasSrcChanges = true;
                    }
                }
            }

            if (hasDstChanges) {
                await runtime.saveWorldInfo(targetBookName, dstBook, true);
                runtime.updateWIChange(targetBookName, dstBook);
            }

            if (!isCopy && listPanelState.selectFrom !== targetBookName && hasSrcChanges) {
                await runtime.saveWorldInfo(listPanelState.selectFrom, srcBook, true);
                runtime.updateWIChange(listPanelState.selectFrom, srcBook);
            }
        }
        selectEnd();
    };

    const onBookDropTargetDragOver = (evt, book)=>{
        if (listPanelState.dragBookName) {
            evt.preventDefault();
            book.classList.add('stwid--isTarget');
            return;
        }
        if (listPanelState.selectFrom === null) return;
        evt.preventDefault();
        book.classList.add('stwid--isTarget');
    };

    const onBookDropTargetDragLeave = (_evt, book)=>{
        if (listPanelState.dragBookName) {
            book.classList.remove('stwid--isTarget');
            return;
        }
        if (listPanelState.selectFrom === null) return;
        book.classList.remove('stwid--isTarget');
    };

    const onBookDropTargetDrop = async(evt, targetBookName, book, getTargetFolder)=>{
        if (listPanelState.dragBookName) {
            evt.preventDefault();
            evt.stopPropagation();
            book.classList.remove('stwid--isTarget');
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
