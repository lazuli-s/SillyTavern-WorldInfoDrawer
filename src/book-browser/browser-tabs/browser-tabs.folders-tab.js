export const createFoldersTabContent = ({
    dom,
    registerFolderName,
    Popup,
    getListPanelApi,
})=>{
    const root = document.createElement('div');
    const foldersGroup = document.createElement('div');
    foldersGroup.classList.add('stwid--thinContainer', 'stwid--foldersGroup');
    dom.folderControls.group = foldersGroup;
    const foldersGroupLabel = document.createElement('span');
    foldersGroupLabel.classList.add('stwid--thinContainerLabel');
    foldersGroupLabel.textContent = 'Folders';
    const foldersGroupHint = document.createElement('i');
    foldersGroupHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
    foldersGroupHint.title = 'Create, import, or collapse folders';
    foldersGroupLabel.append(foldersGroupHint);
    foldersGroup.append(foldersGroupLabel);

    const addFolder = document.createElement('div');
    dom.folderControls.add = addFolder;
    addFolder.classList.add('menu_button', 'fa-solid', 'fa-fw', 'fa-folder-plus', 'stwid--control-folder-add');
    addFolder.title = 'New Folder';
    addFolder.setAttribute('aria-label', 'New Folder');
    addFolder.addEventListener('click', async()=>{
        const folderName = await Popup.show.input('Create a new folder', 'Enter a name for the new folder:', 'New Folder');
        if (!folderName) return;
        const result = registerFolderName(folderName);
        if (!result.ok) {
            if (result.reason === 'invalid') {
                toastr.error('Folder names cannot include "/".');
                return;
            }
            toastr.warning('Folder name cannot be empty.');
            return;
        }
        await getListPanelApi()?.refreshList?.();
    });
    foldersGroup.append(addFolder);

    const impFolder = document.createElement('div');
    dom.folderControls.import = impFolder;
    impFolder.classList.add('menu_button', 'fa-solid', 'fa-fw', 'fa-file-import', 'stwid--control-folder-import');
    impFolder.title = 'Import Folder';
    impFolder.setAttribute('aria-label', 'Import Folder');
    impFolder.addEventListener('click', ()=>{
        getListPanelApi()?.openFolderImportDialog?.();
    });
    foldersGroup.append(impFolder);

    const collapseAllFoldersToggle = document.createElement('button');
    dom.collapseAllFoldersToggle = collapseAllFoldersToggle;
    dom.folderControls.collapseAll = collapseAllFoldersToggle;
    collapseAllFoldersToggle.type = 'button';
    collapseAllFoldersToggle.classList.add('menu_button', 'stwid--collapseAllFoldersToggle');
    const collapseFoldersIcon = document.createElement('i');
    collapseFoldersIcon.classList.add('fa-solid', 'fa-fw');
    collapseAllFoldersToggle.append(collapseFoldersIcon);
    collapseAllFoldersToggle.addEventListener('click', ()=>{
        const listPanelApi = getListPanelApi();
        const shouldCollapse = listPanelApi.hasExpandedFolders();
        listPanelApi.setAllFoldersCollapsed(shouldCollapse);
        listPanelApi.updateCollapseAllFoldersToggle();
    });
    foldersGroup.append(collapseAllFoldersToggle);

    root.append(foldersGroup);
    return root;
};
