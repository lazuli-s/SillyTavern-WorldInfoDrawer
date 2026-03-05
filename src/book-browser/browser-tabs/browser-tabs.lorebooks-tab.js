export const createLorebooksTabContent = ({
    dom,
    cache,
    getFreeWorldName,
    createNewWorldInfo,
    Popup,
    wiHandlerApi,
    getListPanelApi,
})=>{
    const root = document.createElement('div');
    root.classList.add('stwid--controlsRow');

    const lorebooksGroup = document.createElement('div');
    lorebooksGroup.classList.add('stwid--thinContainer');
    const lorebooksGroupLabel = document.createElement('span');
    lorebooksGroupLabel.classList.add('stwid--thinContainerLabel');
    lorebooksGroupLabel.textContent = 'Lorebooks';
    const lorebooksGroupHint = document.createElement('i');
    lorebooksGroupHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
    lorebooksGroupHint.title = 'Create, import, or collapse lorebooks';
    lorebooksGroupLabel.append(lorebooksGroupHint);
    lorebooksGroup.append(lorebooksGroupLabel);
    const add = document.querySelector('#world_create_button').cloneNode(true);
    add.removeAttribute('id');
    add.classList.add('stwid--addBook');
    add.title = 'Create New Book';
    add.setAttribute('aria-label', 'Create New Book');
    add.querySelector('span')?.remove();
    add.addEventListener('click', async()=>{
        const tempName = getFreeWorldName();
        const finalName = await Popup.show.input('Create a new World Info', 'Enter a name for the new file:', tempName);
        if (!finalName) return;
        const waitForUpdate = wiHandlerApi.waitForWorldInfoUpdate();
        const created = await createNewWorldInfo(finalName, { interactive:true });
        if (!created) return;
        await waitForUpdate;
        await wiHandlerApi.getUpdateWIChangeFinished()?.promise;
        getListPanelApi()?.setBookCollapsed?.(finalName, false);
        if (!cache[finalName]?.dom?.root) {
            console.warn('[STWID] New book created but not yet present in cache/DOM; forcing refresh.', finalName);
            await getListPanelApi()?.refreshList?.();
        }
        cache[finalName]?.dom?.root?.scrollIntoView({ block:'center', inline:'center' });
    });
    lorebooksGroup.append(add);
    const imp = document.createElement('div');
    imp.classList.add('menu_button', 'fa-solid', 'fa-fw', 'fa-file-import');
    imp.title = 'Import Book';
    imp.setAttribute('aria-label', 'Import Book');
    imp.addEventListener('click', ()=>{
        document.querySelector('#world_import_file').click();
    });
    lorebooksGroup.append(imp);
    const collapseAllToggle = document.createElement('button');
    dom.collapseAllToggle = collapseAllToggle;
    collapseAllToggle.type = 'button';
    collapseAllToggle.classList.add('menu_button', 'stwid--collapseAllToggle');
    const collapseBooksIcon = document.createElement('i');
    collapseBooksIcon.classList.add('fa-solid', 'fa-fw');
    collapseAllToggle.append(collapseBooksIcon);
    collapseAllToggle.addEventListener('click', ()=>{
        const listPanelApi = getListPanelApi();
        const shouldCollapse = listPanelApi.hasExpandedBooks();
        for (const name of Object.keys(cache)) {
            listPanelApi.setBookCollapsed(name, shouldCollapse);
        }
        listPanelApi.updateCollapseAllToggle();
    });
    lorebooksGroup.append(collapseAllToggle);

    root.append(lorebooksGroup);
    return root;
};
