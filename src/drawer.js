import {
  createNewWorldInfo,
  createWorldInfoEntry,
  debounce,
  debounceAsync,
  delay,
  deleteWIOriginalDataValue,
  deleteWorldInfo,
  deleteWorldInfoEntry,
  download,
  extensionNames,
  getFreeWorldName,
  getSortableDelay,
  getWorldEntry,
  isTrueBoolean,
  onWorldInfoChange,
  renderTemplateAsync,
  selected_world_info,
  world_names,
} from './shared/st-host.js';
import { Settings, SORT, SORT_DIRECTION } from './shared/settings.js';
import { initSplitter } from './drawer.splitter.js';
import { initEditorPanel } from './editor-panel/editor-panel.js';
import { initBookBrowser } from './book-browser/book-browser.js';
import { initEntryManager } from './entry-manager/entry-manager.js';
import {
  METADATA_NAMESPACE,
  METADATA_SORT_KEY,
  getSortFromMetadata,
  sortEntries,
} from './shared/sort-helpers.js';
import {
  entryState,
  renderEntry,
  setWorldEntryContext,
} from './book-browser/book-list/book-list.world-entry.js';
import {
  appendSortOptions,
  executeSlashCommand,
  getSortLabel,
  isOutletPosition,
  safeToSorted,
} from './shared/utils.js';
import { buildDrawerListContainer, buildDrawerEditorContainer } from './drawer.controls.js';
import { installDrawerKeyboardShortcuts, installDrawerObservers } from './drawer.interactions.js';

const DRAWER_ACTIVE_CLASS = 'stwid--';
const ENTRY_MANAGER_ACTIVE_CLASS = 'stwid--state-active';

const setHiddenIfElement = (el, hidden) => {
  if (el instanceof HTMLElement) {
    el.hidden = hidden;
  }
};

const createDrawerRuntimeState = ({ saveWorldInfo, wiHandlerApi }) => {
  const dom = {
    drawer: {
      body: undefined,
    },
    books: undefined,
    editor: undefined,
    collapseAllToggle: undefined,
    collapseAllFoldersToggle: undefined,
    activationToggle: undefined,
    lorebooksTabContent: undefined,
    foldersTabContent: undefined,
    settingsTabContent: undefined,
    folderControls: {
      group: undefined,
      add: undefined,
      import: undefined,
      collapseAll: undefined,
    },
    sortingRow: undefined,
    order: {
      toggle: undefined,
      start: undefined,
      step: undefined,
      direction: {
        up: undefined,
        down: undefined,
      },
      uid: {
        start: undefined,
      },
      filter: {
        root: undefined,
        preview: undefined,
      },
      selectAll: undefined,
      sortSelect: undefined,
      entries: {},
      tbody: undefined,
    },
  };

  const activationBlock = document.querySelector('#wiActivationSettings');
  const activationBlockParent = activationBlock?.parentElement;
  const entryStateSaveQueueByBook = new Map();
  const enqueueEntryStateSave = (bookName) => {
    const previousSave = entryStateSaveQueueByBook.get(bookName) ?? Promise.resolve();
    const queuedSave = previousSave
      .catch(() => {})
      .then(() => saveWorldInfo(bookName, wiHandlerApi.buildSavePayload(bookName), true));
    entryStateSaveQueueByBook.set(bookName, queuedSave);
    return queuedSave.finally(() => {
      if (entryStateSaveQueueByBook.get(bookName) === queuedSave) {
        entryStateSaveQueueByBook.delete(bookName);
      }
    });
  };

  return {
    dom,
    activationBlock,
    activationBlockParent,
    entryStateSaveQueueByBook,
    enqueueEntryStateSave,
  };
};

const initDrawerEntryManager = ({
  dom,
  cache,
  saveWorldInfo,
  wiHandlerApi,
  getListPanelApi,
  getEditorPanelApi,
  getCurrentEditor,
  SlashCommandParser,
}) =>
  initEntryManager({
    dom,
    cache,
    SORT,
    SORT_DIRECTION,
    sortEntries,
    appendSortOptions,
    saveWorldInfo,
    buildSavePayload: wiHandlerApi.buildSavePayload,
    getSelectedWorldInfo: () => selected_world_info,
    getListPanelApi,
    getEditorPanelApi,
    getCurrentEditor,
    debounce,
    isTrueBoolean,
    SlashCommandParser,
    getSortableDelay,
    entryState,
    isOutletPosition,
    hljs,
    $,
  });

