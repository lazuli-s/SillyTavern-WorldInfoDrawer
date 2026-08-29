const MENU_BUTTON_CLASS = 'menu_button';

export const createFoldersTabContent = ({ dom, registerFolderName, Popup, getListPanelApi }) => {
  const root = document.createElement('div');
  root.classList.add('stwid--browser-row');
  const foldersGroup = document.createElement('div');
  foldersGroup.classList.add('stwid--field-group', 'stwid--foldersGroup');
  dom.folderControls.group = foldersGroup;
  function createFolderActionButton({ controlKey, iconClass, title, onClick }) {
    const button = document.createElement('button');
    button.type = 'button';
    dom.folderControls[controlKey] = button;
    button.classList.add(
      MENU_BUTTON_CLASS,
      'fa-solid',
      'fa-fw',
      iconClass,
      `stwid--control-folder-${controlKey}`,
    );
    button.title = title;
    button.setAttribute('aria-label', title);
    button.addEventListener('click', onClick);
    foldersGroup.append(button);
    return button;
  }
  const foldersGroupLabel = document.createElement('span');
  foldersGroupLabel.classList.add('stwid--field-group__label');
  foldersGroupLabel.textContent = 'Folders';
  const foldersGroupHint = document.createElement('i');
  foldersGroupHint.classList.add(
    'fa-solid',
    'fa-fw',
    'fa-circle-question',
    'stwid--field-group__label-hint',
  );
  foldersGroupHint.title = 'Create, import, or collapse folders';
  foldersGroupLabel.append(foldersGroupHint);
  foldersGroup.append(foldersGroupLabel);

  createFolderActionButton({
    controlKey: 'add',
    iconClass: 'fa-folder-plus',
    title: 'New Folder',
    onClick: async () => {
      try {
        const folderName = await Popup.show.input(
          'Create a new folder',
          'Enter a name for the new folder:',
          'New Folder',
        );
        // Cancel-only guard: the popup resolves a confirmed empty input as '',
        // which must reach `registerFolderName` so its 'empty' branch can warn.
        if (folderName === null || folderName === undefined) return;
        const result = registerFolderName(folderName);
        if (!result.ok) {
          if (result.reason === 'invalid') {
            toastr.error('Folder names cannot include "/".');
            return;
          }
          if (result.reason === 'duplicate') {
            toastr.warning('A folder with that name already exists.');
            return;
          }
          if (result.reason === 'storage') {
            toastr.error('Could not save the folder: browser storage refused the write.');
            return;
          }
          toastr.warning('Folder name cannot be empty.');
          return;
        }
      } catch (error) {
        console.error('[STWID] Failed to create folder', error);
        toastr.error('Could not create the folder. Please try again.');
        return;
      }
      // Separate guard: past this point the folder IS persisted, so the
      // message must not claim creation failed.
      try {
        await getListPanelApi()?.refreshList?.();
      } catch (error) {
        console.error('[STWID] Folder created but list refresh failed', error);
        toastr.error('Folder created, but refreshing the book list failed.');
      }
    },
  });

  createFolderActionButton({
    controlKey: 'import',
    iconClass: 'fa-file-import',
    title: 'Import Folder',
    onClick: () => {
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
  collapseAllFoldersToggle.addEventListener('click', () => {
    const listPanelApi = getListPanelApi();
    const shouldCollapse = listPanelApi.hasExpandedFolders();
    listPanelApi.setAllFoldersCollapsed(shouldCollapse);
    listPanelApi.updateCollapseAllFoldersToggle();
  });
  foldersGroup.append(collapseAllFoldersToggle);

  root.append(foldersGroup);
  return root;
};
