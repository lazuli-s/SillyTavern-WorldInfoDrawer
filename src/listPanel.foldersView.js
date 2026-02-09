import { createFolderDom, setFolderCollapsed } from './lorebookFolders.js';
import { setFolderCollapsedAndPersist } from './listPanel.state.js';

const createFoldersViewSlice = ({
    listPanelState,
    runtime,
    selectionDnDSlice,
})=>{
    const hasExpandedFolders = ()=>listPanelState.getFolderDomValues().some((folderDom)=>{
        const books = folderDom?.books;
        return books && !books.classList.contains('stwid--isCollapsed');
    });

    const updateCollapseAllFoldersToggle = ()=>{
        const hasExpanded = hasExpandedFolders();
        const btn = runtime.dom.collapseAllFoldersToggle;
        if (!btn) return;
        const icon = btn.querySelector('i');
        icon?.classList.toggle('fa-folder-tree', hasExpanded);
        icon?.classList.toggle('fa-folder-open', !hasExpanded);
        const label = hasExpanded ? 'Collapse All Folders' : 'Expand All Folders';
        btn.title = label;
        btn.setAttribute('aria-label', label);
        btn.setAttribute('aria-pressed', hasExpanded ? 'true' : 'false');
    };

    const setAllFoldersCollapsed = (isCollapsed)=>{
        const folderNames = listPanelState.getFolderDomNames();
        for (const folderName of folderNames) {
            setFolderCollapsedAndPersist(folderName, isCollapsed, { transientExpand: !isCollapsed });
        }
        updateCollapseAllFoldersToggle();
    };

    const createFolderDomForList = (folderName)=>{
        const folderDom = createFolderDom({
            folderName,
            onToggle: ()=>{
                const isCollapsed = !listPanelState.getFolderDom(folderName)?.books.classList.contains('stwid--isCollapsed');
                setFolderCollapsedAndPersist(folderName, isCollapsed);
                updateCollapseAllFoldersToggle();
            },
            onDragStateChange: (isOver)=>selectionDnDSlice()?.onFolderDropTargetDragStateChange(isOver),
            onDrop: async(evt)=>selectionDnDSlice()?.onFolderDropTargetDrop(evt, folderName),
            menuActions: listPanelState.folderMenuActions,
        });
        listPanelState.setFolderDom(folderName, folderDom);
        return folderDom;
    };

    const insertFolderDomSorted = (folderDom, parent = runtime.dom.books)=>{
        let insertBefore = null;
        const normalizedFolder = (folderDom?.root?.dataset?.folder ?? '').toLowerCase();
        for (const child of parent.children) {
            if (child.classList.contains('stwid--folder')) {
                const childName = child.dataset.folder?.toLowerCase() ?? '';
                if (childName.localeCompare(normalizedFolder) > 0) {
                    insertBefore = child;
                    break;
                }
                continue;
            }
            if (child.classList.contains('stwid--book')) {
                insertBefore = child;
                break;
            }
        }
        if (insertBefore) insertBefore.insertAdjacentElement('beforebegin', folderDom.root);
        else parent.append(folderDom.root);
    };

    const ensureFolderDom = (folderName, parent = runtime.dom.books)=>{
        let folderDom = listPanelState.getFolderDom(folderName);
        if (!folderDom) {
            folderDom = createFolderDomForList(folderName);
            insertFolderDomSorted(folderDom, parent);
        } else if (!folderDom.root.parentElement) {
            insertFolderDomSorted(folderDom, parent);
        }
        const initialCollapsed = listPanelState.folderCollapseStates[folderName] ?? true;
        setFolderCollapsed(folderDom, initialCollapsed);
        updateCollapseAllFoldersToggle();
        return folderDom;
    };

    const resetFolderDoms = ()=>{
        for (const folderDom of listPanelState.getFolderDomValues()) {
            folderDom.observer?.disconnect();
        }
        listPanelState.clearFolderDoms();
    };

    const updateFolderVisibility = ({ isBookDomFilteredOut })=>{
        for (const folderDom of listPanelState.getFolderDomValues()) {
            const hasVisibleBooks = Array.from(folderDom.books.children).some((child)=>{
                if (!(child instanceof HTMLElement)) return false;
                if (!child.classList.contains('stwid--book')) return false;
                return !isBookDomFilteredOut(child);
            });
            folderDom.root.hidden = !hasVisibleBooks;
        }
    };

    const updateFolderActiveToggles = ({ isBookDomFilteredOut })=>{
        for (const folderDom of listPanelState.getFolderDomValues()) {
            folderDom.updateActiveToggle?.();
        }
        updateFolderVisibility({ isBookDomFilteredOut });
    };

    return {
        ensureFolderDom,
        hasExpandedFolders,
        resetFolderDoms,
        setAllFoldersCollapsed,
        updateCollapseAllFoldersToggle,
        updateFolderActiveToggles,
        updateFolderVisibility,
    };
};

export { createFoldersViewSlice };
