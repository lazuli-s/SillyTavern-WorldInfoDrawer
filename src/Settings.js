import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';
import { SORT, SORT_DIRECTION } from './constants.js';
import { parseBooleanSetting } from './utils.js';

export { SORT, SORT_DIRECTION } from './constants.js';

/**
 * The allowlist of persisted settings keys. Only these fields are read from
 * saved data during hydration — unknown keys from stale or foreign data are
 * intentionally ignored to prevent arbitrary key pollution on the instance.
 * @type {ReadonlyArray<'sortLogic'|'sortDirection'|'useBookSorts'>}
 */
const KNOWN_SETTINGS_KEYS = /** @type {const} */ (['sortLogic', 'sortDirection', 'useBookSorts']);

export class Settings {
    /**@type {Settings} */
    static #instance;
    static get instance() {
        if (!this.#instance) {
            this.#instance = new Settings();
        }
        return this.#instance;
    }
    /**@type {SORT} */
    sortLogic = SORT.TITLE;
    /**@type {SORT_DIRECTION} */
    sortDirection = SORT_DIRECTION.ASCENDING;
    /**@type {boolean} */
    useBookSorts = true;

    constructor() {
        // Hydrate only known settings keys to prevent arbitrary key pollution from
        // stale or foreign data under extension_settings.worldInfoDrawer.
        const saved = extension_settings.worldInfoDrawer;
        if (saved && typeof saved === 'object') {
            for (const key of KNOWN_SETTINGS_KEYS) {
                if (Object.hasOwn(saved, key)) {
                    this[key] = saved[key];
                }
            }
        }

        // Store the class instance directly. SillyTavern serializes extension_settings
        // via JSON.stringify, which invokes toJSON() on this instance, ensuring only
        // the three declared fields (sortLogic, sortDirection, useBookSorts) are persisted.
        extension_settings.worldInfoDrawer = this;

        if (!Object.values(SORT).includes(this.sortLogic)) {
            this.sortLogic = SORT.TITLE;
        }
        if (!Object.values(SORT_DIRECTION).includes(this.sortDirection)) {
            this.sortDirection = SORT_DIRECTION.ASCENDING;
        }
        // Tolerant boolean normalization: accepts "true"/"false" strings and 1/0 numbers
        // in addition to native booleans, defaulting to true only for truly unrecognized values.
        // Prevents the user's explicit "false" preference from being silently overridden on
        // reload if settings were serialized through a path that coerces booleans to strings.
        this.useBookSorts = parseBooleanSetting(this.useBookSorts, true);
    }

    toJSON() {
        return {
            sortLogic: this.sortLogic,
            sortDirection: this.sortDirection,
            useBookSorts: this.useBookSorts,
        };
    }

    save() {
        saveSettingsDebounced();
    }
}
