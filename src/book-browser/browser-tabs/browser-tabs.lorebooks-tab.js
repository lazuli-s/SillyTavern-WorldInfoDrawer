import { maybeYieldToEventLoop } from '../../shared/utils.js';

const CREATE_BOOK_LABEL = 'Create New Book';
const IMPORT_BOOK_LABEL = 'Import Book';

// Yield to the browser after this many books so "Expand/Collapse All" does not
// freeze the tab in one synchronous burst (PERF-W5-02).
const COLLAPSE_ALL_BATCH_SIZE = 3;

// Bumped on every "Collapse/Expand All" click so a newer click supersedes an
// older in-flight loop instead of two loops writing the DOM at the same time.
let collapseAllGeneration = 0;

function createLorebooksGroupLabel() {
  const lorebooksGroupLabel = document.createElement('span');
  lorebooksGroupLabel.classList.add('stwid--field-group__label');
  lorebooksGroupLabel.textContent = 'Lorebooks';

  const lorebooksGroupHint = document.createElement('i');
  lorebooksGroupHint.classList.add(
    'fa-solid',
    'fa-fw',
    'fa-circle-question',
    'stwid--field-group__label-hint',
  );
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
  createBookButton.addEventListener('click', async () => {
    const tempName = getFreeWorldName();
    const finalName = await Popup.show.input(
      'Create a new World Info',
      'Enter a name for the new file:',
      tempName,
    );
    if (!finalName) return;
    const waitForUpdate = wiHandlerApi.waitForWorldInfoUpdate();
    const created = await createNewWorldInfo(finalName, { interactive: true });
    if (!created) return;
    await waitForUpdate;
    await wiHandlerApi.getUpdateWIChangeFinished()?.promise;
    getListPanelApi()?.setBookCollapsed?.(finalName, false);
    if (!cache[finalName]?.dom?.root) {
      console.warn(
        '[STWID] New book created but not yet present in cache/DOM; forcing refresh.',
        finalName,
      );
      await getListPanelApi()?.refreshList?.();
    }
    cache[finalName]?.dom?.root?.scrollIntoView({ block: 'center', inline: 'center' });
  });

  return createBookButton;
}

function createImportBookButton() {
  const importBookButton = document.createElement('div');
  importBookButton.classList.add('menu_button', 'fa-solid', 'fa-fw', 'fa-file-import');
  importBookButton.title = IMPORT_BOOK_LABEL;
  importBookButton.setAttribute('aria-label', IMPORT_BOOK_LABEL);
  importBookButton.addEventListener('click', () => {
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
  collapseAllToggle.addEventListener('click', async () => {
    const myGeneration = ++collapseAllGeneration;
    const listPanelApi = getListPanelApi();
    const shouldCollapse = listPanelApi.hasExpandedBooks();
    // Snapshot the names up front: the loop now yields, so cache could gain or
    // lose books mid-pass; we iterate the set as it was when the click landed.
    const bookNames = Object.keys(cache);
    for (let i = 0; i < bookNames.length; i++) {
      // A newer click has taken over — stop so we don't fight it.
      if (myGeneration !== collapseAllGeneration) return;
      const name = bookNames[i];
      if (!cache[name]) continue; // book removed during a yield
      listPanelApi.setBookCollapsed(name, shouldCollapse);
      await maybeYieldToEventLoop(i, COLLAPSE_ALL_BATCH_SIZE);
    }
    if (myGeneration !== collapseAllGeneration) return;
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
}) => {
  const root = document.createElement('div');
  root.classList.add('stwid--browser-row');

  const lorebooksGroup = document.createElement('div');
  lorebooksGroup.classList.add('stwid--field-group');
  lorebooksGroup.append(createLorebooksGroupLabel());
  lorebooksGroup.append(
    createCreateBookButton({
      cache,
      getFreeWorldName,
      createNewWorldInfo,
      Popup,
      wiHandlerApi,
      getListPanelApi,
    }),
  );
  lorebooksGroup.append(createImportBookButton());
  lorebooksGroup.append(createCollapseAllToggle({ dom, cache, getListPanelApi }));

  root.append(lorebooksGroup);
  return root;
};
