import { initBookSourceLinks } from './src/book-browser/book-list/book-list.book-source-links.js';
import { initDrawer } from './src/drawer.js';
import { refreshList } from './src/book-browser/book-browser.js';
import { initWIUpdateHandler } from './src/shared/wi-update-handler.js';
import { Settings } from './src/shared/settings.js';



const NAME = new URL(import.meta.url).pathname.split('/').at(-2);

let cleanupCssWatch = null;

const watchCss = async()=>{
    
    cleanupCssWatch?.();
    cleanupCssWatch = null;
    if (new URL(import.meta.url).pathname.split('/').includes('reload')) return;
    try {
        const FilesPluginApi = (await import('../SillyTavern-FilesPluginApi/api.js')).FilesPluginApi;
        
        const style = document.createElement('style');
        document.body.append(style);
        const path = [
            '~',
            'extensions',
            NAME,
            'style.css',
        ].join('/');
        const ev = await FilesPluginApi.watch(path);
        
        const onCssMessage = async(exists)=>{
            if (!exists) return;
            style.innerHTML = await (await FilesPluginApi.get(path)).text();
            document.querySelector(`#third-party_${NAME}-css`)?.remove();
        };
        ev.addEventListener('message', onCssMessage);
        cleanupCssWatch = ()=>{
            ev.removeEventListener('message', onCssMessage);
            style.remove();
        };
    } catch (error) {
        console.debug('[STWID] CSS watch disabled', error);
    }
};
watchCss();

const cache = {};

let currentEditor = null;
let listPanelApi;
let editorPanelApi;
let featureSettingsRoot = null;
let lastAppliedFolderGroupingVisibility = null;

const bookSourceLinksApi = initBookSourceLinks({
    getListPanelApi: ()=>listPanelApi,
});

const wiHandlerApi = initWIUpdateHandler({
    cache,
    getCurrentEditor: ()=>currentEditor,
    setCurrentEditor: (value)=>{
        currentEditor = value;
    },
    getListPanelApi: ()=>listPanelApi,
    getEditorPanelApi: ()=>editorPanelApi,
    getRefreshBookSourceLinks: ()=>bookSourceLinksApi.refreshBookSourceLinks,
});

const drawerApi = initDrawer({
    cache,
    getCurrentEditor: ()=>currentEditor,
    setCurrentEditor: (value)=>{
        currentEditor = value;
    },
    wiHandlerApi,
    bookSourceLinksApi,
});
listPanelApi = drawerApi.listPanelApi;
editorPanelApi = drawerApi.editorPanelApi;

const applyFolderGroupingVisibility = (enabled)=>{
    const visible = Boolean(enabled);
    drawerApi.setFolderControlsVisibility?.(visible);
    listPanelApi?.setFolderGroupingVisibility?.(visible);
    for (const folder of document.querySelectorAll('.stwid--folder')) {
        if (!(folder instanceof HTMLElement)) continue;
        folder.hidden = !visible;
    }
    if (lastAppliedFolderGroupingVisibility === visible) {
        return;
    }
    lastAppliedFolderGroupingVisibility = visible;
    void listPanelApi?.refreshList?.().catch((error)=>{
        console.error('[STWID] Failed to refresh list after folder grouping toggle', error);
    });
};

const applyAdditionalMatchingSourcesVisibility = (enabled)=>{
    const visible = Boolean(enabled);
    document.body.classList.toggle('stwid--ams-disabled', !visible);

    const amsDrawers = new Set();
    for (const header of document.querySelectorAll('.stwid--editor .userSettingsInnerExpandable')) {
        if (!(header instanceof HTMLElement)) continue;
        const drawer = header.closest('.inline-drawer');
        if (drawer instanceof HTMLElement) {
            amsDrawers.add(drawer);
        }
    }
    for (const drawer of document.querySelectorAll('.stwid--editor .inline-drawer.stwid--ams')) {
        if (drawer instanceof HTMLElement) {
            amsDrawers.add(drawer);
        }
    }

    for (const drawer of amsDrawers) {
        if (visible) drawer.style.removeProperty('display');
        else drawer.style.setProperty('display', 'none', 'important');
        if (!visible) {
            drawer.classList.remove('stwid--ams-open');
            drawer.classList.remove('openDrawer');
        }
    }

    // Recovery: remove stale inline hide from non-AMS drawers.
    for (const drawer of document.querySelectorAll('.stwid--editor .inline-drawer')) {
        if (!(drawer instanceof HTMLElement)) continue;
        if (amsDrawers.has(drawer)) continue;
        if (drawer.style.getPropertyValue('display') === 'none') {
            drawer.style.removeProperty('display');
        }
    }
};

