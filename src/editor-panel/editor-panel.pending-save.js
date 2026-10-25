// Saves the open entry editor's copy of its book when the owner leaves the
// editor while SillyTavern's own save of that edit may still be waiting.
//
// The host saves a form edit through `saveWorldInfo(name, data)` without
// `immediately`, which goes into one debounced call shared by every book: only
// the last call's arguments survive. Opening another entry and editing it
// within that window replaced the first edit's save, and the next editor copy
// (built from the extension's cache, which has not seen the edit yet) did not
// contain it either.

const LOG_PREFIX = '[STWID]';

// Default for the host's `saveWorldDebounced` delay in `world-info.js`
// (`debounce_timeout.relaxed`). The editor panel passes the host's own value as
// `hostSaveDelayMs`; this default keeps the module free of host imports.
export const HOST_FORM_SAVE_DELAY_MS = 1000;
// Covers timer drift and a slow tab, so an edit made right at the edge is still
// flushed rather than trusted to the host.
export const PENDING_SAVE_MARGIN_MS = 500;

export const createPendingEditorSave = ({
  enqueueBookSave,
  saveWorldInfo,
  waitForWorldInfoUpdate,
  waitForWorldInfoUpdateWithTimeout,
  now = Date.now,
  hostSaveDelayMs = HOST_FORM_SAVE_DELAY_MS,
  onSaveFailed,
}) => {
  let trackedName = null;
  let trackedPayload = null;
  let lastEditAt = null;
  // Book name → the newest leave-save of that book still in flight, settling
  // once the save and the cache update it causes have landed (or the wait timed
  // out, or the save failed). Never rejects.
  const inFlightByBook = new Map();

  const track = (name, payload) => {
    trackedName = name;
    trackedPayload = payload;
    lastEditAt = null;
  };

  const noteEdit = () => {
    lastEditAt = now();
  };

  const mayHavePendingSave = () =>
    Boolean(trackedPayload) &&
    lastEditAt !== null &&
    now() - lastEditAt < hostSaveDelayMs + PENDING_SAVE_MARGIN_MS;

  // Returns a promise for the save alone (true when it landed); the save and its
  // cache update are recorded in `inFlightByBook`.
  const startSave = (name, payload) => {
    // The update token is captured when this is called, so it has to start
    // before the save that triggers the update. Started on every save: leaving
    // through Back to Books does not know which entry opens next.
    const waitPromise = waitForWorldInfoUpdate();
    const saved = enqueueBookSave(name, () => saveWorldInfo(name, payload, true)).then(
      () => true,
      (error) => {
        console.error(LOG_PREFIX, 'Saving the last edit on leaving the editor failed', error);
        onSaveFailed?.(name);
        return false;
      },
    );
    const caughtUp = saved.then(async (landed) => {
      if (landed) await waitForWorldInfoUpdateWithTimeout(waitPromise);
    });
    inFlightByBook.set(name, caughtUp);
    void caughtUp.finally(() => {
      if (inFlightByBook.get(name) === caughtUp) inFlightByBook.delete(name);
    });
    return saved;
  };

  // `nextBookName` is the book of the entry about to open; leaving through Back
  // to Books passes none. Only the same book waits for the extension's cache to
  // catch up — for this flush's save or for one still in flight from an earlier
  // leave: another book's cache is not affected by the save.
  const flush = async ({ nextBookName } = {}) => {
    if (mayHavePendingSave()) {
      const name = trackedName;
      const payload = trackedPayload;
      // Cleared before saving so a second flush (leaving, then opening) is a no-op.
      lastEditAt = null;
      const saved = startSave(name, payload);
      if (nextBookName !== name) await saved;
    }
    const caughtUp = nextBookName === undefined ? undefined : inFlightByBook.get(nextBookName);
    if (caughtUp) await caughtUp;
  };

  // Leaves `inFlightByBook` alone: a save already sent still has to be waited
  // for by the next open of its book.
  const reset = () => {
    trackedName = null;
    trackedPayload = null;
    lastEditAt = null;
  };

  return {
    track,
    noteEdit,
    mayHavePendingSave,
    flush,
    reset,
  };
};
