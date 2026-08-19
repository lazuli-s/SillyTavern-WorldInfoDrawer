import {
  buildEntryManagerRootEl,
  buildEntryManagerTopRows,
  buildEntryManagerTabs,
  buildEntryManagerFilterPanel,
  buildEntryManagerTable,
} from './bulk-editor-tab.sections.js';
import { registerBookReloadHooks } from '../../shared/book-reload.js';
import {
  registerCharacterFilterUpdateHook,
  resetCharacterFilterCells,
} from '../table/table.body.character-filter.js';
import { maybeYieldToEventLoop } from '../../shared/utils.js';
import { BULK_APPLY_BATCH_SIZE } from './bulk-edit-row.helpers.js';

const resetBulkEditRow = (cleanupBulkEditRowRef) => {
  if (typeof cleanupBulkEditRowRef.current === 'function') {
    cleanupBulkEditRowRef.current();
    cleanupBulkEditRowRef.current = null;
  }
};

const resetEntryManagerStateForRender = ({
  book,
  entryManagerState,
  dom,
  syncEntryManagerStrategyFilters,
  syncEntryManagerPositionFilters,
  syncEntryManagerOutletFilters,
  syncEntryManagerAutomationIdFilters,
  syncEntryManagerGroupFilters,
  syncEntryManagerCharacterFilterValueFilters,
  getEditorPanelApi,
}) => {
  entryManagerState.book = book;

  // R14b — the table is about to be rebuilt, so an open inline character/tag
  // filter dropdown is closed without saving; it must never write into a row
  // that no longer exists.
  resetCharacterFilterCells();

  syncEntryManagerStrategyFilters();
  syncEntryManagerPositionFilters();
  syncEntryManagerOutletFilters();
  syncEntryManagerAutomationIdFilters();
  syncEntryManagerGroupFilters();
  syncEntryManagerCharacterFilterValueFilters();

  const editorPanelApi = getEditorPanelApi();
  editorPanelApi.resetEditorState();

  dom.order.entries = {};
  dom.order.filter.root = undefined;
  dom.order.filter.preview = undefined;
  dom.order.tbody = undefined;
};

const saveCustomDisplayIndexForBooks = async ({
  updatedBooks,
  saveWorldInfo,
  buildSavePayload,
}) => {
  for (const bookName of updatedBooks) {
    await saveWorldInfo(bookName, buildSavePayload(bookName), true);
  }
};

const persistCustomSortOrderIfNeeded = async ({
  book,
  entryManagerState,
  SORT,
  ensureCustomDisplayIndex,
  saveWorldInfo,
  buildSavePayload,
}) => {
  if (entryManagerState.sort !== SORT.CUSTOM) return;

  const updatedBooks = ensureCustomDisplayIndex(book);
  try {
    await saveCustomDisplayIndexForBooks({
      updatedBooks,
      saveWorldInfo,
      buildSavePayload,
    });
  } catch (err) {
    console.error('[STWID] Failed to save custom display index:', err);
    toastr.error('Failed to save custom sort order. Check console for details.');
  }
};

/** Identifies a table row across a re-render (rows themselves are rebuilt). */
const entryManagerRowKey = (row) =>
  JSON.stringify([row.getAttribute('data-book'), row.getAttribute('data-uid')]);

