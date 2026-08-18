// Drawer control-row builders: the Book Browser list container (tabs +
// sorting row) and the editor panel container (mobile back button + editor
// mount point). Extracted from drawer.js, which now stays focused on
// bootstrap + DOM map.

import { createNewWorldInfo, getFreeWorldName } from './shared/st-host.js';
import { registerFolderName } from './book-browser/book-list/book-folders/book-folders.lorebook-folders.js';
import { createLorebooksTabContent } from './book-browser/browser-tabs/browser-tabs.lorebooks-tab.js';
import { createFoldersTabContent } from './book-browser/browser-tabs/browser-tabs.folders-tab.js';
import { createSettingsTabContent } from './book-browser/browser-tabs/browser-tabs.settings-tab.js';
import { createSortingTabContent } from './book-browser/browser-tabs/browser-tabs.sorting-tab.js';
import { getEventTargetElement } from './drawer.interactions.js';

export const buildDrawerListContainer = ({
  dom,
  cache,
  Popup,
  wiHandlerApi,
  openEntryManager,
  getListPanelApi,
  getEditorPanelApi,
  getCurrentEditor,
}) => {
  const list = document.createElement('div');
  list.classList.add('stwid--list');

  dom.lorebooksTabContent = createLorebooksTabContent({
    dom,
    cache,
    getFreeWorldName,
    createNewWorldInfo,
    Popup,
    wiHandlerApi,
    getListPanelApi,
  });
  dom.foldersTabContent = createFoldersTabContent({
    dom,
    registerFolderName,
    Popup,
    getListPanelApi,
  });

  const { root: settingsTabRoot, setToggleVisible: setOrderToggleVisible } =
    createSettingsTabContent({
      dom,
      openEntryManager,
      getListPanelApi,
      getEditorPanelApi,
      getCurrentEditor,
    });
  dom.settingsTabContent = settingsTabRoot;
  dom.setOrderToggleVisible = setOrderToggleVisible;

  const controls = document.createElement('div');
  controls.classList.add('stwid--controls');
  dom.sortingRow = createSortingTabContent({ cache, getListPanelApi });
  controls.append(dom.sortingRow);
  list.append(controls);

  return list;
};

export const buildDrawerEditorContainer = ({ dom, wiHandlerApi }) => {
  const editorPanel = document.createElement('div');
  editorPanel.classList.add('stwid--editor-panel');

  const mobileBackBtn = document.createElement('button');
  mobileBackBtn.classList.add('stwid--mobile-back-btn', 'menu_button');
  mobileBackBtn.type = 'button';
  const backIcon = document.createElement('i');
  backIcon.classList.add('fa-solid', 'fa-arrow-left');
  mobileBackBtn.append(backIcon, document.createTextNode(' Back to Books'));
  editorPanel.append(mobileBackBtn);

  const editor = document.createElement('div');
  dom.editor = editor;
  editor.classList.add('stwid--editor');
  editor.addEventListener(
    'click',
    (evt) => {
      const target = getEventTargetElement(evt);
      if (!target?.closest('.duplicate_entry_button')) return;
      wiHandlerApi.queueEditorDuplicateRefresh();
    },
    true,
  );
  editorPanel.append(editor);

  return { editorContainer: editorPanel, mobileBackBtn };
};
