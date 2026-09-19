import { setTooltip } from '../entry-manager.utils.js';
import { mirrorEntryFieldsToOriginalData } from '../../shared/original-data.js';

const STATE_FILTERED_CLASS = 'stwid--state-filtered';

const isRowFilteredOut = (row) => row.classList.contains(STATE_FILTERED_CLASS);

function buildMoveButton({ iconClass, tooltipText }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('stwid--order-move-button');
  setTooltip(button, tooltipText);
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-fw', iconClass);
  button.append(icon);
  return button;
}

function moveRowAndSyncCustomOrder({
  row,
  direction,
  mode,
  dom,
  getVisibleEntryManagerRows,
  updateCustomOrderFromDom,
}) {
  const visibleRows = getVisibleEntryManagerRows();
  if (!visibleRows.length || isRowFilteredOut(row)) return;

  let targetRow;
  if (mode === 'jump') {
    targetRow = direction === 'up' ? visibleRows[0] : visibleRows[visibleRows.length - 1];
    if (!targetRow || targetRow === row) return;
  } else {
    const index = visibleRows.indexOf(row);
    if (index === -1) return;
    targetRow = direction === 'up' ? visibleRows[index - 1] : visibleRows[index + 1];
    if (!targetRow) return;
  }

  if (direction === 'up') {
    dom.order.tbody.insertBefore(row, targetRow);
  } else {
    targetRow.insertAdjacentElement('afterend', row);
  }
  void updateCustomOrderFromDom();
}

function moveRowByOneStepInFilteredList({
  row,
  direction,
  dom,
  getVisibleEntryManagerRows,
  updateCustomOrderFromDom,
}) {
  moveRowAndSyncCustomOrder({
    row,
    direction,
    mode: 'step',
    dom,
    getVisibleEntryManagerRows,
    updateCustomOrderFromDom,
  });
}

export function createMoveButton({
  row,
  direction,
  iconClass,
  title,
  jumpTitle,
  dom,
  getVisibleEntryManagerRows,
  updateCustomOrderFromDom,
}) {
  const button = buildMoveButton({
    iconClass,
    tooltipText: `${title}. Double-click to jump to ${jumpTitle}`,
  });
  let clickTimer;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (clickTimer) {
      window.clearTimeout(clickTimer);
    }
    clickTimer = window.setTimeout(() => {
      moveRowByOneStepInFilteredList({
        row,
        direction,
        dom,
        getVisibleEntryManagerRows,
        updateCustomOrderFromDom,
      });
    }, 250);
  });
  button.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (clickTimer) {
      window.clearTimeout(clickTimer);
      clickTimer = null;
    }
    moveRowAndSyncCustomOrder({
      row,
      direction,
      mode: 'jump',
      dom,
      getVisibleEntryManagerRows,
      updateCustomOrderFromDom,
    });
  });
  return button;
}

/**
 * Ticket 07 — decides whether the order a drag just produced can be saved
 * without asking. A drag writes `display_index` for **every** row from the DOM
 * order, so the two views that are not the stored order write something the
 * screen never showed. Both were measured live on 05-09-2026 and the numbers
 * are quoted in the feature spec.
 *
 * @param {object} view
 * @param {boolean} view.isCustomSort Whether the table is showing the stored manual order.
 * @param {number} view.hiddenRowCount Rows the current filters are hiding.
 * @param {number} view.totalRowCount Rows in the table, hidden ones included.
 * @returns {{ isColumnSorted: boolean, hiddenRowCount: number, totalRowCount: number, needsConfirmation: boolean }}
 */
export function describeReorderView({ isCustomSort, hiddenRowCount, totalRowCount }) {
  const isColumnSorted = !isCustomSort;
  return {
    isColumnSorted,
    hiddenRowCount,
    totalRowCount,
    needsConfirmation: isColumnSorted || hiddenRowCount > 0,
  };
}

/**
 * The confirmation text. Says what the write does, not that a write is about to
 * happen — the surprise is the scope of it, and each cause is named separately
 * because they can be true at the same time and are fixed by different actions.
 *
 * @param {ReturnType<typeof describeReorderView>} view
 * @returns {string}
 */
