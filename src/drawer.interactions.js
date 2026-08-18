// Global drawer interaction wiring: keyboard shortcuts (bulk delete) and the
// MutationObservers that keep the drawer/select DOM in sync with WI changes.
// Extracted from drawer.js, which now stays focused on bootstrap + DOM map.

import { deleteWIOriginalDataValue } from './shared/st-host.js';
import { maybeYieldToEventLoop } from './shared/utils.js';

const FILTER_QUERY_CLASS = 'stwid--filter-query';
const STYLE_ATTRIBUTE = 'style';
const BULK_DELETE_BATCH_SIZE = 200;

export const getEventTargetElement = (evt) =>
  evt.target instanceof HTMLElement ? evt.target : null;

const shouldHandleDrawerKeydown = (evt) => {
  const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
  if (!centerEl?.closest?.('.stwid--body')) return false;

  const target = getEventTargetElement(evt);
  const isTextEditing = Boolean(
    target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]'),
  );
  return !isTextEditing;
};

const isEntryVisible = (cache, bookName, uid) => {
  const entryRoot = cache[bookName]?.dom?.entry?.[uid]?.root;
  return Boolean(entryRoot) && !entryRoot.classList.contains(FILTER_QUERY_CLASS);
};

const isSelectionVisible = (cache, bookName, selectedUids) => {
  const bookRoot = cache[bookName]?.dom?.root;
  if (!bookRoot) return false;
  if (
    bookRoot.classList.contains('stwid--filter-visibility') ||
    bookRoot.classList.contains(FILTER_QUERY_CLASS)
  ) {
    return false;
  }
  return selectedUids.every((uid) => isEntryVisible(cache, bookName, uid));
};

const deleteSelectedEntriesAndSave = async ({
  selectFrom,
  selectedUids,
  loadWorldInfo,
  deleteWorldInfoEntryRuntime,
  saveWorldInfo,
  wiHandlerApi,
  listPanelApi,
}) => {
  const srcBook = await loadWorldInfo(selectFrom);
  if (!srcBook) return;

  // deleteWorldInfoEntryRuntime resolves synchronously when silent:true, so the
  // per-iteration await does NOT hand control back to the browser. Yield a real
  // macrotask every batch so a large delete does not freeze the tab (PERF-W4-08).
  // The loop only mutates the local srcBook copy; the save happens once, after.
  for (let index = 0; index < selectedUids.length; index += 1) {
    const uid = selectedUids[index];
    const deleted = await deleteWorldInfoEntryRuntime(srcBook, uid, { silent: true });
    if (deleted) {
      deleteWIOriginalDataValue(srcBook, uid);
    }
    await maybeYieldToEventLoop(index, BULK_DELETE_BATCH_SIZE);
  }

  await saveWorldInfo(selectFrom, srcBook, true);
  wiHandlerApi.updateWIChange(selectFrom, srcBook);
  listPanelApi.selectEnd();
};

export const installDrawerKeyboardShortcuts = ({
  cache,
  Popup,
  loadWorldInfo,
  saveWorldInfo,
  wiHandlerApi,
  listPanelApi,
  selectionState,
  deleteWorldInfoEntryRuntime,
}) => {
  const onDrawerKeydown = async (evt) => {
    if (!shouldHandleDrawerKeydown(evt)) return;
    if (selectionState.selectFrom === null || !selectionState.selectList?.length) return;

    console.log('[STWID]', evt.key);
    switch (evt.key) {
      case 'Delete': {
        evt.preventDefault();
        evt.stopPropagation();

        const selectFrom = selectionState.selectFrom;
        const selectedUids = [...(selectionState.selectList ?? [])];
        if (selectFrom === null || !selectedUids.length) return;

        if (!isSelectionVisible(cache, selectFrom, selectedUids)) {
          const count = selectedUids.length;
          const noun = count === 1 ? 'entry is' : 'entries are';
          const confirmed = await Popup.show.confirm(
            `${count} selected ${noun} currently hidden by filters. Delete anyway?`,
          );
          if (!confirmed) return;
        }

        await deleteSelectedEntriesAndSave({
          selectFrom,
          selectedUids,
          loadWorldInfo,
          deleteWorldInfoEntryRuntime,
          saveWorldInfo,
          wiHandlerApi,
          listPanelApi,
        });
        break;
      }
    }
  };

  document.addEventListener('keydown', onDrawerKeydown);
  return () => document.removeEventListener('keydown', onDrawerKeydown);
};

export const installDrawerObservers = ({
  drawerContent,
  cache,
  getCurrentEditor,
  getEditorPanelApi,
  restoreSplitterForCurrentLayout,
  wiHandlerApi,
  onSelectObserverReady,
}) => {
  let moSel;
  let moDrawer;

  const moSelTarget = document.querySelector('#world_editor_select');
  if (moSelTarget) {
    moSel = new MutationObserver(() => wiHandlerApi.updateWIChangeDebounced());
    moSel.observe(moSelTarget, { childList: true });
  }

  moDrawer = new MutationObserver(() => {
    const drawerStyle = drawerContent.getAttribute(STYLE_ATTRIBUTE) ?? '';
    if (drawerStyle.includes('display: none;')) return;

    restoreSplitterForCurrentLayout();

    const currentEditor = getCurrentEditor();
    if (!currentEditor) return;

    const isDirty = Boolean(getEditorPanelApi()?.isDirty?.(currentEditor.name, currentEditor.uid));
    if (isDirty) {
      console.debug('[STWID] Drawer reopen: editor is dirty; skipping auto-restore click.');
      return;
    }

    if (cache[currentEditor.name]?.dom?.entry?.[currentEditor.uid]?.root) {
      cache[currentEditor.name].dom.entry[currentEditor.uid].root.click();
    }
  });
  moDrawer.observe(drawerContent, { attributes: true, attributeFilter: [STYLE_ATTRIBUTE] });

  onSelectObserverReady?.(moSel);
  return {
    moSel,
    moDrawer,
    cleanup: () => {
      moSel?.disconnect();
      moDrawer?.disconnect();
    },
  };
};