const buildAndAttachDrawerDom = ({
  dom,
  cache,
  activationBlock,
  activationBlockParent,
  wiHandlerApi,
  bookSourceLinksApi,
  getCurrentEditor,
  setCurrentEditor,
  getRequestHeaders,
  Popup,
  POPUP_RESULT,
  loadWorldInfo,
  saveWorldInfo,
  uuidv4,
  openEntryManager,
  refreshEntryManagerScope,
  enqueueEntryStateSave,
  deleteWorldInfoEntryRuntime,
  updateWIChangeRuntime,
  setListPanelApi,
  setEditorPanelApi,
  setSelectionState,
}) => {
  let restoreSplitterForCurrentLayout = () => {};
  const drawerContent = document.querySelector('#WorldInfo');
  const body = document.createElement('div');
  dom.drawer.body = body;
  body.classList.add('stwid--body');
  body.classList.add('stwid--state-loading');

  const list = buildDrawerListContainer({
    dom,
    cache,
    Popup,
    wiHandlerApi,
    openEntryManager,
    getListPanelApi: () => setListPanelApi.current,
    getEditorPanelApi: () => setEditorPanelApi.current,
    getCurrentEditor,
  });

  const { editorContainer, mobileBackBtn } = buildDrawerEditorContainer({ dom, wiHandlerApi });

  const editorPanelApi = initEditorPanel({
    dom,
    activationBlock,
    activationBlockParent,
    renderTemplateAsync,
    getWorldEntry,
    buildSavePayload: wiHandlerApi.buildSavePayload,
    cache,
    setCurrentEditor,
    getSelectFrom: () => setSelectionState.current?.selectFrom,
    selectEnd: () => setListPanelApi.current.selectEnd(),
  });
  setEditorPanelApi.current = editorPanelApi;

  mobileBackBtn.addEventListener('click', () => {
    if (dom.order.toggle?.classList?.contains(ENTRY_MANAGER_ACTIVE_CLASS)) {
      dom.order.toggle.click();
      return;
    }

    editorPanelApi.resetEditorState();
  });

  const listPanelApi = initBookBrowser({
    Settings,
    METADATA_NAMESPACE,
    METADATA_SORT_KEY,
    appendSortOptions,
    buildSavePayload: wiHandlerApi.buildSavePayload,
    cache,
    debounce,
    debounceAsync,
    deleteWIOriginalDataValue,
    deleteWorldInfo,
    deleteWorldInfoEntry: deleteWorldInfoEntryRuntime,
    delay,
    dom,
    download,
    executeSlashCommand,
    extensionNames,
    fillEmptyTitlesWithKeywords: wiHandlerApi.fillEmptyTitlesWithKeywords,
    getRequestHeaders,
    getSortFromMetadata,
    getSortLabel,
    getBookSourceLinks: (name) => bookSourceLinksApi.getBookSourceLinks(name),
    list,
    loadWorldInfo,
    onWorldInfoChange,
    onBookVisibilityScopeChange: (scope) => refreshEntryManagerScope(scope),
    openEntryManager,
    Popup,
    POPUP_RESULT,
    renderEntry,
    resetEditor: () => {
      editorPanelApi.clearEditor();
    },
    safeToSorted,
    saveWorldInfo,
    getSelectedWorldInfo: () => selected_world_info,
    getWorldNames: () => world_names,
    sortEntries,
    updateWIChange: updateWIChangeRuntime,
    waitForWorldInfoUpdate: wiHandlerApi.waitForWorldInfoUpdate,
    world_names,
    createNewWorldInfo,
    createWorldInfoEntry,
    getFreeWorldName,
    isDirtyCheck: () => {
      const currentEditor = getCurrentEditor();
      return Boolean(
        currentEditor && editorPanelApi?.isDirty?.(currentEditor.name, currentEditor.uid),
      );
    },
  });
  setListPanelApi.current = listPanelApi;

  bookSourceLinksApi.refreshBookSourceLinks('list_panel_init');

  const selectionState = listPanelApi.getSelectionState();
  setSelectionState.current = selectionState;
  setWorldEntryContext({
    buildSavePayload: wiHandlerApi.buildSavePayload,
    cache,
    dom,
    enqueueEntryStateSave,
    getWorldEntry,
    renderTemplateAsync,
    saveWorldInfo,
    selectAdd: listPanelApi.selectAdd,
    selectEnd: listPanelApi.selectEnd,
    selectRemove: listPanelApi.selectRemove,
    uuidv4,
    editorPanel: editorPanelApi,
    get currentEditor() {
      return getCurrentEditor();
    },
    set currentEditor(value) {
      setCurrentEditor(value);
    },
    get selectFrom() {
      return selectionState.selectFrom;
    },
    set selectFrom(value) {
      selectionState.selectFrom = value;
    },
    get selectLast() {
      return selectionState.selectLast;
    },
    set selectLast(value) {
      selectionState.selectLast = value;
    },
    get selectList() {
      return selectionState.selectList;
    },
    set selectList(value) {
      selectionState.selectList = value;
    },
    get selectToast() {
      return selectionState.selectToast;
    },
    set selectToast(value) {
      selectionState.selectToast = value;
    },
  });
  listPanelApi.updateCollapseAllToggle();
  listPanelApi.updateCollapseAllFoldersToggle();
  body.append(list);

  restoreSplitterForCurrentLayout = initSplitter(body, list);
  body.append(editorContainer);
  drawerContent?.append(body);
  restoreSplitterForCurrentLayout();

  return {
    drawerContent,
    listPanelApi,
    editorPanelApi,
    selectionState,
    restoreSplitterForCurrentLayout,
  };
};

