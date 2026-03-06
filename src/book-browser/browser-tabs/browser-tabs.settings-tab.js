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
    const settingsGroupLabel = document.createElement('span');
    settingsGroupLabel.classList.add('stwid--thinContainerLabel');
    settingsGroupLabel.textContent = 'Settings';
    const settingsGroupHint = document.createElement('i');
    settingsGroupHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
    settingsGroupHint.title = 'Open activation settings or refresh the list';
    settingsGroupLabel.append(settingsGroupHint);
    settingsGroup.append(settingsGroupLabel);

    const settings = document.createElement('div');
    dom.activationToggle = settings;
    settings.classList.add('stwid--activation', 'menu_button', 'fa-solid', 'fa-fw', 'fa-cog');
    settings.title = 'Global Activation Settings';
    settings.setAttribute('aria-label', 'Global Activation Settings');
    settings.addEventListener('click', ()=>{
        const currentEditor = getCurrentEditor();
        const editorPanelApi = getEditorPanelApi();
        const isDirty = Boolean(
            currentEditor && editorPanelApi?.isDirty?.(currentEditor.name, currentEditor.uid),
        );
        if (isDirty && !settings.classList.contains('stwid--state-active')) {
            toastr.warning('Unsaved edits detected. Save or discard changes before opening Activation Settings.');
            return;
        }
        editorPanelApi?.toggleActivationSettings?.();
    });
    settingsGroup.append(settings);

    const refresh = document.createElement('div');
    refresh.classList.add('menu_button', 'fa-solid', 'fa-fw', 'fa-arrows-rotate');
    refresh.title = 'Refresh';
    refresh.setAttribute('aria-label', 'Refresh');
    refresh.addEventListener('click', async()=>{
        await getListPanelApi()?.refreshList?.();
    });
    settingsGroup.append(refresh);

    const order = document.createElement('div');
    dom.order.toggle = order;
    order.classList.add('menu_button', 'fa-solid', 'fa-fw', 'fa-pen-to-square');
    order.title = 'Open Entry Manager (Book Visibility scope)';
    order.setAttribute('aria-label', 'Open Entry Manager for current Book Visibility scope');
    order.addEventListener('click', ()=>{
        const isActive = order.classList.contains('stwid--state-active');
        const currentEditor = getCurrentEditor();
        const editorPanelApi = getEditorPanelApi();
        const isDirty = Boolean(
            currentEditor && editorPanelApi?.isDirty?.(currentEditor.name, currentEditor.uid),
        );
        if (!isActive && isDirty) {
            toastr.warning('Unsaved edits detected. Save or discard changes before opening Entry Manager.');
            return;
        }
        if (isActive) {
            if (isDirty) {
                toastr.warning('Unsaved edits detected. Save or discard changes before closing Entry Manager.');
                return;
            }
            order.classList.remove('stwid--state-active');
            editorPanelApi?.clearEditor?.();
            return;
        }
        const visibilityScope = getListPanelApi()?.getBookVisibilityScope?.();
        openEntryManager(null, visibilityScope);
    });
    settingsGroup.append(order);

    root.append(settingsGroup);
    const setToggleVisible = (visible)=>{ order.hidden = !visible; };
    return { root, setToggleVisible };
};
