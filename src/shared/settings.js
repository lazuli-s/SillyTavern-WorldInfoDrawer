import { SORT, SORT_DIRECTION } from './constants.js';
import { parseBooleanSetting } from './utils.js';

export { SORT, SORT_DIRECTION } from './constants.js';

const WORLD_INFO_DRAWER_SETTINGS_KEY = 'worldInfoDrawer';
const DEFAULT_SORT_LOGIC = SORT.TITLE;
const DEFAULT_SORT_DIRECTION = SORT_DIRECTION.ASCENDING;

const KNOWN_SETTINGS_KEYS =  ([
    'sortLogic',
    'sortDirection',
    'useBookSorts',
    'featureFolderGrouping',
    'featureAdditionalMatchingSources',
    'hiddenTabs',
]);

const VALID_HIDDEN_TAB_IDS = Object.freeze([
    'settings',
    'lorebooks',
    'folders',
    'visibility',
    'sorting',
    'search',
]);

function ensureEnumValue(value, enumObject, defaultValue) {
    return Object.values(enumObject).includes(value) ? value : defaultValue;
}

function applySavedSettings(savedSettings) {
    if (!savedSettings || typeof savedSettings !== 'object') {
        return;
    }

    for (const settingsKey of KNOWN_SETTINGS_KEYS) {
        if (Object.hasOwn(savedSettings, settingsKey)) {
            this[settingsKey] = savedSettings[settingsKey];
        }
    }
}

function applyBooleanSettingDefaults() {
    this.useBookSorts = parseBooleanSetting(this.useBookSorts, true);
    this.featureFolderGrouping = parseBooleanSetting(this.featureFolderGrouping, true);
    this.featureAdditionalMatchingSources = parseBooleanSetting(this.featureAdditionalMatchingSources, true);
}

function getSettingsContext() {
    const { saveSettingsDebounced, extensionSettings } = SillyTavern.getContext();
    return { saveSettingsDebounced, extensionSettings };
}

export class Settings {
    
    static #instance;
    static get instance() {
        if (!this.#instance) {
            this.#instance = new Settings();
        }
        return this.#instance;
    }
    
    sortLogic = DEFAULT_SORT_LOGIC;
    
    sortDirection = DEFAULT_SORT_DIRECTION;
    
    useBookSorts = true;

    featureFolderGrouping = true;
    featureAdditionalMatchingSources = true;
    hiddenTabs = [];

    constructor() {
        const { extensionSettings } = getSettingsContext();
        const savedSettings = extensionSettings[WORLD_INFO_DRAWER_SETTINGS_KEY];

        applySavedSettings.call(this, savedSettings);

        extensionSettings[WORLD_INFO_DRAWER_SETTINGS_KEY] = this;

        this.sortLogic = ensureEnumValue(this.sortLogic, SORT, DEFAULT_SORT_LOGIC);
        this.sortDirection = ensureEnumValue(this.sortDirection, SORT_DIRECTION, DEFAULT_SORT_DIRECTION);

        applyBooleanSettingDefaults.call(this);
        if (!Array.isArray(this.hiddenTabs)) {
            this.hiddenTabs = [];
        }
        this.hiddenTabs = this.hiddenTabs.filter((tabId)=>VALID_HIDDEN_TAB_IDS.includes(tabId));
    }

    toJSON() {
        return {
            sortLogic: this.sortLogic,
            sortDirection: this.sortDirection,
            useBookSorts: this.useBookSorts,
            featureFolderGrouping: this.featureFolderGrouping,
            featureAdditionalMatchingSources: this.featureAdditionalMatchingSources,
            hiddenTabs: this.hiddenTabs,
        };
    }

    save() {
        const { saveSettingsDebounced } = getSettingsContext();
        saveSettingsDebounced();
    }
}
