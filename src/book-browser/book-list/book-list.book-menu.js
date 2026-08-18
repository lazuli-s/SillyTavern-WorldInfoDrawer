import { createExtensionIntegrationsSlice } from './book-list.extension-integrations.js';
import { addKeyboardClickSupport, createBookMenuActionItem } from './book-list.book-menu.item.js';
import { createBookImportHandlers } from './book-list.book-menu.import.js';
import {
  createBookCrudHandlers,
  createMoveBookDialogHelpers,
} from './book-list.book-menu.actions.js';

const UNSAVED_EDITS_WARNING_PREFIX = 'Unsaved edits detected. Save or discard changes before';

const createBookMenuTriggerButton = () => {
  const menuTrigger = document.createElement('div');
  menuTrigger.classList.add(
    'stwid--action',
    'stwid--list-dropdown__trigger',
    'fa-solid',
    'fa-fw',
    'fa-ellipsis-vertical',
  );
  menuTrigger.title = 'Book menu';
  menuTrigger.setAttribute('aria-label', 'Book menu');
  menuTrigger.setAttribute('aria-expanded', 'false');
  menuTrigger.setAttribute('aria-haspopup', 'true');
  addKeyboardClickSupport(menuTrigger);
  return menuTrigger;
};

const createBookMenuOverlay = (menuTrigger) => {
  menuTrigger.style.anchorName = '--stwid--ctx-anchor';
  const blocker = document.createElement('div');
  blocker.classList.add('stwid--blocker');
  for (const eventName of ['mousedown', 'pointerdown', 'touchstart']) {
    blocker.addEventListener(eventName, (evt) => {
      evt.stopPropagation();
    });
  }
  const closeMenu = () => {
    blocker.remove();
    menuTrigger.style.anchorName = '';
    menuTrigger.setAttribute('aria-expanded', 'false');
    menuTrigger.focus();
  };
  blocker.addEventListener('click', (evt) => {
    evt.stopPropagation();
    closeMenu();
  });
  const menu = document.createElement('div');
  menu.classList.add('stwid--list-dropdown__menu', 'stwid--menu');
  menu.setAttribute('role', 'menu');
  menuTrigger.setAttribute('aria-expanded', 'true');
  return { blocker, menu, closeMenu };
};

const buildRenameBookMenuItem = (
  name,
  closeMenu,
  { setSelectedBookInCoreUi, clickCoreUiAction, coreUiActionSelectors },
) =>
  createBookMenuActionItem({
    itemClass: 'stwid--rename',
    iconClass: 'fa-pencil',
    labelText: 'Rename Book',
    onClick: async () => {
      closeMenu?.();
      const selected = await setSelectedBookInCoreUi(name);
      if (!selected) return;
      await clickCoreUiAction(coreUiActionSelectors.renameBook);
    },
  });

const buildFillTitlesMenuItem = (name, closeMenu, { abortIfUnsavedChanges, state }) =>
  createBookMenuActionItem({
    itemClass: 'stwid--fillTitles',
    iconClass: 'fa-wand-magic-sparkles',
    labelText: 'Fill Empty Titles',
    onClick: async () => {
      if (abortIfUnsavedChanges('filling titles')) return;
      await state.fillEmptyTitlesWithKeywords(name);
      closeMenu?.();
    },
  });

const buildBookSortSelect = (
  name,
  closeMenu,
  { state, getBookSortChoice, setBookSortPreference },
) => {
  const sortSelect = document.createElement('select');
  sortSelect.classList.add('text_pole');
  sortSelect.addEventListener('click', (evt) => evt.stopPropagation());

  const hasCustomSort = Boolean(state.cache[name].sort);
  const { sort, direction } = getBookSortChoice(name);
  const globalLabel =
    state.getSortLabel(state.Settings.instance.sortLogic, state.Settings.instance.sortDirection) ??
    'Global default';
  const globalOption = document.createElement('option');
  globalOption.value = 'null';
  globalOption.textContent = `Use global (${globalLabel})`;
  globalOption.selected = !hasCustomSort;
  sortSelect.append(globalOption);
  state.appendSortOptions(sortSelect, sort, direction);

  sortSelect.addEventListener('change', async () => {
    const value = sortSelect.value === 'null' ? null : JSON.parse(sortSelect.value);
    if (value) {
      await setBookSortPreference(name, value.sort, value.direction);
    } else {
      await setBookSortPreference(name, null, null);
    }
    closeMenu();
  });

  return sortSelect;
};

const buildBookSortMenuRow = (name, closeMenu, deps) => {
  const bookSort = document.createElement('div');
  bookSort.classList.add('stwid--list-dropdown__item', 'stwid--menu-item', 'stwid--book-sort');
  bookSort.addEventListener('click', (evt) => evt.stopPropagation());

  const sortIcon = document.createElement('i');
  sortIcon.classList.add('stwid--icon', 'fa-solid', 'fa-fw', 'fa-list-ol');
  bookSort.append(sortIcon);

  const label = document.createElement('span');
  label.classList.add('stwid--label');
  label.textContent = 'Book Sort';
  bookSort.append(label);

  bookSort.append(buildBookSortSelect(name, closeMenu, deps));
  return bookSort;
};

const buildEntryManagerMenuItem = (name, closeMenu, { state }) =>
  createBookMenuActionItem({
    itemClass: 'stwid--entry-manager',
    iconClass: 'fa-arrow-down-wide-short',
    labelText: 'Entry Manager',
    onClick: () => {
      state.openEntryManager(name, [name]);
      closeMenu?.();
    },
    enableKeyboard: false,
  });

