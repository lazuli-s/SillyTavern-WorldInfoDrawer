const STLO_EXTENSION_NAME = 'third-party/SillyTavern-LorebookOrdering';
const BULK_EDIT_EXTENSION_NAME = 'third-party/SillyTavern-WorldInfoBulkEdit';
const EXTERNAL_EDITOR_EXTENSION_NAME = 'third-party/SillyTavern-WorldInfoExternalEditor';
const STLO_CONFIGURE_LABEL = 'Configure STLO Priority & Budget';

const createBulkEditMenuItem = ({ name, closeMenu, setSelectedBookInCoreUi, clickCoreUiAction, createBookMenuActionItem })=>createBookMenuActionItem({
    itemClass: 'stwid--bulkEdit',
    iconClass: 'fa-list-check',
    labelText: 'Bulk Edit',
    onClick: async()=>{
        const selected = await setSelectedBookInCoreUi(name);
        if (!selected) return;
        await clickCoreUiAction(['.stwibe--trigger']);
        closeMenu?.();
    },
});

const handleExternalEditorClick = async(name, closeMenu, getRequestHeaders)=>{
    try {
        const response = await fetch('/api/plugins/wiee/editor', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                book: name,
                command: 'code',
                commandArguments: ['.'],
            }),
        });
        if (!response.ok) {
            toastr.error(`External Editor request failed (${response.status}).`);
        }
    } catch (error) {
        console.warn('[STWID] External Editor request failed.', error);
        toastr.error('External Editor request failed. Check the browser console for details.');
    }
    closeMenu?.();
};

const createExternalEditorMenuItem = ({ name, closeMenu, getRequestHeaders, createBookMenuActionItem })=>createBookMenuActionItem({
    itemClass: 'stwid--externalEditor',
    iconClass: 'fa-laptop-code',
    labelText: 'External Editor',
    onClick: async()=>{
        await handleExternalEditorClick(name, closeMenu, getRequestHeaders);
    },
});

const createStloMenuItem = ({ name, closeMenu, executeSlashCommand, createBookMenuActionItem })=>createBookMenuActionItem({
    itemClass: 'stwid--stlo',
    iconClass: 'fa-bars-staggered',
    labelText: 'Configure STLO',
    onClick: async(evt)=>{
        evt.stopPropagation();
        const escapedName = name.replaceAll('"', '\\"');
        const didExecute = await executeSlashCommand(`/stlo "${escapedName}"`);
        if (!didExecute) {
            toastr.error('STLO command failed. Check the browser console for details.');
            return;
        }
        closeMenu();
    },
    attributes: {
        id: 'lorebook_ordering_button',
        'data-i18n': '[title]stlo.button.configure; [aria-label]stlo.button.configure',
        title: STLO_CONFIGURE_LABEL,
        'aria-label': STLO_CONFIGURE_LABEL,
        role: 'button',
    },
});

const appendBulkEditMenuItem = ({ menu, extensionNames, name, closeMenu, setSelectedBookInCoreUi, clickCoreUiAction, createBookMenuActionItem })=>{
    if (!extensionNames.includes(BULK_EDIT_EXTENSION_NAME)) return;
    menu.append(createBulkEditMenuItem({ name, closeMenu, setSelectedBookInCoreUi, clickCoreUiAction, createBookMenuActionItem }));
};

const appendExternalEditorMenuItem = ({ menu, extensionNames, name, closeMenu, getRequestHeaders, createBookMenuActionItem })=>{
    if (!extensionNames.includes(EXTERNAL_EDITOR_EXTENSION_NAME)) return;
    menu.append(createExternalEditorMenuItem({ name, closeMenu, getRequestHeaders, createBookMenuActionItem }));
};

const appendStloMenuItem = ({ menu, extensionNames, name, closeMenu, executeSlashCommand, createBookMenuActionItem })=>{
    if (!extensionNames.includes(STLO_EXTENSION_NAME)) return;
    menu.append(createStloMenuItem({ name, closeMenu, executeSlashCommand, createBookMenuActionItem }));
};

const createExtensionIntegrationsSlice = ({
    extensionNames,
    getRequestHeaders,
    executeSlashCommand,
    setSelectedBookInCoreUi,
    clickCoreUiAction,
    createBookMenuActionItem,
})=>{
    const appendIntegrationMenuItems = (menu, name, closeMenu)=>{
        appendBulkEditMenuItem({ menu, extensionNames, name, closeMenu, setSelectedBookInCoreUi, clickCoreUiAction, createBookMenuActionItem });
        appendExternalEditorMenuItem({ menu, extensionNames, name, closeMenu, getRequestHeaders, createBookMenuActionItem });
        appendStloMenuItem({ menu, extensionNames, name, closeMenu, executeSlashCommand, createBookMenuActionItem });
    };

    return { appendIntegrationMenuItems };
};

export { createExtensionIntegrationsSlice };
