const MENU_BUTTON_CLASS = 'menu_button';

export const createFoldersTabContent = ({
    dom,
    registerFolderName,
    Popup,
    getListPanelApi,
})=>{
    const root = document.createElement('div');
    root.classList.add('stwid--browserRow');
    const foldersGroup = document.createElement('div');
    foldersGroup.classList.add('stwid--thinContainer', 'stwid--foldersGroup');
    dom.folderControls.group = foldersGroup;
    function createFolderActionButton({ controlKey, iconClass, title, onClick }) {
        const button = document.createElement('div');
        dom.folderControls[controlKey] = button;
        button.classList.add(MENU_BUTTON_CLASS, 'fa-solid', 'fa-fw', iconClass, `stwid--control-folder-${controlKey}`);
        button.title = title;
        button.setAttribute('aria-label', title);
        button.addEventListener('click', onClick);
        foldersGroup.append(button);
        return button;
    }
    const foldersGroupLabel = document.createElement('span');
    foldersGroupLabel.classList.add('stwid--thinContainerLabel');
    foldersGroupLabel.textContent = 'Folders';
    const foldersGroupHint = document.createElement('i');
    foldersGroupHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
    foldersGroupHint.title = 'Create, import, or collapse folders';
    foldersGroupLabel.append(foldersGroupHint);
    foldersGroup.append(foldersGroupLabel);

    createFolderActionButton({
        controlKey: 'add',
        iconClass: 'fa-folder-plus',
        title: 'New Folder',
        onClick: async()=>{
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
        },
    });

    createFolderActionButton({
        controlKey: 'import',
        iconClass: 'fa-file-import',
        title: 'Import Folder',
        onClick: ()=>{
            getListPanelApi()?.openFolderImportDialog?.();
        },
    });

    const collapseAllFoldersToggle = document.createElement('button');
    dom.collapseAllFoldersToggle = collapseAllFoldersToggle;
    dom.folderControls.collapseAll = collapseAllFoldersToggle;
    collapseAllFoldersToggle.type = 'button';
    collapseAllFoldersToggle.classList.add(MENU_BUTTON_CLASS, 'stwid--collapseAllFoldersToggle');
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
