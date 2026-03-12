const CREATE_BOOK_LABEL = 'Create New Book';
const IMPORT_BOOK_LABEL = 'Import Book';

function createLorebooksGroupLabel() {
    const lorebooksGroupLabel = document.createElement('span');
    lorebooksGroupLabel.classList.add('stwid--thinContainerLabel');
    lorebooksGroupLabel.textContent = 'Lorebooks';

    const lorebooksGroupHint = document.createElement('i');
    lorebooksGroupHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
    lorebooksGroupHint.title = 'Create, import, or collapse lorebooks';

    lorebooksGroupLabel.append(lorebooksGroupHint);
    return lorebooksGroupLabel;
}

function createCreateBookButton({
    cache,
    getFreeWorldName,
    createNewWorldInfo,
    Popup,
    wiHandlerApi,
    getListPanelApi,
}) {
    const createBookButton = document.querySelector('#world_create_button').cloneNode(true);
    createBookButton.removeAttribute('id');
    createBookButton.classList.add('stwid--addBook');
    createBookButton.title = CREATE_BOOK_LABEL;
    createBookButton.setAttribute('aria-label', CREATE_BOOK_LABEL);
    createBookButton.querySelector('span')?.remove();
    createBookButton.addEventListener('click', async()=>{
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

    return createBookButton;
}

function createImportBookButton() {
    const importBookButton = document.createElement('div');
    importBookButton.classList.add('menu_button', 'fa-solid', 'fa-fw', 'fa-file-import');
    importBookButton.title = IMPORT_BOOK_LABEL;
    importBookButton.setAttribute('aria-label', IMPORT_BOOK_LABEL);
    importBookButton.addEventListener('click', ()=>{
        document.querySelector('#world_import_file').click();
    });

    return importBookButton;
}

function createCollapseAllToggle({ dom, cache, getListPanelApi }) {
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

    return collapseAllToggle;
}

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
    root.classList.add('stwid--browserRow');

    const lorebooksGroup = document.createElement('div');
    lorebooksGroup.classList.add('stwid--thinContainer');
    lorebooksGroup.append(createLorebooksGroupLabel());
    lorebooksGroup.append(createCreateBookButton({
        cache,
        getFreeWorldName,
        createNewWorldInfo,
        Popup,
        wiHandlerApi,
        getListPanelApi,
    }));
    lorebooksGroup.append(createImportBookButton());
    lorebooksGroup.append(createCollapseAllToggle({ dom, cache, getListPanelApi }));

    root.append(lorebooksGroup);
    return root;
};
