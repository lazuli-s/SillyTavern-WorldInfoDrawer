import { initBookSourceLinks } from './src/bookSourceLinks.js';
import { initDrawer } from './src/drawer.js';
import { refreshList } from './src/listPanel.js';
import { initWIUpdateHandler } from './src/wiUpdateHandler.js';

// Entry point. Initializes runtime modules and exposes jumpToEntry.

const NAME = new URL(import.meta.url).pathname.split('/').at(-2);
const watchCss = async()=>{
    if (new URL(import.meta.url).pathname.split('/').includes('reload')) return;
    try {
        const FilesPluginApi = (await import('../SillyTavern-FilesPluginApi/api.js')).FilesPluginApi;
        // watch CSS for changes
        const style = document.createElement('style');
        document.body.append(style);
        const path = [
            '~',
            'extensions',
            NAME,
            'style.css',
        ].join('/');
        const ev = await FilesPluginApi.watch(path);
        ev.addEventListener('message', async(/**@type {boolean}*/exists)=>{
            if (!exists) return;
            style.innerHTML = await (await FilesPluginApi.get(path)).text();
            document.querySelector(`#third-party_${NAME}-css`)?.remove();
        });
    } catch (error) {
        console.debug('[STWID] CSS watch disabled', error);
    }
};
watchCss();

const cache = {};
/**@type {{name:string, uid:string}|null} */
let currentEditor = null;
let listPanelApi;
let editorPanelApi;

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

refreshList();

export const jumpToEntry = async(name, uid)=>{
    const entryDom = cache[name]?.dom?.entry?.[uid]?.root;
    if (!entryDom) return false;

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

// NOTE: Discord/non-Discord layout detection removed.