const renderEntryManager = async ({
  book = null,
  selectedRowKeys = null,
  cleanupBulkEditRowRef,
  dom,
  cache,
  entryManagerState,
  ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
  ENTRY_MANAGER_DEFAULT_COLUMNS,
  ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY,
  SORT,
  SORT_DIRECTION,
  appendSortOptions,
  ensureCustomDisplayIndex,
  saveWorldInfo,
  buildSavePayload,
  getEntryManagerEntries,
  applyEntryManagerSortToDom,
  updateEntryManagerPreview,
  clearEntryManagerScriptFilters,
  applyEntryManagerColumnVisibility,
  setEntryManagerSort,
  isEntryManagerRowSelected,
  setEntryManagerRowSelected,
  setAllEntryManagerRowSelected,
  updateEntryManagerSelectAllButton,
  applyEntryManagerStrategyFilters,
  applyEntryManagerStrategyFilterToRow,
  applyEntryManagerPositionFilterToRow,
  applyEntryManagerPositionFilters,
  applyEntryManagerRecursionFilterToRow,
  applyEntryManagerRecursionFilters,
  applyEntryManagerOutletFilters,
  applyEntryManagerOutletFilterToRow,
  applyEntryManagerAutomationIdFilters,
  applyEntryManagerGroupFilters,
  applyEntryManagerCharacterFilterPresenceFilters,
  applyEntryManagerCharacterFilterValueFilters,
  setEntryManagerRowFilterState,
  syncEntryManagerStrategyFilters,
  syncEntryManagerPositionFilters,
  syncEntryManagerOutletFilters,
  syncEntryManagerAutomationIdFilters,
  syncEntryManagerGroupFilters,
  syncEntryManagerCharacterFilterValueFilters,
  focusWorldEntry,
  entryState,
  isOutletPosition,
  getStrategyOptions,
  getStrategyValues,
  getPositionOptions,
  getPositionValues,
  getOutletOptions,
  getOutletValues,
  getAutomationIdOptions,
  getAutomationIdValues,
  getGroupOptions,
  getGroupValues,
  getCharacterFilterPickerOptions,
  normalizeStrategyFilters,
  normalizePositionFilters,
  normalizeOutletFilters,
  normalizeAutomationIdFilters,
  normalizeGroupFilters,
  getEntryManagerRows,
  SlashCommandParser,
  debounce,
  hljs,
  getSortableDelay,
  isTrueBoolean,
  $,
  getEditorPanelApi,
}) => {
  resetBulkEditRow(cleanupBulkEditRowRef);

  resetEntryManagerStateForRender({
    book,
    entryManagerState,
    dom,
    syncEntryManagerStrategyFilters,
    syncEntryManagerPositionFilters,
    syncEntryManagerOutletFilters,
    syncEntryManagerAutomationIdFilters,
    syncEntryManagerGroupFilters,
    syncEntryManagerCharacterFilterValueFilters,
    getEditorPanelApi,
  });

  await persistCustomSortOrderIfNeeded({
    book,
    entryManagerState,
    SORT,
    ensureCustomDisplayIndex,
    saveWorldInfo,
    buildSavePayload,
  });

  const entries = getEntryManagerEntries(book);
  const entryManagerRootEl = buildEntryManagerRootEl({
    entryManagerState,
    applyEntryManagerColumnVisibility,
  });

  const {
    displayToolbarEl,
    bulkEditRowEl,
    refreshDisplayToolbar,
    refreshSelectionCount,
    filterIndicatorRefs,
  } = buildEntryManagerTopRows({
    entryManagerRootEl,
    entryManagerState,
    dom,
    cache,
    ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY,
    ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
    ENTRY_MANAGER_DEFAULT_COLUMNS,
    applyEntryManagerColumnVisibility,
    clearEntryManagerScriptFilters,
    setEntryManagerSort,
    applyEntryManagerSortToDom,
    ensureCustomDisplayIndex,
    saveWorldInfo,
    buildSavePayload,
    appendSortOptions,
    getEntryManagerEntries,
    updateEntryManagerPreview,
    SORT,
    SORT_DIRECTION,
    applyEntryManagerStrategyFilters,
    applyEntryManagerPositionFilters,
    applyEntryManagerRecursionFilters,
    applyEntryManagerOutletFilters,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilters,
    applyEntryManagerCharacterFilterPresenceFilters,
    applyEntryManagerCharacterFilterValueFilters,
    getStrategyOptions,
    getPositionOptions,
    getOutletOptions,
    getAutomationIdOptions,
    getGroupOptions,
    getCharacterFilterPickerOptions,
    getStrategyValues,
    getPositionValues,
    getOutletValues,
    getAutomationIdValues,
    getGroupValues,
    isEntryManagerRowSelected,
    setAllEntryManagerRowSelected,
    updateEntryManagerSelectAllButton,
    getEntryManagerRows,
    applyEntryManagerStrategyFilterToRow,
    applyEntryManagerPositionFilterToRow,
    isOutletPosition,
    applyEntryManagerOutletFilterToRow,
    syncEntryManagerOutletFilters,
    applyEntryManagerRecursionFilterToRow,
    cleanupBulkEditRowRef,
    debounce,
  });

  const entryManagerTabs = buildEntryManagerTabs({ displayToolbarEl, bulkEditRowEl });
  const filterEl = buildEntryManagerFilterPanel({
    dom,
    entryManagerState,
    getEntryManagerEntries,
    setEntryManagerRowFilterState,
    SlashCommandParser,
    debounce,
    hljs,
    isTrueBoolean,
  });
  const orderTableWrapEl = await buildEntryManagerTable({
    entries,
    entryManagerState,
    dom,
    cache,
    isOutletPosition,
    saveWorldInfo,
    buildSavePayload,
    focusWorldEntry,
    isEntryManagerRowSelected,
    setEntryManagerRowSelected,
    updateEntryManagerSelectAllButton,
    refreshSelectionCount,
    setEntryManagerRowFilterState,
    applyEntryManagerStrategyFilterToRow,
    applyEntryManagerPositionFilterToRow,
    applyEntryManagerRecursionFilterToRow,
    applyEntryManagerStrategyFilters,
    applyEntryManagerPositionFilters,
    applyEntryManagerRecursionFilters,
    applyEntryManagerOutletFilters,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilters,
    applyEntryManagerCharacterFilterPresenceFilters,
    applyEntryManagerCharacterFilterValueFilters,
    syncEntryManagerOutletFilters,
    syncEntryManagerAutomationIdFilters,
    syncEntryManagerGroupFilters,
    getEditorPanelApi,
    entryState,
    getEntryManagerRows,
    setEntryManagerSort,
    SORT,
    SORT_DIRECTION,
    getSortableDelay,
    $,
    normalizeStrategyFilters,
    normalizePositionFilters,
    normalizeOutletFilters,
    normalizeAutomationIdFilters,
    normalizeGroupFilters,
    getStrategyOptions,
    getStrategyValues,
    getPositionOptions,
    getPositionValues,
    getOutletOptions,
    getOutletValues,
    getAutomationIdOptions,
    getAutomationIdValues,
    getGroupOptions,
    getGroupValues,
    getCharacterFilterPickerOptions,
    refreshDisplayToolbar,
    filterIndicatorRefs,
  });

  // The table build yields to the browser between row batches; if a newer
  // render took over during a yield, dom.order.tbody no longer belongs to
  // this render — drop this stale result instead of appending a second root.
  if (!dom.order.tbody || !orderTableWrapEl.contains(dom.order.tbody)) return;

  refreshDisplayToolbar();

  // A render selects every row. When the render is a forced refresh rather than
  // a user opening the table (see registerBookReloadHooks below), restore what
  // the user had picked — otherwise a failed bulk save would silently rearm the
  // Apply buttons against every entry in every visible book.
  if (selectedRowKeys) {
    const rows = getEntryManagerRows();
    for (let i = 0; i < rows.length; i++) {
      setEntryManagerRowSelected(rows[i], selectedRowKeys.has(entryManagerRowKey(rows[i])));
      // Same batching as setAllEntryManagerRowSelected: a scope of several
      // thousand rows must not block the UI thread in one pass.
      await maybeYieldToEventLoop(i, BULK_APPLY_BATCH_SIZE);
    }
    updateEntryManagerSelectAllButton();
  }
  refreshSelectionCount();

  entryManagerRootEl.append(entryManagerTabs, filterEl, orderTableWrapEl);
  dom.editor.append(entryManagerRootEl);
};

