// The browser toolbar: the permanent row above the Book Browser's tab strip
// holding Activation, Entry Manager and Refresh. It builds no tab, so it lives
// here and not among the per-tab modules in browser-tabs/.

const ICON_BUTTON_BASE_CLASSES = ['menu_button', 'fa-solid', 'fa-fw'];
// `menu_button_icon` is required with a label: `.menu_button` alone is
// `width: min-content`, which wraps "Entry Manager" one word per line.
const LABELLED_BUTTON_BASE_CLASSES = ['menu_button', 'menu_button_icon'];
const ACTIVE_STATE_CLASS = 'stwid--state-active';
const MOBILE_PANEL_OPEN_CLASS = 'stwid--mobile-panel-open';

function getIsEditorDirty(getCurrentEditor, getEditorPanelApi) {
  const currentEditor = getCurrentEditor();
  const editorPanelApi = getEditorPanelApi();
  return Boolean(currentEditor && editorPanelApi?.isDirty?.(currentEditor.name, currentEditor.uid));
}

function warnIfUnsavedEdits(getCurrentEditor, getEditorPanelApi, message) {
  if (getIsEditorDirty(getCurrentEditor, getEditorPanelApi)) {
    toastr.warning(message);
    return true;
  }
  return false;
}

function createLabelledButton(iconClass, label) {
  const button = document.createElement('div');
  button.classList.add(...LABELLED_BUTTON_BASE_CLASSES);

  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-fw', iconClass);

  const text = document.createElement('span');
  text.textContent = label;

  button.append(icon, text);
  return button;
}

function createActivationSettingsButton({ dom, getCurrentEditor, getEditorPanelApi }) {
  const activationSettingsButton = createLabelledButton('fa-cog', 'Activation');
  dom.activationToggle = activationSettingsButton;
  activationSettingsButton.classList.add('stwid--activation');
  activationSettingsButton.title = 'Global Activation Settings';
  activationSettingsButton.setAttribute('aria-label', 'Global Activation Settings');
  activationSettingsButton.addEventListener('click', () => {
    if (
      !activationSettingsButton.classList.contains(ACTIVE_STATE_CLASS) &&
      warnIfUnsavedEdits(
        getCurrentEditor,
        getEditorPanelApi,
        'Unsaved edits detected. Save or discard changes before opening Activation Settings.',
      )
    ) {
      return;
    }
    getEditorPanelApi()?.toggleActivationSettings?.();
  });

  return activationSettingsButton;
}

function createRefreshButton({ getListPanelApi, getCurrentEditor, getEditorPanelApi }) {
  const refreshButton = document.createElement('div');
  refreshButton.classList.add(
    ...ICON_BUTTON_BASE_CLASSES,
    'fa-arrows-rotate',
    'stwid--browser-toolbar__refresh',
  );
  refreshButton.title = 'Refresh';
  refreshButton.setAttribute('aria-label', 'Refresh');
  refreshButton.addEventListener('click', async () => {
    if (
      warnIfUnsavedEdits(
        getCurrentEditor,
        getEditorPanelApi,
        'Unsaved edits detected. Save or discard changes before refreshing the list.',
      )
    ) {
      return;
    }
    try {
      await getListPanelApi()?.refreshList?.();
    } catch (error) {
      console.warn('[STWID] Failed to refresh the book list.', error);
      toastr.error('Failed to refresh the book list.');
    }
  });

  return refreshButton;
}

function createEntryManagerToggleButton({
  dom,
  openEntryManager,
  getListPanelApi,
  getEditorPanelApi,
  getCurrentEditor,
}) {
  const entryManagerToggleButton = createLabelledButton('fa-pen-to-square', 'Entry Manager');
  dom.order.toggle = entryManagerToggleButton;
  entryManagerToggleButton.title = 'Open Entry Manager (Book Visibility scope)';
  entryManagerToggleButton.setAttribute(
    'aria-label',
    'Open Entry Manager for current Book Visibility scope',
  );
  // While an open is still settling, every further click is ignored: the
  // toggle reads active from the moment openEntryManager starts, so a
  // mid-render click would otherwise take the close path and leave the drawer
  // half-open once the suspended open re-applies its panel class.
  let openInFlight = false;
  entryManagerToggleButton.addEventListener('click', async () => {
    if (openInFlight) return;
    const isActive = entryManagerToggleButton.classList.contains(ACTIVE_STATE_CLASS);
    if (
      !isActive &&
      warnIfUnsavedEdits(
        getCurrentEditor,
        getEditorPanelApi,
        'Unsaved edits detected. Save or discard changes before opening Entry Manager.',
      )
    ) {
      return;
    }
    if (isActive) {
      if (
        warnIfUnsavedEdits(
          getCurrentEditor,
          getEditorPanelApi,
          'Unsaved edits detected. Save or discard changes before closing Entry Manager.',
        )
      ) {
        return;
      }
      entryManagerToggleButton.classList.remove(ACTIVE_STATE_CLASS);
      dom.drawer.body?.classList?.remove(MOBILE_PANEL_OPEN_CLASS);
      getEditorPanelApi()?.clearEditor?.();
      return;
    }
    openInFlight = true;
    const visibilityScope = getListPanelApi()?.getBookVisibilityScope?.();
    try {
      await openEntryManager(null, visibilityScope);
    } finally {
      openInFlight = false;
    }
  });

  return entryManagerToggleButton;
}

export const createBrowserToolbar = ({
  dom,
  openEntryManager,
  getListPanelApi,
  getEditorPanelApi,
  getCurrentEditor,
}) => {
  const root = document.createElement('div');
  root.classList.add('stwid--browser-toolbar');

  const activationSettingsButton = createActivationSettingsButton({
    dom,
    getCurrentEditor,
    getEditorPanelApi,
  });
  root.append(activationSettingsButton);

  const entryManagerToggleButton = createEntryManagerToggleButton({
    dom,
    openEntryManager,
    getListPanelApi,
    getEditorPanelApi,
    getCurrentEditor,
  });
  root.append(entryManagerToggleButton);

  // Last, because it is the one pushed to the right edge.
  const refreshButton = createRefreshButton({
    getListPanelApi,
    getCurrentEditor,
    getEditorPanelApi,
  });
  root.append(refreshButton);

  const setToggleVisible = (visible) => {
    entryManagerToggleButton.hidden = !visible;
  };
  return { root, setToggleVisible };
};
