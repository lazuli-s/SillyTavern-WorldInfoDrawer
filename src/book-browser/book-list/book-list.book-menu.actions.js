import { createBookMenuActionItem } from './book-list.book-menu.item.js';

const MOVE_BOOK_ACTION_LABEL = 'moving a book';

export const createBookCrudHandlers = ({
  state,
  refreshList,
  setBookFolder,
  setSelectedBookInCoreUi,
  clickCoreUiAction,
  coreUiActionSelectors,
}) => {
  const duplicateBook = async (name) => {
    const getNames = () => (state.getWorldNames ? state.getWorldNames() : state.world_names);
    const initialNames = [...(getNames() ?? [])];
    const initialNameSet = new Set(initialNames);
    const selected = await setSelectedBookInCoreUi(name);
    if (!selected) return null;

    const clicked = await clickCoreUiAction(coreUiActionSelectors.duplicateBook);
    if (!clicked) return null;

    const findNewName = () => {
      const currentNames = getNames() ?? [];
      const addedNames = currentNames.filter((entry) => !initialNameSet.has(entry));
      return addedNames.length === 1 ? addedNames[0] : null;
    };

    const immediate = findNewName();
    if (immediate) return immediate;

    const timeoutMs = 8000;

    if (state.waitForWorldInfoUpdate) {
      const updated = await Promise.race([
        state.waitForWorldInfoUpdate().then(() => true),
        state.delay(timeoutMs).then(() => false),
      ]);
      return updated ? findNewName() : null;
    }

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await state.delay(250);
      const next = findNewName();
      if (next) return next;
    }
    return null;
  };

  const duplicateBookIntoFolder = async (name, folderName) => {
    const duplicatedName = await duplicateBook(name);
    if (!duplicatedName) return false;
    await setBookFolder(duplicatedName, folderName);
    await refreshList();
    return true;
  };

  const deleteBook = async (name, { skipConfirm = false } = {}) => {
    if (skipConfirm && state.deleteWorldInfo) {
      await state.deleteWorldInfo(name);
      return;
    }
    const selected = await setSelectedBookInCoreUi(name);
    if (!selected) return;

    await clickCoreUiAction(coreUiActionSelectors.deleteBook);
  };

  return {
    deleteBook,
    duplicateBook,
    duplicateBookIntoFolder,
  };
};

