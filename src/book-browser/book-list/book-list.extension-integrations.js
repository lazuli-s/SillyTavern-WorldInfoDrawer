const STLO_EXTENSION_NAME = 'third-party/SillyTavern-LorebookOrdering';
const BULK_EDIT_EXTENSION_NAME = 'third-party/SillyTavern-WorldInfoBulkEdit';
const EXTERNAL_EDITOR_EXTENSION_NAME = 'third-party/SillyTavern-WorldInfoExternalEditor';

const createExtensionIntegrationsSlice = ({
    extensionNames,
    getRequestHeaders,
    executeSlashCommand,
    setSelectedBookInCoreUi,
    clickCoreUiAction,
    createBookMenuActionItem,
})=>{
    const createBulkEditMenuItem = (name, closeMenu)=>createBookMenuActionItem({
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

    const appendIntegrationMenuItems = (menu, name, closeMenu)=>{
        if (extensionNames.includes(BULK_EDIT_EXTENSION_NAME)) {
            menu.append(createBulkEditMenuItem(name, closeMenu));
        }
        if (extensionNames.includes(EXTERNAL_EDITOR_EXTENSION_NAME)) {
            menu.append(createBookMenuActionItem({
                itemClass: 'stwid--externalEditor',
                iconClass: 'fa-laptop-code',
                labelText: 'External Editor',
                onClick: async()=>{
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
                },
            }));
        }
        if (extensionNames.includes(STLO_EXTENSION_NAME)) {
            menu.append(createBookMenuActionItem({
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
                    title: 'Configure STLO Priority & Budget',
                    'aria-label': 'Configure STLO Priority & Budget',
                    role: 'button',
                },
            }));
        }
    };

    return { appendIntegrationMenuItems };
};

export { createExtensionIntegrationsSlice };
