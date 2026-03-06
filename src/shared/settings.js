import { SORT, SORT_DIRECTION } from './constants.js';
import { parseBooleanSetting } from './utils.js';

export { SORT, SORT_DIRECTION } from './constants.js';


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
    
    sortLogic = SORT.TITLE;
    
    sortDirection = SORT_DIRECTION.ASCENDING;
    
    useBookSorts = true;

    featureFolderGrouping = true;
    featureAdditionalMatchingSources = true;
    hiddenTabs = [];

    constructor() {
        const { extensionSettings } = getSettingsContext();
        
        
        const saved = extensionSettings.worldInfoDrawer;
        if (saved && typeof saved === 'object') {
            for (const key of KNOWN_SETTINGS_KEYS) {
                if (Object.hasOwn(saved, key)) {
                    this[key] = saved[key];
                }
            }
        }

        
        
        
        extensionSettings.worldInfoDrawer = this;

        if (!Object.values(SORT).includes(this.sortLogic)) {
            this.sortLogic = SORT.TITLE;
        }
        if (!Object.values(SORT_DIRECTION).includes(this.sortDirection)) {
            this.sortDirection = SORT_DIRECTION.ASCENDING;
        }
        
        
        
        
        this.useBookSorts = parseBooleanSetting(this.useBookSorts, true);
        this.featureFolderGrouping = parseBooleanSetting(this.featureFolderGrouping, true);
        this.featureAdditionalMatchingSources = parseBooleanSetting(this.featureAdditionalMatchingSources, true);
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
