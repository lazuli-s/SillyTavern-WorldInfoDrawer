import { maybeYieldToEventLoop } from '../../shared/utils.js';
import { setupEntryManagerSorting } from './table.body.row-sorting.js';
import { buildEntryManagerRow } from './table.body.cells.js';

// Rows are heavy (~30 nodes, ~20 listeners each), so yield more often than
// BULK_APPLY_BATCH_SIZE to keep each chunk well under a frame-budget freeze.
const ROW_BUILD_BATCH_SIZE = 50;

function createBookSaveSerializer(saveWorldInfo, buildSavePayload) {
  const inFlightByBook = new Map();

  const pendingByBook = new Set();

  async function runSave(bookName) {
    do {
      pendingByBook.delete(bookName);
      try {
        await saveWorldInfo(bookName, buildSavePayload(bookName), true);
      } catch (err) {
        console.error('[WorldInfoDrawer] Entry Manager save failed for book:', bookName, err);
      }
    } while (pendingByBook.has(bookName));
    inFlightByBook.delete(bookName);
  }

  return async function enqueueSave(bookName) {
    if (inFlightByBook.has(bookName)) {
      pendingByBook.add(bookName);
      await inFlightByBook.get(bookName);
    } else {
      const p = runSave(bookName);
      inFlightByBook.set(bookName, p);
      await p;
    }
  };
}

function getEntryEditTemplates() {
  const entryEditTemplate = document.querySelector('#entry_edit_template');
  const enabledToggleTemplate = entryEditTemplate?.querySelector('[name="entryKillSwitch"]');
  const strategyTemplate = entryEditTemplate?.querySelector('[name="entryStateSelector"]');
  const positionTemplate = entryEditTemplate?.querySelector('[name="position"]');
  if (!enabledToggleTemplate || !strategyTemplate || !positionTemplate) {
    throw new Error(
      '[WorldInfoDrawer] Missing entry edit template controls for Entry Manager render.',
    );
  }
  return { enabledToggleTemplate, strategyTemplate, positionTemplate };
}

export async function buildTableBody({
  entries,
  dom,
  cache,
  refreshOutletFilterIndicator,
  refreshAutomationIdFilterIndicator,
  refreshGroupFilterIndicator,
  isOutletPosition,
  saveWorldInfo,
  buildSavePayload,
  focusWorldEntry,
  isEntryManagerRowSelected,
  setEntryManagerRowSelected,
  updateEntryManagerSelectAllButton,
  refreshSelectionCount,
  applyEntryManagerStrategyFilterToRow,
  applyEntryManagerPositionFilterToRow,
  applyEntryManagerRecursionFilterToRow,
  applyEntryManagerStrategyFilters,
  applyEntryManagerRecursionFilters,
  applyEntryManagerOutletFilters,
  applyEntryManagerAutomationIdFilters,
  applyEntryManagerGroupFilters,
  syncEntryManagerOutletFilters,
  syncEntryManagerAutomationIdFilters,
  syncEntryManagerGroupFilters,
  entryState,
  getEntryManagerRows,
  setEntryManagerSort,
  SORT,
  SORT_DIRECTION,
  getSortableDelay,
  $,
}) {
  const tbody = document.createElement('tbody');
  dom.order.tbody = tbody;

  const enqueueSave = createBookSaveSerializer(saveWorldInfo, buildSavePayload);
  const { enabledToggleTemplate, strategyTemplate, positionTemplate } = getEntryEditTemplates();
  const { getVisibleEntryManagerRows, updateCustomOrderFromDom } = setupEntryManagerSorting({
    tbody,
    dom,
    cache,
    enqueueSave,
    setEntryManagerSort,
    SORT,
    SORT_DIRECTION,
    getSortableDelay,
    $,
    getEntryManagerRows,
  });

  for (let i = 0; i < entries.length; i++) {
    const entryRow = entries[i];
    tbody.append(
      buildEntryManagerRow({
        entryRow,
        dom,
        cache,
        enqueueSave,
        focusWorldEntry,
        isEntryManagerRowSelected,
        setEntryManagerRowSelected,
        updateEntryManagerSelectAllButton,
        refreshSelectionCount,
        applyEntryManagerStrategyFilterToRow,
        applyEntryManagerPositionFilterToRow,
        applyEntryManagerRecursionFilterToRow,
        syncEntryManagerOutletFilters,
        syncEntryManagerAutomationIdFilters,
        syncEntryManagerGroupFilters,
        refreshOutletFilterIndicator,
        refreshAutomationIdFilterIndicator,
        refreshGroupFilterIndicator,
        applyEntryManagerOutletFilters,
        applyEntryManagerAutomationIdFilters,
        applyEntryManagerGroupFilters,
        isOutletPosition,
        entryState,
        enabledToggleTemplate,
        strategyTemplate,
        positionTemplate,
        getVisibleEntryManagerRows,
        updateCustomOrderFromDom,
      }),
    );
    await maybeYieldToEventLoop(i, ROW_BUILD_BATCH_SIZE);
    // A newer render may have replaced dom.order.tbody during the yield;
    // abandon this stale build so we don't repopulate outdated state.
    if (dom.order.tbody !== tbody) return tbody;
  }

  applyEntryManagerStrategyFilters();
  applyEntryManagerRecursionFilters();
  applyEntryManagerOutletFilters();
  applyEntryManagerAutomationIdFilters();
  applyEntryManagerGroupFilters();
  updateEntryManagerSelectAllButton();

  return tbody;
}
