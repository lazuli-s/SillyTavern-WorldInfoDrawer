// Single adapter for SillyTavern host module imports.
//
// Every file under src/ that needs a direct ES-module import from the host
// (as opposed to going through SillyTavern.getContext()) should import it
// from here instead of writing its own long relative path. This keeps the
// "how deep is src/shared/ under the host root" knowledge in one place —
// see SILLYTAVERN_OWNERSHIP_BOUNDARY.md, "This repo's concrete slice of the
// host surface", for why these particular symbols have no getContext() equivalent.

// world-info.js — lorebook CRUD, active-book state, folder metadata key
export {
  createNewWorldInfo,
  createWorldInfoEntry,
  deleteWIOriginalDataValue,
  deleteWorldInfo,
  deleteWorldInfoEntry,
  getFreeWorldName,
  getWorldEntry,
  loadWorldInfo,
  onWorldInfoChange,
  originalWIDataKeyMap,
  saveWorldInfo,
  setWIOriginalDataValue,
  METADATA_KEY,
  selected_world_info,
  world_info,
  world_names,
  worldInfoCache,
} from '../../../../../world-info.js';

// utils.js — general-purpose helpers with no getContext() equivalent (COMPAT-01)
export {
  debounce,
  debounceAsync,
  delay,
  download,
  getCharaFilename,
  getSortableDelay,
  isTrueBoolean,
} from '../../../../../utils.js';

// templates.js — server-rendered template fetch helper
export { renderTemplateAsync } from '../../../../../templates.js';

// extensions.js — presence probe for optional companion extensions
export { extensionNames } from '../../../../../extensions.js';