export const createMoveBookDialogHelpers = ({
  listPanelState,
  state,
  folderDeps,
  applyBookFolderChange,
  abortIfUnsavedChanges,
}) => {
  const getSortedFolderNamesForMoveDialog = () =>
    Array.from(
      new Set([...folderDeps.getFolderRegistry(), ...listPanelState.getFolderDomNames()]),
    ).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const createMoveBookDialogShell = (cleanName) => {
    const modal = document.createElement('dialog');
    modal.classList.add('popup');
    modal.addEventListener('click', (evt) => {
      if (evt.target === modal) {
        modal.close();
      }
    });
    modal.addEventListener('close', () => {
      modal.remove();
    });

    const popupBody = document.createElement('div');
    popupBody.classList.add('popup-body');

    const popupContent = document.createElement('div');
    popupContent.classList.add('popup-content', 'stwid--move-book-content');

    const title = document.createElement('h3');
    title.textContent = `Move "${cleanName}" to folder`;
    popupContent.append(title);

    popupBody.append(popupContent);
    modal.append(popupBody);

    return { modal, popupContent };
  };

  const handleCreateFolderAndMoveBook = async ({ name, modal }) => {
    const nextName = await state.Popup?.show.input(
      'Create folder',
      'Enter a new folder name:',
      'New Folder',
    );
    if (!nextName) return;
    const folderRegistrationResult = folderDeps.registerFolderName(nextName);
    if (!folderRegistrationResult.ok) {
      if (folderRegistrationResult.reason === 'empty') {
        toastr.warning('Folder name cannot be empty.');
      } else if (folderRegistrationResult.reason === 'duplicate') {
        toastr.warning(
          'A folder with that name already exists. Select it from the dropdown instead.',
        );
      } else {
        toastr.error('Folder names cannot include "/".');
      }
      return;
    }
    if (abortIfUnsavedChanges(MOVE_BOOK_ACTION_LABEL)) return;
    await applyBookFolderChange(name, folderRegistrationResult.folder, {
      centerAfterRefresh: true,
    });
    modal.close();
  };

  const handleMoveBookToSelectedFolder = async ({ selectedFolder, currentFolder, name, modal }) => {
    if (!selectedFolder) return;
    if (selectedFolder === currentFolder) {
      toastr.info('Book is already in that folder.');
      return;
    }
    if (abortIfUnsavedChanges(MOVE_BOOK_ACTION_LABEL)) return;
    await applyBookFolderChange(name, selectedFolder, { centerAfterRefresh: true });
    modal.close();
  };

  const buildMoveBookSelectionRow = ({ folderNames, currentFolder, name, modal }) => {
    const row = document.createElement('div');
    row.classList.add('stwid--list-dropdown__item', 'stwid--menu-item', 'stwid--move-book-row');

    const select = document.createElement('select');
    select.classList.add('text_pole');
    select.disabled = folderNames.length === 0;
    if (folderNames.length === 0) {
      const emptyOption = document.createElement('option');
      emptyOption.textContent = '(no folders yet)';
      emptyOption.value = '';
      emptyOption.selected = true;
      select.append(emptyOption);
    } else {
      for (const folderName of folderNames) {
        const option = document.createElement('option');
        option.value = folderName;
        option.textContent = folderName;
        if (folderName === currentFolder) option.selected = true;
        select.append(option);
      }
    }
    row.append(select);

    const buttonRow = document.createElement('div');
    buttonRow.classList.add('stwid--move-book-quick-actions');

    const createFolderButton = document.createElement('button');
    createFolderButton.classList.add('menu_button', 'interactable');
    createFolderButton.title = 'New Folder';
    createFolderButton.setAttribute('aria-label', 'New Folder');
    const createFolderIcon = document.createElement('i');
    createFolderIcon.classList.add('fa-solid', 'fa-fw', 'fa-folder-plus');
    createFolderButton.append(createFolderIcon);
    createFolderButton.addEventListener('click', async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      await handleCreateFolderAndMoveBook({ name, modal });
    });
    buttonRow.append(createFolderButton);

    const noFolderButton = document.createElement('button');
    noFolderButton.classList.add('menu_button', 'interactable');
    noFolderButton.title = 'No Folder';
    noFolderButton.setAttribute('aria-label', 'No Folder');
    const noFolderIcon = document.createElement('i');
    noFolderIcon.classList.add('fa-solid', 'fa-fw', 'fa-folder-minus');
    noFolderButton.append(noFolderIcon);
    noFolderButton.addEventListener('click', async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      if (!currentFolder) {
        toastr.info('Book is already not in a folder.');
        return;
      }
      if (abortIfUnsavedChanges(MOVE_BOOK_ACTION_LABEL)) return;
      await applyBookFolderChange(name, null, { centerAfterRefresh: true });
      modal.close();
    });
    buttonRow.append(noFolderButton);

    row.append(buttonRow);
    return { row, select };
  };

  const buildMoveBookPrimaryButtons = ({ folderNames, currentFolder, select, name, modal }) => {
    const buttonRow = document.createElement('div');
    buttonRow.classList.add(
      'stwid--moveBookButtons',
      'stwid--moveBookButtons--primary',
      'popup-controls',
    );

    const saveButton = document.createElement('button');
    saveButton.classList.add('menu_button', 'popup-button-ok');
    saveButton.textContent = 'Save';
    saveButton.disabled = folderNames.length === 0;
    saveButton.addEventListener('click', async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const selectedFolder = select.disabled ? null : select.value;
      await handleMoveBookToSelectedFolder({ selectedFolder, currentFolder, name, modal });
    });
    buttonRow.append(saveButton);

    const cancelButton = document.createElement('button');
    cancelButton.classList.add('menu_button', 'popup-button-cancel');
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      modal.close();
    });
    buttonRow.append(cancelButton);

    return buttonRow;
  };

  const buildMoveBookMenuItem = (name, closeMenu) => {
    if (typeof name !== 'string') return null;
    const { DOMPurify } = SillyTavern.libs;
    const cleanName = DOMPurify.sanitize(name);
    return createBookMenuActionItem({
      itemClass: 'stwid--moveToFolder',
      iconClass: 'fa-folder-tree',
      labelText: 'Move Book to Folder',
      onClick: async (evt) => {
        evt.stopPropagation();
        closeMenu?.();

        const currentFolder = folderDeps.getFolderFromMetadata(state.cache[name]?.metadata);
        const folderNames = getSortedFolderNamesForMoveDialog();
        const { modal, popupContent } = createMoveBookDialogShell(cleanName);
        const { row, select } = buildMoveBookSelectionRow({
          folderNames,
          currentFolder,
          name,
          modal,
        });
        popupContent.append(row);
        popupContent.append(
          buildMoveBookPrimaryButtons({ folderNames, currentFolder, select, name, modal }),
        );
        document.body.append(modal);
        modal.showModal();
      },
    });
  };

  return {
    buildMoveBookMenuItem,
  };
};