const mountDrawerUI = ({
  cache,
  dom,
  activationBlock,
  activationBlockParent,
  enqueueEntryStateSave,
  getCurrentEditor,
  setCurrentEditor,
  wiHandlerApi,
  bookSourceLinksApi,
  context,
  deleteWorldInfoEntryRuntime,
  updateWIChangeRuntime,
}) => {
  const listPanelApiRef = { current: undefined };
  const editorPanelApiRef = { current: undefined };
  const selectionStateRef = { current: undefined };

  const {
    Popup,
    POPUP_RESULT,
    SlashCommandParser,
    getRequestHeaders,
    loadWorldInfo,
    saveWorldInfo,
    uuidv4,
  } = context;
  const { openEntryManager, refreshEntryManagerScope } = initDrawerEntryManager({
    dom,
    cache,
    saveWorldInfo,
    wiHandlerApi,
    getListPanelApi: () => listPanelApiRef.current,
    getEditorPanelApi: () => editorPanelApiRef.current,
    getCurrentEditor,
    SlashCommandParser,
  });

  document.body.classList.add(DRAWER_ACTIVE_CLASS);
  const {
    drawerContent,
    listPanelApi,
    editorPanelApi,
    selectionState,
    restoreSplitterForCurrentLayout,
  } = buildAndAttachDrawerDom({
    dom,
    cache,
    activationBlock,
    activationBlockParent,
    wiHandlerApi,
    bookSourceLinksApi,
    getCurrentEditor,
    setCurrentEditor,
    getRequestHeaders,
    Popup,
    POPUP_RESULT,
    loadWorldInfo,
    saveWorldInfo,
    uuidv4,
    openEntryManager,
    refreshEntryManagerScope,
    enqueueEntryStateSave,
    deleteWorldInfoEntryRuntime,
    updateWIChangeRuntime,
    setListPanelApi: listPanelApiRef,
    setEditorPanelApi: editorPanelApiRef,
    setSelectionState: selectionStateRef,
  });

  const removeKeyboardShortcuts = installDrawerKeyboardShortcuts({
    cache,
    Popup,
    loadWorldInfo,
    saveWorldInfo,
    wiHandlerApi,
    listPanelApi,
    selectionState,
    deleteWorldInfoEntryRuntime,
  });

  const closeButton = drawerContent?.querySelector('h3 > span');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      const isDrawerActive = document.body.classList.toggle(DRAWER_ACTIVE_CLASS);
      if (!isDrawerActive && dom.activationToggle?.classList?.contains('stwid--state-active')) {
        dom.activationToggle.click();
      }
    });
  }

  const observerCleanup = installDrawerObservers({
    drawerContent,
    cache,
    getCurrentEditor,
    getEditorPanelApi: () => editorPanelApiRef.current,
    restoreSplitterForCurrentLayout,
    wiHandlerApi,
  });

  globalThis.addEventListener?.(
    'beforeunload',
    () => {
      removeKeyboardShortcuts();
      observerCleanup.cleanup();
      editorPanelApiRef.current?.cleanup?.();
      wiHandlerApi.cleanup?.();
      bookSourceLinksApi.cleanup();
    },
    { once: true },
  );

  return {
    listPanelApi,
    editorPanelApi,
    selectionState,
  };
};

const buildDrawerApi = ({ dom, editorPanelApi, listPanelApi, selectionState }) => ({
  editorPanelApi,
  getActivationToggle: () => dom.activationToggle,
  setFolderControlsVisibility: (enabled) => {
    const visible = Boolean(enabled);
    const folderControlsGroupEl = dom.folderControls.group;
    const addFolderButtonEl = dom.folderControls.add;
    [
      folderControlsGroupEl,
      addFolderButtonEl,
      dom.folderControls.import,
      dom.folderControls.collapseAll,
    ].forEach((el) => setHiddenIfElement(el, !visible));
  },
  getListPanelApi: () => listPanelApi,
  getOrderToggle: () => dom.order.toggle,
  listPanelApi,
  selectionState,
});

export const initDrawer = ({
  cache,
  getCurrentEditor,
  setCurrentEditor,
  wiHandlerApi,
  bookSourceLinksApi,
}) => {
  const context = SillyTavern.getContext();
  const { saveWorldInfo } = context;
  const deleteWorldInfoEntryRuntime = (book, uid, options) =>
    deleteWorldInfoEntry(book, uid, options);
  const updateWIChangeRuntime = (bookName, bookData) =>
    wiHandlerApi.updateWIChange(bookName, bookData);

  const { dom, activationBlock, activationBlockParent, enqueueEntryStateSave } =
    createDrawerRuntimeState({ saveWorldInfo, wiHandlerApi });

  const { listPanelApi, editorPanelApi, selectionState } = mountDrawerUI({
    cache,
    dom,
    activationBlock,
    activationBlockParent,
    enqueueEntryStateSave,
    getCurrentEditor,
    setCurrentEditor,
    wiHandlerApi,
    bookSourceLinksApi,
    context,
    deleteWorldInfoEntryRuntime,
    updateWIChangeRuntime,
  });

  return buildDrawerApi({
    dom,
    editorPanelApi,
    listPanelApi,
    selectionState,
  });
};