const createEntryManagerRenderer = ({
  dom,
  cache,
  entryManagerState,
  ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
  ENTRY_MANAGER_DEFAULT_COLUMNS,
  ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY,
  SORT,
  SORT_DIRECTION,
  appendSortOptions,
  ensureCustomDisplayIndex,
  saveWorldInfo,
  buildSavePayload,
  getEntryManagerEntries,
  applyEntryManagerSortToDom,
  updateEntryManagerPreview,
  clearEntryManagerScriptFilters,
  applyEntryManagerColumnVisibility,
  setEntryManagerSort,
  isEntryManagerRowSelected,
  setEntryManagerRowSelected,
  setAllEntryManagerRowSelected,
  updateEntryManagerSelectAllButton,
  applyEntryManagerStrategyFilters,
  applyEntryManagerStrategyFilterToRow,
  applyEntryManagerPositionFilterToRow,
  applyEntryManagerPositionFilters,
  applyEntryManagerRecursionFilterToRow,
  applyEntryManagerRecursionFilters,
  applyEntryManagerOutletFilters,
  applyEntryManagerOutletFilterToRow,
  applyEntryManagerAutomationIdFilters,
  applyEntryManagerGroupFilters,
  applyEntryManagerCharacterFilterPresenceFilters,
  applyEntryManagerCharacterFilterValueFilters,
  setEntryManagerRowFilterState,
  syncEntryManagerStrategyFilters,
  syncEntryManagerPositionFilters,
  syncEntryManagerOutletFilters,
  syncEntryManagerAutomationIdFilters,
  syncEntryManagerGroupFilters,
  syncEntryManagerCharacterFilterValueFilters,
  focusWorldEntry,
  entryState,
  isOutletPosition,
  getStrategyOptions,
  getStrategyValues,
  getPositionOptions,
  getPositionValues,
  getOutletOptions,
  getOutletValues,
  getAutomationIdOptions,
  getAutomationIdValues,
  getGroupOptions,
  getGroupValues,
  getCharacterFilterPickerOptions,
  normalizeStrategyFilters,
  normalizePositionFilters,
  normalizeOutletFilters,
  normalizeAutomationIdFilters,
  normalizeGroupFilters,
  getEntryManagerRows,
  SlashCommandParser,
  debounce,
  hljs,
  getSortableDelay,
  isTrueBoolean,
  $,
  getEditorPanelApi,
}) => {
  const cleanupBulkEditRowRef = { current: null };

  // E8/E8b — hooks the existing World Info update path (no new listener) so an
  // outside edit to the entry being edited closes its dropdown and re-renders
  // the cell. Registered here, once, for the same reason as the reload hooks.
  registerCharacterFilterUpdateHook();

  const renderEntryManagerForBook = async (book = null, { selectedRowKeys = null } = {}) =>
    renderEntryManager({
      book,
      selectedRowKeys,
      cleanupBulkEditRowRef,
      dom,
      cache,
      entryManagerState,
      ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
      ENTRY_MANAGER_DEFAULT_COLUMNS,
      ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY,
      SORT,
      SORT_DIRECTION,
      appendSortOptions,
      ensureCustomDisplayIndex,
      saveWorldInfo,
      buildSavePayload,
      getEntryManagerEntries,
      applyEntryManagerSortToDom,
      updateEntryManagerPreview,
      clearEntryManagerScriptFilters,
      applyEntryManagerColumnVisibility,
      setEntryManagerSort,
      isEntryManagerRowSelected,
      setEntryManagerRowSelected,
      setAllEntryManagerRowSelected,
      updateEntryManagerSelectAllButton,
      applyEntryManagerStrategyFilters,
      applyEntryManagerStrategyFilterToRow,
      applyEntryManagerPositionFilterToRow,
      applyEntryManagerPositionFilters,
      applyEntryManagerRecursionFilterToRow,
      applyEntryManagerRecursionFilters,
      applyEntryManagerOutletFilters,
      applyEntryManagerOutletFilterToRow,
      applyEntryManagerAutomationIdFilters,
      applyEntryManagerGroupFilters,
      applyEntryManagerCharacterFilterPresenceFilters,
      applyEntryManagerCharacterFilterValueFilters,
      setEntryManagerRowFilterState,
      syncEntryManagerStrategyFilters,
      syncEntryManagerPositionFilters,
      syncEntryManagerOutletFilters,
      syncEntryManagerAutomationIdFilters,
      syncEntryManagerGroupFilters,
      syncEntryManagerCharacterFilterValueFilters,
      focusWorldEntry,
      entryState,
      isOutletPosition,
      getStrategyOptions,
      getStrategyValues,
      getPositionOptions,
      getPositionValues,
      getOutletOptions,
      getOutletValues,
      getAutomationIdOptions,
      getAutomationIdValues,
      getGroupOptions,
      getGroupValues,
      getCharacterFilterPickerOptions,
      normalizeStrategyFilters,
      normalizePositionFilters,
      normalizeOutletFilters,
      normalizeAutomationIdFilters,
      normalizeGroupFilters,
      getEntryManagerRows,
      SlashCommandParser,
      debounce,
      hljs,
      getSortableDelay,
      isTrueBoolean,
      $,
      getEditorPanelApi,
    });

  // After a book is reloaded from disk (e.g. a bulk save that failed on it),
  // the cache holds the saved truth while the table still shows the rejected
  // change. Re-render from the cache so the user sees what is actually stored.
  // Only when the table is on screen: `dom.order.tbody` is cleared on every
  // render and set again once the table is built.
  registerBookReloadHooks({
    refreshEntryManager: async () => {
      // `dom.order.tbody` is also undefined for the duration of any render, so
      // a reload landing mid-render is skipped. Say so rather than leave the
      // table silently showing values the reload just discarded.
      if (!dom.order.tbody) {
        console.warn('[STWID] Entry Manager not ready; skipped the post-reload table refresh.');
        return;
      }
      const selectedRowKeys = new Set(
        getEntryManagerRows().filter(isEntryManagerRowSelected).map(entryManagerRowKey),
      );
      await renderEntryManagerForBook(entryManagerState.book ?? null, { selectedRowKeys });
    },
  });

  return { renderEntryManager: renderEntryManagerForBook };
};

export { createEntryManagerRenderer };
