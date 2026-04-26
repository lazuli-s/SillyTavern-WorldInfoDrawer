const ICON_BUTTON_BASE_CLASSES = ['menu_button', 'fa-solid', 'fa-fw'];
const ACTIVE_STATE_CLASS = 'stwid--state-active';
const MOBILE_PANEL_OPEN_CLASS = 'stwid--mobile-panel-open';

function getIsEditorDirty(getCurrentEditor, getEditorPanelApi) {
    const currentEditor = getCurrentEditor();
    const editorPanelApi = getEditorPanelApi();
    return Boolean(
        currentEditor && editorPanelApi?.isDirty?.(currentEditor.name, currentEditor.uid),
    );
}

function createSettingsGroupLabel() {
    const settingsGroupLabel = document.createElement('span');
    settingsGroupLabel.classList.add('stwid--thinContainerLabel');
    settingsGroupLabel.textContent = 'Settings';

    const settingsGroupHint = document.createElement('i');
    settingsGroupHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
    settingsGroupHint.title = 'Open activation settings or refresh the list';
    settingsGroupLabel.append(settingsGroupHint);

    return settingsGroupLabel;
}

function createActivationSettingsButton({ dom, getCurrentEditor, getEditorPanelApi }) {
    const activationSettingsButton = document.createElement('div');
    dom.activationToggle = activationSettingsButton;
    activationSettingsButton.classList.add('stwid--activation', ...ICON_BUTTON_BASE_CLASSES, 'fa-cog');
    activationSettingsButton.title = 'Global Activation Settings';
    activationSettingsButton.setAttribute('aria-label', 'Global Activation Settings');
    activationSettingsButton.addEventListener('click', ()=>{
        const isDirty = getIsEditorDirty(getCurrentEditor, getEditorPanelApi);
        if (isDirty && !activationSettingsButton.classList.contains(ACTIVE_STATE_CLASS)) {
            toastr.warning('Unsaved edits detected. Save or discard changes before opening Activation Settings.');
            return;
        }
        getEditorPanelApi()?.toggleActivationSettings?.();
    });

    return activationSettingsButton;
}

function createRefreshButton({ getListPanelApi }) {
    const refreshButton = document.createElement('div');
    refreshButton.classList.add(...ICON_BUTTON_BASE_CLASSES, 'fa-arrows-rotate');
    refreshButton.title = 'Refresh';
    refreshButton.setAttribute('aria-label', 'Refresh');
    refreshButton.addEventListener('click', async()=>{
        await getListPanelApi()?.refreshList?.();
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
    const entryManagerToggleButton = document.createElement('div');
    dom.order.toggle = entryManagerToggleButton;
    entryManagerToggleButton.classList.add(...ICON_BUTTON_BASE_CLASSES, 'fa-pen-to-square');
    entryManagerToggleButton.title = 'Open Entry Manager (Book Visibility scope)';
    entryManagerToggleButton.setAttribute('aria-label', 'Open Entry Manager for current Book Visibility scope');
    entryManagerToggleButton.addEventListener('click', ()=>{
        const isActive = entryManagerToggleButton.classList.contains(ACTIVE_STATE_CLASS);
        const isDirty = getIsEditorDirty(getCurrentEditor, getEditorPanelApi);
        if (!isActive && isDirty) {
            toastr.warning('Unsaved edits detected. Save or discard changes before opening Entry Manager.');
            return;
        }
        if (isActive) {
            if (isDirty) {
                toastr.warning('Unsaved edits detected. Save or discard changes before closing Entry Manager.');
                return;
            }
            entryManagerToggleButton.classList.remove(ACTIVE_STATE_CLASS);
            dom.drawer.body?.classList?.remove(MOBILE_PANEL_OPEN_CLASS);
            getEditorPanelApi()?.clearEditor?.();
            return;
        }
        const visibilityScope = getListPanelApi()?.getBookVisibilityScope?.();
        openEntryManager(null, visibilityScope);
    });

    return entryManagerToggleButton;
}

export const createSettingsTabContent = ({
    dom,
    openEntryManager,
    getListPanelApi,
    getEditorPanelApi,
    getCurrentEditor,
})=>{
    const root = document.createElement('div');
    root.classList.add('stwid--browserRow');

    const settingsGroup = document.createElement('div');
    settingsGroup.classList.add('stwid--thinContainer');
    settingsGroup.append(createSettingsGroupLabel());

    const activationSettingsButton = createActivationSettingsButton({ dom, getCurrentEditor, getEditorPanelApi });
    settingsGroup.append(activationSettingsButton);

    const refreshButton = createRefreshButton({ getListPanelApi });
    settingsGroup.append(refreshButton);

    const entryManagerToggleButton = createEntryManagerToggleButton({
        dom,
        openEntryManager,
        getListPanelApi,
        getEditorPanelApi,
        getCurrentEditor,
    });
    settingsGroup.append(entryManagerToggleButton);

    root.append(settingsGroup);
    const setToggleVisible = (visible)=>{ entryManagerToggleButton.hidden = !visible; };
    return { root, setToggleVisible };
};