const FEATURE_REGISTRY = Object.freeze([
    {
        settingKey: 'featureFolderGrouping',
        applyFn: (enabled)=>applyFolderGroupingVisibility(enabled),
    },
    {
        settingKey: 'featureAdditionalMatchingSources',
        applyFn: (enabled)=>applyAdditionalMatchingSourcesVisibility(enabled),
    },
]);

const applyFeatureVisibility = ()=>{
    for (const { settingKey, applyFn } of FEATURE_REGISTRY) {
        applyFn(Boolean(Settings.instance[settingKey]));
    }
};

const renderSettingsTemplateHtml = async(context)=>{
    const candidates = [`third-party/${NAME}`, NAME];
    let lastError = null;
    for (const extensionId of candidates) {
        try {
            return await context.renderExtensionTemplateAsync(extensionId, 'settings');
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError ?? new Error('Failed to render settings template.');
};

const initSettingsPanel = async()=>{
    const context = SillyTavern.getContext();
    const settingsContainer = document.querySelector('#extensions_settings');
    if (!(settingsContainer instanceof HTMLElement)) {
        console.warn('[STWID] Could not find #extensions_settings to mount extension settings.');
        return;
    }

    featureSettingsRoot?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'stwid-settings-panel';
    wrapper.innerHTML = await renderSettingsTemplateHtml(context);
    settingsContainer.append(wrapper);
    featureSettingsRoot = wrapper;

    const folderGroupingCheckbox = wrapper.querySelector('#stwid-feature-folder-grouping');
    const amsCheckbox = wrapper.querySelector('#stwid-feature-additional-matching-sources');

    if (folderGroupingCheckbox instanceof HTMLInputElement) {
        folderGroupingCheckbox.checked = Boolean(Settings.instance.featureFolderGrouping);
        folderGroupingCheckbox.addEventListener('change', ()=>{
            Settings.instance.featureFolderGrouping = folderGroupingCheckbox.checked;
            Settings.instance.save();
            applyFeatureVisibility();
        });
    }

    if (amsCheckbox instanceof HTMLInputElement) {
        amsCheckbox.checked = Boolean(Settings.instance.featureAdditionalMatchingSources);
        amsCheckbox.addEventListener('change', ()=>{
            Settings.instance.featureAdditionalMatchingSources = amsCheckbox.checked;
            Settings.instance.save();
            applyFeatureVisibility();
        });
    }

    applyFeatureVisibility();
};

void initSettingsPanel().catch((error)=>{
    console.error('[STWID] Failed to initialize extension settings panel', error);
});

void refreshList()
    .then(()=>{
        applyFeatureVisibility();
    })
    .catch((error)=>{ console.error('[STWID] Startup list load failed', error); })
;

export const jumpToEntry = async(name, uid)=>{
    const entryDom = cache[name]?.dom?.entry?.[uid]?.root;
    if (!entryDom) return false;

    
    
    if (currentEditor && editorPanelApi?.isDirty?.(currentEditor.name, currentEditor.uid)) {
        return false;
    }

    const activationToggle = drawerApi.getActivationToggle();
    if (activationToggle?.classList.contains('stwid--active')) {
        activationToggle.click();
    }
    const orderToggle = drawerApi.getOrderToggle();
    if (orderToggle?.classList.contains('stwid--active')) {
        orderToggle.click();
    }
    listPanelApi.setBookCollapsed(name, false);
    entryDom.scrollIntoView({ block:'center', inline:'center' });
    if (currentEditor?.name != name || currentEditor?.uid != uid) {
        entryDom.click();
    }
    return true;
};


