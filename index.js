import { initBookSourceLinks } from './src/book-browser/book-list/book-list.book-source-links.js';
import { initDrawer } from './src/drawer.js';
import { refreshList } from './src/book-browser/book-browser.js';
import { initWIUpdateHandler } from './src/shared/wi-update-handler.js';
import { Settings } from './src/shared/settings.js';



const NAME = new URL(import.meta.url).pathname.split('/').at(-2);
const DISPLAY_STYLE_PROPERTY = 'display';
const HIDDEN_TAB_SETTINGS = Object.freeze([
    { id: 'settings', selector: '#stwid-hidden-tab-settings' },
    { id: 'lorebooks', selector: '#stwid-hidden-tab-lorebooks' },
    { id: 'folders', selector: '#stwid-hidden-tab-folders' },
    { id: 'visibility', selector: '#stwid-hidden-tab-visibility' },
    { id: 'sorting', selector: '#stwid-hidden-tab-sorting' },
    { id: 'search', selector: '#stwid-hidden-tab-search' },
]);

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
        const cssWatchEventSource = await FilesPluginApi.watch(path);
        
        const onCssMessage = async(exists)=>{
            if (!exists) return;
            style.innerHTML = await (await FilesPluginApi.get(path)).text();
            document.querySelector(`#third-party_${NAME}-css`)?.remove();
        };
        cssWatchEventSource.addEventListener('message', onCssMessage);
        cleanupCssWatch = ()=>{
            cssWatchEventSource.removeEventListener('message', onCssMessage);
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

const setCurrentEditor = (value)=>{
    currentEditor = value;
};

const deactivateToggle = (toggleButton)=>{
    if (toggleButton?.classList.contains('stwid--active')) {
        toggleButton.click();
    }
};

const bindFeatureCheckbox = (checkbox, settingKey)=>{
    if (!(checkbox instanceof HTMLInputElement)) {
        return;
    }
    checkbox.checked = Boolean(Settings.instance[settingKey]);
    checkbox.addEventListener('change', ()=>{
        Settings.instance[settingKey] = checkbox.checked;
        Settings.instance.save();
        applyFeatureVisibility();
    });
};

const mountSettingsPanel = async()=>{
    const context = SillyTavern.getContext();
    const settingsContainer = document.querySelector('#extensions_settings');
    if (!(settingsContainer instanceof HTMLElement)) {
        console.warn('[STWID] Could not find #extensions_settings to mount extension settings.');
        return null;
    }

    featureSettingsRoot?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'stwid-settings-panel';
    wrapper.innerHTML = await renderSettingsTemplateHtml(context);
    settingsContainer.append(wrapper);
    featureSettingsRoot = wrapper;
    return wrapper;
};

const bindFeatureSettingControls = (wrapper)=>{
    const folderGroupingCheckbox = wrapper.querySelector('#stwid-feature-folder-grouping');
    const amsCheckbox = wrapper.querySelector('#stwid-feature-additional-matching-sources');

    bindFeatureCheckbox(folderGroupingCheckbox, 'featureFolderGrouping');
    bindFeatureCheckbox(amsCheckbox, 'featureAdditionalMatchingSources');
};

const bindHiddenTabControls = (wrapper)=>{
    for (const { id: tabId, selector } of HIDDEN_TAB_SETTINGS) {
        const checkbox = wrapper.querySelector(selector);
        if (!(checkbox instanceof HTMLInputElement)) {
            continue;
        }
        checkbox.checked = Settings.instance.hiddenTabs.includes(tabId);
        checkbox.addEventListener('change', ()=>{
            const nextHiddenTabs = checkbox.checked
                ? [...Settings.instance.hiddenTabs, tabId]
                : Settings.instance.hiddenTabs.filter((hiddenTabId)=>hiddenTabId !== tabId);
            Settings.instance.hiddenTabs = [...new Set(nextHiddenTabs)];
            Settings.instance.save();
            applyHiddenTabsVisibility();
        });
    }
};

const bookSourceLinksApi = initBookSourceLinks({
    getListPanelApi: ()=>listPanelApi,
});

const wiHandlerApi = initWIUpdateHandler({
    cache,
    getCurrentEditor: ()=>currentEditor,
    setCurrentEditor,
    getListPanelApi: ()=>listPanelApi,
    getEditorPanelApi: ()=>editorPanelApi,
    getRefreshBookSourceLinks: ()=>bookSourceLinksApi.refreshBookSourceLinks,
});

const drawerApi = initDrawer({
    cache,
    getCurrentEditor: ()=>currentEditor,
    setCurrentEditor,
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
        if (visible) drawer.style.removeProperty(DISPLAY_STYLE_PROPERTY);
        else drawer.style.setProperty(DISPLAY_STYLE_PROPERTY, 'none', 'important');
        if (!visible) {
            drawer.classList.remove('stwid--ams-open');
            drawer.classList.remove('openDrawer');
        }
    }

    // Recovery: remove stale inline hide from non-AMS drawers.
    for (const drawer of document.querySelectorAll('.stwid--editor .inline-drawer')) {
        if (!(drawer instanceof HTMLElement)) continue;
        if (amsDrawers.has(drawer)) continue;
        if (drawer.style.getPropertyValue(DISPLAY_STYLE_PROPERTY) === 'none') {
            drawer.style.removeProperty(DISPLAY_STYLE_PROPERTY);
        }
    }
};

const applyHiddenTabsVisibility = ()=>{
    listPanelApi?.applyHiddenTabs?.(Settings.instance.hiddenTabs);
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
    {
        settingKey: 'hiddenTabs',
        applyFn: ()=>applyHiddenTabsVisibility(),
    },
]);

const applyFeatureVisibility = ()=>{
    for (const { settingKey, applyFn } of FEATURE_REGISTRY) {
        applyFn(Settings.instance[settingKey]);
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
    const wrapper = await mountSettingsPanel();
    if (!(wrapper instanceof HTMLElement)) {
        return;
    }

    bindFeatureSettingControls(wrapper);
    bindHiddenTabControls(wrapper);

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
    deactivateToggle(activationToggle);
    const orderToggle = drawerApi.getOrderToggle();
    deactivateToggle(orderToggle);
    listPanelApi.setBookCollapsed(name, false);
    entryDom.scrollIntoView({ block:'center', inline:'center' });
    if (currentEditor?.name != name || currentEditor?.uid != uid) {
        entryDom.click();
    }
    return true;
};