export function buildReorderConfirmMessage({ isColumnSorted, hiddenRowCount, totalRowCount }) {
  const clauses = [];
  if (isColumnSorted) {
    clauses.push(
      'This table is sorted by a column, so the rows on screen are not the order stored in the ' +
        `book. Saving overwrites the stored order of all ${totalRowCount} ` +
        `${totalRowCount === 1 ? 'entry' : 'entries'} to match what you see now, and the manual ` +
        'order you had before cannot be recovered.',
    );
  }
  if (hiddenRowCount > 0) {
    clauses.push(
      `${hiddenRowCount} ${hiddenRowCount === 1 ? 'entry is' : 'entries are'} hidden by a filter. ` +
        `Where the row you moved ends up relative to ${hiddenRowCount === 1 ? 'it' : 'them'} is ` +
        'decided for you, and the table is not showing it.',
    );
  }
  return clauses.join(' ');
}

/**
 * Confirms through the host's own popup, the pattern
 * `bulk-edit-row.character-filter.js` already uses. Escape, Cancel and a popup
 * we cannot reach all answer "no", so nothing is written.
 *
 * @param {ReturnType<typeof describeReorderView>} view
 * @returns {Promise<boolean>}
 */
async function confirmReorderAgainstView(view) {
  const { Popup, POPUP_RESULT } = globalThis.SillyTavern?.getContext?.() ?? {};
  if (typeof Popup?.show?.confirm !== 'function' || !POPUP_RESULT) {
    // Fail safe: this write cannot be undone and the user cannot predict it from
    // the screen, so an unconfirmable reorder does not happen at all.
    console.warn('[STWID] Popup is unavailable; aborting the row reorder.');
    toastr.error('Could not show the confirmation dialog. The row order was not changed.');
    return false;
  }
  const result = await Popup.show.confirm(
    'Save this row order?',
    buildReorderConfirmMessage(view),
    {
      okButton: 'Save order',
      cancelButton: 'Cancel',
    },
  );
  return result === POPUP_RESULT.AFFIRMATIVE;
}

export function setupEntryManagerSorting({
  tbody,
  dom,
  cache,
  entryManagerState,
  enqueueSave,
  setEntryManagerSort,
  SORT,
  SORT_DIRECTION,
  getSortableDelay,
  $,
  getEntryManagerRows,
}) {
  const getVisibleEntryManagerRows = () => {
    const rows = getEntryManagerRows();
    return rows.filter((row) => !isRowFilteredOut(row));
  };

  const updateCustomOrderFromDom = async () => {
    if (!dom.order.tbody) return;
    setEntryManagerSort(SORT.CUSTOM, SORT_DIRECTION.ASCENDING);
    const rows = [...dom.order.tbody.querySelectorAll('tr')];
    const booksUpdated = new Set();
    const nextIndexByBook = new Map();
    for (const row of rows) {
      const bookName = row.getAttribute('data-book');
      const uid = row.getAttribute('data-uid');
      if (!bookName || !uid) continue;
      if (!cache[bookName]?.entries) continue;
      const entry = cache[bookName].entries[uid];
      if (!entry) continue;
      const nextIndex = nextIndexByBook.get(bookName) ?? 0;
      entry.extensions ??= {};
      if (entry.extensions.display_index !== nextIndex) {
        entry.extensions.display_index = nextIndex;
        mirrorEntryFieldsToOriginalData(cache[bookName], entry, ['displayIndex']);
        booksUpdated.add(bookName);
      }
      nextIndexByBook.set(bookName, nextIndex + 1);
    }
    for (const bookName of booksUpdated) {
      await enqueueSave(bookName);
    }
  };

  const describeCurrentReorderView = () => {
    const rows = getEntryManagerRows();
    return describeReorderView({
      isCustomSort: entryManagerState?.sort === SORT.CUSTOM,
      hiddenRowCount: rows.filter(isRowFilteredOut).length,
      totalRowCount: rows.length,
    });
  };

  // Captured on every drag start so a declined confirmation can put the rows
  // back. jQuery UI's own `sortable('cancel')` is not usable here: by the time
  // the popup answers, the drag it reverts has already finished.
  let rowOrderBeforeDrag = [];

  const restoreRowOrder = (rows) => {
    if (!dom.order.tbody) return;
    for (const row of rows) {
      // Skips the drag placeholder, which is gone from the tbody by now.
      if (row.parentElement === dom.order.tbody) dom.order.tbody.append(row);
    }
  };

  $(tbody).sortable({
    delay: getSortableDelay(),
    handle: '.stwid--sortable-handle',
    start: () => {
      rowOrderBeforeDrag = getEntryManagerRows();
    },
    update: async () => {
      const view = describeCurrentReorderView();
      if (view.needsConfirmation && !(await confirmReorderAgainstView(view))) {
        restoreRowOrder(rowOrderBeforeDrag);
        return;
      }
      await updateCustomOrderFromDom();
    },
  });

  return { getVisibleEntryManagerRows, updateCustomOrderFromDom };
}
