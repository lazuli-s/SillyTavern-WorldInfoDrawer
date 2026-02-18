import { createFolderDom, getFolderFromMetadata, setFolderCollapsed } from './lorebookFolders.js';
import { persistFolderCollapseStates, setFolderCollapsedAndPersist } from './listPanel.state.js';

const createFoldersViewSlice = ({
    listPanelState,
    runtime,
    selectionDnDSlice,
})=>{
    let bulkFolderCollapsedIntent = null;

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
        const nextCollapsed = Boolean(isCollapsed);
        bulkFolderCollapsedIntent = nextCollapsed;
        const folderNames = listPanelState.getFolderDomNames();
        for (const folderName of folderNames) {
            setFolderCollapsedAndPersist(folderName, nextCollapsed, {
                transientExpand: !nextCollapsed,
                persist: false,
            });
        }
        if (nextCollapsed) {
            persistFolderCollapseStates();
        }
        updateCollapseAllFoldersToggle();
    };

    const createFolderDomForList = (folderName)=>{
        const folderDom = createFolderDom({
            folderName,
            onToggle: ()=>{
                const folderDom = listPanelState.getFolderDom(folderName);
                const books = folderDom?.books;
                if (!books) return;
                bulkFolderCollapsedIntent = null;
                const isCollapsed = !books.classList.contains('stwid--isCollapsed');
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
        const initialCollapsed = bulkFolderCollapsedIntent
            ?? listPanelState.getFolderCollapseState(folderName)
            ?? true;
        setFolderCollapsed(folderDom, initialCollapsed);
        updateCollapseAllFoldersToggle();
        return folderDom;
    };

    const resetFolderDoms = ()=>{
        bulkFolderCollapsedIntent = null;
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

    const getVisibleFolderBooks = ({ isBookDomFilteredOut })=>{
        const visibleBooksByFolder = Object.create(null);
        for (const [bookName, bookData] of Object.entries(runtime.cache ?? {})) {
            const folderName = getFolderFromMetadata(bookData?.metadata);
            if (!folderName) continue;
            const bookRoot = bookData?.dom?.root;
            if (!bookRoot || isBookDomFilteredOut(bookRoot)) continue;
            visibleBooksByFolder[folderName] ??= [];
            visibleBooksByFolder[folderName].push(bookName);
        }
        return visibleBooksByFolder;
    };

    const updateFolderActiveToggles = ({ isBookDomFilteredOut })=>{
        const visibleBooksByFolder = getVisibleFolderBooks({ isBookDomFilteredOut });
        for (const folderDom of listPanelState.getFolderDomValues()) {
            const folderName = folderDom?.root?.dataset?.folder ?? '';
            folderDom.updateActiveToggle?.(visibleBooksByFolder[folderName] ?? []);
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
