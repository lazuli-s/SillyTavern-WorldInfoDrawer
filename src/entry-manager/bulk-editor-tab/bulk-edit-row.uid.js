import {
  BULK_APPLY_BATCH_SIZE,
  APPLY_DIRTY_CLASS,
  createLabeledBulkContainer,
  createApplyButton,
  buildPersistedNumberInput,
  maybeYieldToEventLoop,
  getSafeTbodyRows,
  getBulkTargets,
  saveUpdatedBooks,
  withApplyButtonLock,
} from './bulk-edit-row.helpers.js';

const MAX_UID_INPUT = '100000';
const UID_START_STORAGE_KEY = 'stwid--uid-start';

function groupTargetsByBook(targets) {
  const byBook = new Map();
  for (const target of targets) {
    if (!byBook.has(target.bookName)) {
      byBook.set(target.bookName, []);
    }
    byBook.get(target.bookName).push(target);
  }
  return byBook;
}

function findUidCollisions(byBook, cache, startValue) {
  const collisions = [];
  for (const [bookName, bookTargets] of byBook) {
    const selectedOldUids = new Set(bookTargets.map((target) => target.uid));
    const retainedUids = new Set(
      Object.keys(cache?.[bookName]?.entries ?? {}).filter((uid) => !selectedOldUids.has(uid)),
    );
    const collidingUids = [];
    for (let i = 0; i < bookTargets.length; i++) {
      const newUid = String(startValue + i);
      if (retainedUids.has(newUid)) {
        collidingUids.push(newUid);
      }
    }
    if (collidingUids.length > 0) {
      collisions.push({ bookName, collidingUids });
    }
  }
  return collisions;
}

async function rebuildBookUids(byBook, cache, startValue) {
  for (const [bookName, bookTargets] of byBook) {
    const selectedOldUids = new Set(bookTargets.map((target) => target.uid));
    const existingEntries = cache[bookName].entries;
    const freshEntries = {};
    for (const [uid, entryData] of Object.entries(existingEntries)) {
      if (!selectedOldUids.has(uid)) {
        freshEntries[uid] = entryData;
      }
    }
    for (let i = 0; i < bookTargets.length; i++) {
      const { entryData } = bookTargets[i];
      const newUid = startValue + i;
      entryData.uid = newUid;
      freshEntries[String(newUid)] = entryData;
      await maybeYieldToEventLoop(i, BULK_APPLY_BATCH_SIZE);
    }
    cache[bookName].entries = freshEntries;
  }
}

function createRunApplyUid({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyUid,
}) {
  return async function runApplyUid() {
    const applyButton = typeof applyUid === 'function' ? applyUid() : applyUid;
    await withApplyButtonLock(applyButton, async () => {
      const startValue = Number.parseInt(dom.order.uid.start.value, 10);
      if (!Number.isInteger(startValue) || startValue < 0) {
        toastr.warning('Start must be a whole number of 0 or greater.');
        return;
      }

      const rows = getSafeTbodyRows(dom);
      if (!rows) return;

      const targets = getBulkTargets(rows, cache, isEntryManagerRowSelected);
      if (targets.length === 0) return;

      const byBook = groupTargetsByBook(targets);

      const collisions = findUidCollisions(byBook, cache, startValue);
      if (collisions.length > 0) {
        const details = collisions
          .map(
            ({ bookName, collidingUids }) =>
              `in "${bookName}" these UIDs are already used by unselected entries: ${collidingUids.join(', ')}`,
          )
          .join('; ');
        toastr.warning(`Cannot renumber: ${details}.`);
        return;
      }

      await rebuildBookUids(byBook, cache, startValue);
      await saveUpdatedBooks(new Set(byBook.keys()), saveWorldInfo, buildSavePayload);
      applyButton.classList.remove(APPLY_DIRTY_CLASS);
    });
  };
}

export function buildBulkUidSection({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyRegistry,
}) {
  const uidContainer = createLabeledBulkContainer(
    'uid',
    'UID',
    'Renumber the UIDs of the selected entries sequentially, in table order, starting from the Start value. Blocked if it would duplicate an existing UID.',
  );

  let applyUid;
  const runApplyUid = createRunApplyUid({
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyUid: () => applyUid,
  });

  applyUid = createApplyButton('Renumber selected entries’ UIDs', runApplyUid, applyRegistry, {
    registerInApplyAll: false,
  });

  const markApplyButtonDirty = () => applyUid.classList.add(APPLY_DIRTY_CLASS);
  const { label: startLabel, inputEl: startInputEl } = buildPersistedNumberInput({
    labelText: 'Start',
    tooltipText: 'Starting UID value',
    storageKey: UID_START_STORAGE_KEY,
    defaultValue: '1',
    minValue: '0',
    maxValue: MAX_UID_INPUT,
    onDirty: markApplyButtonDirty,
  });
  dom.order.uid = { start: startInputEl };
  uidContainer.append(startLabel);

  uidContainer.append(applyUid);
  return uidContainer;
}
