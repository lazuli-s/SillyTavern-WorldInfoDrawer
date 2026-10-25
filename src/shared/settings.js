import { SORT, SORT_DIRECTION } from './constants.js';
import { ENTRY_TAG_SORT, normalizeStoredEntryTags, restoreDefaultEntryTags } from './entry-tags.js';
import { createEmptyEntryTagFilter, normalizeEntryTagFilter } from './entry-tags.filter.js';
import { parseBooleanSetting } from './utils.js';

export { SORT, SORT_DIRECTION } from './constants.js';

const WORLD_INFO_DRAWER_SETTINGS_KEY = 'worldInfoDrawer';
const DEFAULT_SORT_LOGIC = SORT.TITLE;
const DEFAULT_SORT_DIRECTION = SORT_DIRECTION.ASCENDING;

const KNOWN_SETTINGS_KEYS = [
  'sortLogic',
  'sortDirection',
  'useBookSorts',
  'featureFolderGrouping',
  'featureAdditionalMatchingSources',
  'hiddenTabs',
  'entryTags',
  'entryTagSort',
  'entryTagsSeeded',
  'entryTagFilter',
];

const VALID_HIDDEN_TAB_IDS = Object.freeze(['lorebooks', 'visibility', 'sorting', 'search']);

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
  this.featureAdditionalMatchingSources = parseBooleanSetting(
    this.featureAdditionalMatchingSources,
    true,
  );
}

// The ten default entry tags are seeded once ever: after that the flag stays
// set, so a list the user emptied stays empty (Restore defaults brings them back).
function applyEntryTagDefaults() {
  this.entryTags = normalizeStoredEntryTags(this.entryTags);
  this.entryTagSort = ensureEnumValue(this.entryTagSort, ENTRY_TAG_SORT, ENTRY_TAG_SORT.MANUAL);
  this.entryTagsSeeded = parseBooleanSetting(this.entryTagsSeeded, false);
  if (!this.entryTagsSeeded) {
    this.entryTags = restoreDefaultEntryTags(this.entryTags).tags;
    this.entryTagsSeeded = true;
  }
  // Read after the tags: a remembered pill whose tag was deleted is dropped.
  this.entryTagFilter = normalizeEntryTagFilter(this.entryTagFilter, this.entryTags);
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

  /** Entry tag definitions; the list order is the manual order. */
  entryTags = [];
  entryTagSort = ENTRY_TAG_SORT.MANUAL;
  entryTagsSeeded = false;
  /** The Visibility tab's Entry tags pills: `{ include, exclude, untagged }`. */
  entryTagFilter = createEmptyEntryTagFilter();

  constructor() {
    const { extensionSettings } = getSettingsContext();
    const savedSettings = extensionSettings[WORLD_INFO_DRAWER_SETTINGS_KEY];

    applySavedSettings.call(this, savedSettings);

    extensionSettings[WORLD_INFO_DRAWER_SETTINGS_KEY] = this;

    this.sortLogic = ensureEnumValue(this.sortLogic, SORT, DEFAULT_SORT_LOGIC);
    this.sortDirection = ensureEnumValue(
      this.sortDirection,
      SORT_DIRECTION,
      DEFAULT_SORT_DIRECTION,
    );

    applyBooleanSettingDefaults.call(this);
    if (!Array.isArray(this.hiddenTabs)) {
      this.hiddenTabs = [];
    }
    this.hiddenTabs = this.hiddenTabs.filter((tabId) => VALID_HIDDEN_TAB_IDS.includes(tabId));
    applyEntryTagDefaults.call(this);
  }

  toJSON() {
    return {
      sortLogic: this.sortLogic,
      sortDirection: this.sortDirection,
      useBookSorts: this.useBookSorts,
      featureFolderGrouping: this.featureFolderGrouping,
      featureAdditionalMatchingSources: this.featureAdditionalMatchingSources,
      hiddenTabs: this.hiddenTabs,
      entryTags: this.entryTags,
      entryTagSort: this.entryTagSort,
      entryTagsSeeded: this.entryTagsSeeded,
      entryTagFilter: this.entryTagFilter,
    };
  }

  save() {
    const { saveSettingsDebounced } = getSettingsContext();
    saveSettingsDebounced();
  }
}
