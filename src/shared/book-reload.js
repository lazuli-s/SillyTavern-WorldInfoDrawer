// Reloading a book from disk after a write that did not reach it.
//
// `saveWorldInfo(name, data)` writes `data` into the host's `worldInfoCache`
// *before* it attempts the actual save, so after a failed save both the host
// cache and this extension's own cache hold changes that never reached disk.
// Reading the truth back therefore takes two steps: drop the host's cache entry
// (only `worldInfoCache.set()` is off limits to an extension — `delete` is
// plain cache invalidation, and the host does it too), then `loadWorldInfo()`,
// which now has to go to the server.
//
// Reconciling the freshly-read book into the extension's cache and DOM is
// `wi-update-handler`'s job, and re-rendering the Entry Manager table is the
// entry manager's. Neither can be imported from here (shared/ must not depend
// on feature modules), so both are injected once at startup via
// `registerBookReloadHooks()` — the same pattern `registerUiRefreshHooks()`
// already uses in `wi-update-handler.js`.

import { loadWorldInfo, worldInfoCache } from './st-host.js';

const LOG_PREFIX = '[STWID]';

/** @type {((bookName: string, bookData: object) => Promise<void>|void) | null} */
let reconcileBookHook = null;
/** @type {(() => Promise<void>|void) | null} */
let refreshEntryManagerHook = null;

/**
 * Registers the hooks `reloadBooksFromDisk` calls. Either may be omitted; pass
 * `null` to clear one. Called once at startup by each owning module.
 *
 * @param {object} hooks
 * @param {Function|null} [hooks.reconcileBook] - Syncs one book's fresh data
 *   into the extension cache and DOM (`wi-update-handler`'s `updateWIChange`).
 * @param {Function|null} [hooks.refreshEntryManager] - Re-renders the Entry
 *   Manager table from the cache, if it is on screen.
 */
export function registerBookReloadHooks({ reconcileBook, refreshEntryManager } = {}) {
  if (reconcileBook !== undefined) {
    reconcileBookHook = typeof reconcileBook === 'function' ? reconcileBook : null;
  }
  if (refreshEntryManager !== undefined) {
    refreshEntryManagerHook =
      typeof refreshEntryManager === 'function' ? refreshEntryManager : null;
  }
}

/**
 * Reloads books from disk and shows what was actually saved.
 *
 * Every book is attempted; one that cannot be reloaded is logged and skipped
 * rather than stopping the rest. The Entry Manager table is re-rendered once at
 * the end, only if at least one book came back — a table left showing values
 * that no longer match the cache would be the same lie in a different place.
 *
 * @param {Iterable<string>} bookNames
 * @param {object} [deps] - Test seams; production callers pass nothing.
 * @param {Function} [deps.loadBook] - Defaults to the host's `loadWorldInfo`.
 * @param {{delete: Function}} [deps.hostCache] - Defaults to `worldInfoCache`.
 * @returns {Promise<string[]>} The names that were reloaded, in order.
 */
export async function reloadBooksFromDisk(
  bookNames,
  { loadBook = loadWorldInfo, hostCache = worldInfoCache } = {},
) {
  const reloaded = [];
  for (const bookName of bookNames) {
    try {
      // If the read below fails, the host cache is simply left without this
      // book. That is a miss, not corruption: the next `loadWorldInfo` refills
      // it from the server. Putting the entry back is not an option either way
      // — `worldInfoCache.set()` is the host's to call, never ours.
      hostCache?.delete?.(bookName);
      const bookData = await loadBook(bookName);
      if (!bookData || typeof bookData !== 'object' || !bookData.entries) {
        console.error(LOG_PREFIX, `Could not reload "${bookName}" from disk.`);
        continue;
      }
      await reconcileBookHook?.(bookName, bookData);
      reloaded.push(bookName);
    } catch (error) {
      console.error(LOG_PREFIX, `Failed to reload "${bookName}" from disk.`, error);
    }
  }

  if (reloaded.length > 0) {
    try {
      await refreshEntryManagerHook?.();
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to refresh the Entry Manager after a reload.', error);
    }
  }

  return reloaded;
}
