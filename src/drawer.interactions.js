// Global drawer interaction wiring: keyboard shortcuts (bulk delete) and the
// MutationObservers that keep the drawer/select DOM in sync with WI changes.
// Extracted from drawer.js, which now stays focused on bootstrap + DOM map.

import { deleteWIOriginalDataValue } from './shared/st-host.js';
import { maybeYieldToEventLoop } from './shared/utils.js';

const FILTER_QUERY_CLASS = 'stwid--filter-query';
const STYLE_ATTRIBUTE = 'style';
const CLASS_ATTRIBUTE = 'class';
const DRAWER_CLOSED_CLASS = 'closedDrawer';
const DRAWER_OPEN_CLASS = 'openDrawer';
const DRAWER_STATE_ATTRIBUTES = [CLASS_ATTRIBUTE, STYLE_ATTRIBUTE];
const BULK_DELETE_BATCH_SIZE = 200;

// The host opens and closes #WorldInfo by toggling `openDrawer`/`closedDrawer`
// on it — `drawer.toggleClass('openDrawer closedDrawer')` in the host's
// script.js — and writes no inline style at all. Verified in the browser on
// 2026-08-27: one open/close cycle produces four `class` mutations and zero
// `style` mutations. Older host builds signalled the closed state with an
// inline `display: none;` instead, so both are read here. If only `style` were
// watched (as it was until 2026-08-27), the drawer-open observer would never
// fire on a current host: the splitter would never restore the Book Browser's
// width, and the previously open entry would never be re-opened on reopen.
const isDrawerOpen = (drawerContent) => {
  if (drawerContent.classList.contains(DRAWER_CLOSED_CLASS)) return false;
  if (drawerContent.classList.contains(DRAWER_OPEN_CLASS)) return true;
  return !(drawerContent.getAttribute(STYLE_ATTRIBUTE) ?? '').includes('display: none;');
};

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
  try {
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
  } catch (error) {
    console.error('[STWID] Bulk delete failed:', error);
    toastr.error('Failed to delete selected entries. Check the console for details.');
  }
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
  // Re-entrancy guard for the bulk-delete shortcut, private to this closure.
  let bulkDeleteInFlight = false;

  const onDrawerKeydown = async (evt) => {
    if (!shouldHandleDrawerKeydown(evt)) return;
    if (selectionState.selectFrom === null || !selectionState.selectList?.length) return;

    switch (evt.key) {
      case 'Delete': {
        evt.preventDefault();
        evt.stopPropagation();
        // The delete loop yields real macrotasks, so keydown events arrive while
        // a run is still in flight; an overlapping second run would race its save
        // and could resurrect entries the first run deleted. Consume and ignore.
        if (bulkDeleteInFlight) return;

        const selectFrom = selectionState.selectFrom;
        const selectedUids = [...(selectionState.selectList ?? [])];
        if (selectFrom === null || !selectedUids.length) return;

        bulkDeleteInFlight = true;
        try {
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
        } finally {
          // Spans the confirm branch too, so cancelling cannot leave the guard
          // stuck and disable the shortcut.
          bulkDeleteInFlight = false;
        }
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

  // Watching `class` means every class mutation on the drawer wakes this
  // observer, not just an open/close. Acting only on the closed -> open edge
  // keeps the auto-restore click to one per reopen, as it was when only the
  // inline style was watched.
  let drawerWasOpen = isDrawerOpen(drawerContent);

  moDrawer = new MutationObserver(() => {
    const drawerIsOpen = isDrawerOpen(drawerContent);
    const justOpened = drawerIsOpen && !drawerWasOpen;
    drawerWasOpen = drawerIsOpen;
    if (!justOpened) return;

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
  moDrawer.observe(drawerContent, { attributes: true, attributeFilter: DRAWER_STATE_ATTRIBUTES });

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
