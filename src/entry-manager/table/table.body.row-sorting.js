import { setTooltip } from '../entry-manager.utils.js';
import { mirrorEntryFieldsToOriginalData } from '../../shared/original-data.js';

const STATE_FILTERED_CLASS = 'stwid--state-filtered';

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
  if (!visibleRows.length || row.classList.contains(STATE_FILTERED_CLASS)) return;

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

export function setupEntryManagerSorting({
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
}) {
  const getVisibleEntryManagerRows = () => {
    const rows = getEntryManagerRows();
    return rows.filter((row) => !row.classList.contains(STATE_FILTERED_CLASS));
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

  $(tbody).sortable({
    delay: getSortableDelay(),
    update: async () => {
      await updateCustomOrderFromDom();
    },
  });

  return { getVisibleEntryManagerRows, updateCustomOrderFromDom };
}