const buildExportBookMenuItem = (name, closeMenu, { state }) =>
  createBookMenuActionItem({
    itemClass: 'stwid--export',
    iconClass: 'fa-file-export',
    labelText: 'Export Book',
    onClick: async () => {
      state.download(
        JSON.stringify({
          entries: structuredClone(state.cache[name].entries),
          metadata: structuredClone(state.cache[name].metadata ?? {}),
        }),
        name,
        'application/json',
      );
      closeMenu?.();
    },
  });

const buildDuplicateBookMenuItem = (name, closeMenu, { duplicateBook }) =>
  createBookMenuActionItem({
    itemClass: 'stwid--duplicate',
    iconClass: 'fa-paste',
    labelText: 'Duplicate Book',
    onClick: async () => {
      await duplicateBook(name);
      closeMenu?.();
    },
  });

const buildDeleteBookMenuItem = (name, closeMenu, { deleteBook }) =>
  createBookMenuActionItem({
    itemClass: 'stwid--delete',
    iconClass: 'fa-trash-can',
    labelText: 'Delete Book',
    onClick: async () => {
      await deleteBook(name);
      closeMenu?.();
    },
  });

const createBookMenuUiHelpers = ({
  state,
  getBookSortChoice,
  setBookSortPreference,
  setSelectedBookInCoreUi,
  clickCoreUiAction,
  coreUiActionSelectors,
  abortIfUnsavedChanges,
  buildMoveBookMenuItem,
  appendIntegrationMenuItems,
  duplicateBook,
  deleteBook,
}) => {
  const appendCoreBookMenuItems = (menu, name, closeMenu) => {
    menu.append(
      buildRenameBookMenuItem(name, closeMenu, {
        setSelectedBookInCoreUi,
        clickCoreUiAction,
        coreUiActionSelectors,
      }),
    );

    const moveBook = buildMoveBookMenuItem(name, closeMenu);
    if (moveBook) menu.append(moveBook);

    menu.append(
      buildFillTitlesMenuItem(name, closeMenu, {
        abortIfUnsavedChanges,
        state,
      }),
    );
    menu.append(
      buildBookSortMenuRow(name, closeMenu, {
        state,
        getBookSortChoice,
        setBookSortPreference,
      }),
    );
    menu.append(buildEntryManagerMenuItem(name, closeMenu, { state }));
    menu.append(buildExportBookMenuItem(name, closeMenu, { state }));
    menu.append(buildDuplicateBookMenuItem(name, closeMenu, { duplicateBook }));
    menu.append(buildDeleteBookMenuItem(name, closeMenu, { deleteBook }));
  };

  const buildBookMenuTrigger = (name) => {
    const menuTrigger = createBookMenuTriggerButton();
    menuTrigger.addEventListener('click', () => {
      const { blocker, menu, closeMenu } = createBookMenuOverlay(menuTrigger);
      appendCoreBookMenuItems(menu, name, closeMenu);
      appendIntegrationMenuItems(menu, name, closeMenu);
      blocker.append(menu);
      document.body.append(blocker);
    });
    return menuTrigger;
  };

  return {
    buildBookMenuTrigger,
  };
};

const createBookMenuSlice = ({
  listPanelState,
  runtime: state,
  coreUiSelectors,
  coreUiActionSelectors,
  folderDeps,
  setSelectedBookInCoreUi,
  clickCoreUiAction,
  getBookSortChoice,
  refreshList,
  setBookFolder,
  setBookSortPreference,
  applyBookFolderChange,
}) => {
  const abortIfUnsavedChanges = (actionLabel) => {
    if (!state.isDirtyCheck?.()) return false;
    toastr.warning(`${UNSAVED_EDITS_WARNING_PREFIX} ${actionLabel}.`);
    return true;
  };

  const importHandlers = createBookImportHandlers({
    listPanelState,
    state,
    coreUiSelectors,
    folderDeps,
    refreshList,
  });

  const crudHandlers = createBookCrudHandlers({
    state,
    refreshList,
    setBookFolder,
    setSelectedBookInCoreUi,
    clickCoreUiAction,
    coreUiActionSelectors,
  });

  const moveDialogHelpers = createMoveBookDialogHelpers({
    listPanelState,
    state,
    folderDeps,
    applyBookFolderChange,
    abortIfUnsavedChanges,
  });

  const { appendIntegrationMenuItems } = createExtensionIntegrationsSlice({
    extensionNames: state.extensionNames,
    getRequestHeaders: state.getRequestHeaders,
    executeSlashCommand: state.executeSlashCommand,
    setSelectedBookInCoreUi,
    clickCoreUiAction,
    createBookMenuActionItem,
  });

  const menuUiHelpers = createBookMenuUiHelpers({
    state,
    getBookSortChoice,
    setBookSortPreference,
    setSelectedBookInCoreUi,
    clickCoreUiAction,
    coreUiActionSelectors,
    abortIfUnsavedChanges,
    buildMoveBookMenuItem: moveDialogHelpers.buildMoveBookMenuItem,
    appendIntegrationMenuItems,
    duplicateBook: crudHandlers.duplicateBook,
    deleteBook: crudHandlers.deleteBook,
  });

  return {
    buildBookMenuTrigger: menuUiHelpers.buildBookMenuTrigger,
    deleteBook: crudHandlers.deleteBook,
    duplicateBookIntoFolder: crudHandlers.duplicateBookIntoFolder,
    openFolderImportDialog: importHandlers.openFolderImportDialog,
    openImportDialog: importHandlers.openImportDialog,
  };
};

export { createBookMenuSlice };
