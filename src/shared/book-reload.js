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

import { loadWorldInfo, worldInfoCache, world_names } from './st-host.js';

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
 * @param {string[]} [deps.hostNames] - Defaults to the host's `world_names`. A
 *   name missing from that list no longer resolves to any file and counts as a
 *   failed reload rather than as an empty-but-existing book.
 * @returns {Promise<string[]>} The names that were reloaded, in order.
 */
export async function reloadBooksFromDisk(
  bookNames,
  { loadBook = loadWorldInfo, hostCache = worldInfoCache, hostNames = world_names } = {},
) {
  const reloaded = [];
  for (const bookName of bookNames) {
    try {
      // If the read below fails, the host cache is simply left without this
      // book. That is a miss, not corruption: the next `loadWorldInfo` refills
      // it from the server. Putting the entry back is not an option either way
      // — `worldInfoCache.set()` is the host's to call, never ours.
      //
      // KNOWN LIMIT (host behaviour, read 24-08-2026 in
      // vendor/SillyTavern/public/scripts/world-info.js `loadWorldInfo`):
      // between the delete below and the read's resolution, a concurrent
      // `saveWorldInfo` for the same book puts its fresh payload into
      // `worldInfoCache` immediately (before its own save completes); when the
      // reload response then arrives, the host overwrites that cache slot with
      // the older disk state (`worldInfoCache.set(name, data)`,
      // world-info.js:2054), leaving the cache stale until the next write or
      // invalidation for that name. Closing the window needs coordination with
      // the callers' per-book save serializers, which shared/ must not depend
      // on — a deliberate decision left to a ticket-level discussion, not made
      // here. Keep the delete→read pair in this order; do not "simplify" it away.
      hostCache?.delete?.(bookName);
      const bookData = await loadBook(bookName);
      if (!bookData || typeof bookData !== 'object' || !bookData.entries) {
        console.error(LOG_PREFIX, `Could not reload "${bookName}" from disk.`);
        continue;
      }
      // A book deleted since the failed save still answers HTTP 200 with an
      // empty dummy book (`/api/worldinfo/get` reads with allowDummy), so
      // emptiness cannot tell "exists but empty" from "gone". The host's name
      // list can: reconciling the dummy would wipe our cache and DOM for a
      // phantom and report the reload as a success. Best-effort only — a list
      // not yet refreshed after a very recent deletion can still let one
      // through.
      if (!Array.isArray(hostNames) || !hostNames.includes(bookName)) {
        console.error(
          LOG_PREFIX,
          `Book "${bookName}" is no longer in the host's book list; treating the reload as failed.`,
        );
        continue;
      }
      // A throw from the hook is an extension-side rendering failure, not a
      // disk-read failure — the read above already succeeded and the host
      // cache holds the fresh data. Give it its own message so the log points
      // at the step that actually failed.
      try {
        await reconcileBookHook?.(bookName, bookData);
      } catch (error) {
        console.error(
          LOG_PREFIX,
          `Failed to apply the reloaded data for "${bookName}" to the extension UI.`,
          error,
        );
        continue;
      }
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
