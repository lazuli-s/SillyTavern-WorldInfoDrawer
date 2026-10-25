import { applyEntryToggleA11y } from '../shared/entry-toggle-a11y.js';
import { debounce_timeout } from '../shared/st-host.js';

import { applyMobileHeaderLayout, MOBILE_EDITOR_MEDIA_QUERY } from './editor-panel-mobile.js';
import { createEditorClearer } from './editor-panel.clearer.js';
import { createEntryTagsRowController } from './editor-panel.entry-tags.js';
import { createFieldHelpBubble, decorateFieldHelp } from './editor-panel.field-help.js';
import { createPendingEditorSave } from './editor-panel.pending-save.js';

const ACTIVE_STATE_CLASS = 'stwid--state-active';
const FOCUS_CLASS = 'stwid--focus';
const AMS_OPEN_CLASS = 'stwid--ams-open';
const MOBILE_PANEL_OPEN_CLASS = 'stwid--mobile-panel-open';
const AMS_WIRED_DATASET_VALUE = '1';
const EDITOR_EVENT_INPUT = 'input';
const EDITOR_EVENT_CHANGE = 'change';
const EDITOR_EVENT_KEYDOWN = 'keydown';
const LAST_EDIT_SAVE_FAILED_MESSAGE =
  'The last edit to the previous entry could not be saved. Reopen it and check its text.';

const NON_EDITING_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
  'Tab',
  'Escape',
  'Enter',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

const resetEditorOwnershipState = ({ setCurrentEditor, setCurrentEditorKey, setIsEditorDirty }) => {
  setCurrentEditor(null);
  setCurrentEditorKey(null);
  setIsEditorDirty(false);
};

const hasActivationSettingsDom = (activationBlock, activationBlockParent) => {
  return Boolean(activationBlock && activationBlockParent);
};

const hasValidEditorKey = (name, uid) => {
  return Boolean(name && uid !== null && uid !== undefined);
};

/**
 * Whether an editor key (`{ name, uid }`) is the given book and entry. The key
 * holds the entry's `uid` as a number; the update handler passes the `entries`
 * object key, a string — so the uid is compared as text, as `isCurrentEditor`
 * in `wi-update-handler.js` does. The book name must match exactly.
 */
export const isEditorKeyFor = (key, name, uid) =>
  Boolean(key) && key.name === name && String(key.uid) === String(uid);

// A control injected into the editor that saves its own changes (the Entry tags
// row) carries `data-stwid-no-dirty` — typing there leaves nothing unsaved.
const NO_DIRTY_SELECTOR = '[data-stwid-no-dirty]';
const isFromNoDirtyControl = (evt) =>
  evt.target instanceof Element && Boolean(evt.target.closest(NO_DIRTY_SELECTOR));

const wireEditorDirtyTracking = ({ dom, markEditorDirtyIfCurrent, shouldMarkDirtyOnKeydown }) => {
  const onEditorInput = (evt) => {
    if (!isFromNoDirtyControl(evt)) markEditorDirtyIfCurrent();
  };
  const onEditorChange = onEditorInput;
  const onEditorKeydown = (evt) => {
    if (!isFromNoDirtyControl(evt) && shouldMarkDirtyOnKeydown(evt)) {
      markEditorDirtyIfCurrent();
    }
  };

  dom.editor?.addEventListener?.(EDITOR_EVENT_INPUT, onEditorInput, true);
  dom.editor?.addEventListener?.(EDITOR_EVENT_CHANGE, onEditorChange, true);
  dom.editor?.addEventListener?.(EDITOR_EVENT_KEYDOWN, onEditorKeydown, true);

  const cleanup = () => {
    dom.editor?.removeEventListener?.(EDITOR_EVENT_INPUT, onEditorInput, true);
    dom.editor?.removeEventListener?.(EDITOR_EVENT_CHANGE, onEditorChange, true);
    dom.editor?.removeEventListener?.(EDITOR_EVENT_KEYDOWN, onEditorKeydown, true);
  };

  return { cleanup };
};

const createActivationSettingsController = ({
  activationBlock,
  activationBlockParent,
  clearEditor,
  clearEntryHighlights,
  dom,
  hideActivationSettings,
  resetEditorOwnership,
}) => {
  const renderActivationSettings = () => {
    clearEditor({ resetCurrent: false });
    if (dom.order.toggle.classList.contains(ACTIVE_STATE_CLASS)) {
      dom.order.toggle.click();
    }
    clearEntryHighlights();
    const activationHeading = document.createElement('h4');
    {
      activationHeading.textContent = 'Global World Info/Lorebook activation settings';
      dom.editor.append(activationHeading);
    }
    dom.editor.append(activationBlock);
    dom.drawer.body?.classList?.add(MOBILE_PANEL_OPEN_CLASS);
  };

  const showActivationSettings = () => {
    if (!hasActivationSettingsDom(activationBlock, activationBlockParent)) return;
    dom.activationToggle.classList.add(ACTIVE_STATE_CLASS);
    resetEditorOwnership();
    renderActivationSettings();
  };

  const toggleActivationSettings = () => {
    if (!hasActivationSettingsDom(activationBlock, activationBlockParent)) return;
    const isActive = dom.activationToggle.classList.toggle(ACTIVE_STATE_CLASS);
    resetEditorOwnership();
    if (isActive) {
      renderActivationSettings();
    } else {
      activationBlockParent.append(activationBlock);
      clearEditor({ resetCurrent: false });
    }
  };

  return {
    hideActivationSettings,
    showActivationSettings,
    toggleActivationSettings,
  };
};

const createFocusControls = ({ createFocusToggleButton, dom }) => {
  const appendUnfocusButton = () => {
    const unfocus = createFocusToggleButton('stwid--unfocus-toggle', 'fa-compress', 'Unfocus');
    // Keeps ST's `menu_button` look: this toggle is not one of the three icon
    // squares gallery decision 8C names, and it lives outside `.world_entry`.
    unfocus.classList.add('menu_button');
    dom.editor.append(unfocus);
  };

  const appendFocusButton = (entryEditorDom) => {
    const focusContainer =
      entryEditorDom.querySelector('label[for="content"] > small > span > span') ??
      entryEditorDom.querySelector('label[for="content "] > small > span > span');
    if (!focusContainer) return;
    // No `menu_button`: gallery decision 8C makes this button one of the editor
    // panel's three bare icon squares, sharing a shape with the host's maximize
    // icon beside it. Keeping the class would mean overriding the whole
    // `.menu_button` cascade, and on a page running the Moonlit Echoes theme
    // that cascade carries `background-color: … !important`, which no
    // unflagged rule of ours can beat. `style.css` section 4 gives it its
    // shape and section 4.1 its hover, focus and disabled states.
    const focusToggleButton = createFocusToggleButton('stwid--focus-toggle', 'fa-expand', 'Focus');
    focusContainer.append(focusToggleButton);
  };

  return { appendFocusButton, appendUnfocusButton };
};

const syncAmsDrawerIcon = ({ chevronIcon, isOpen }) => {
  if (!chevronIcon) return;
  chevronIcon.classList.toggle('up', isOpen);
  chevronIcon.classList.toggle('down', !isOpen);
  chevronIcon.classList.toggle('fa-circle-chevron-up', isOpen);
  chevronIcon.classList.toggle('fa-circle-chevron-down', !isOpen);
};

const wireAmsDrawerSection = (entryEditorDom, attempts = 0) => {
  if (!document.contains(entryEditorDom)) return;
  const amsHeader = entryEditorDom.querySelector('.userSettingsInnerExpandable');
  const amsDrawer = amsHeader?.closest('.inline-drawer');
  if (!amsHeader || !amsDrawer) {
    if (attempts < 30) {
      requestAnimationFrame(() => wireAmsDrawerSection(entryEditorDom, attempts + 1));
    }
    return;
  }

  if (amsDrawer.dataset.stwidAmsWired === AMS_WIRED_DATASET_VALUE) return;
  amsDrawer.dataset.stwidAmsWired = AMS_WIRED_DATASET_VALUE;

  amsDrawer.classList.add('stwid--ams');
  amsDrawer.classList.remove(AMS_OPEN_CLASS);
  amsDrawer.classList.remove('openDrawer');
  if (document.body.classList.contains('stwid--ams-disabled')) {
    amsDrawer.style.setProperty('display', 'none', 'important');
  } else {
    amsDrawer.style.removeProperty('display');
  }
  const chevronIcon = amsDrawer.querySelector('.inline-drawer-icon');
  syncAmsDrawerIcon({ chevronIcon, isOpen: false });

  amsHeader.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = amsDrawer.classList.toggle(AMS_OPEN_CLASS);
    syncAmsDrawerIcon({ chevronIcon, isOpen });
  });
};

const prepareToOpenEntryEditor = ({ getSelectFrom, isTokenCurrent, selectEnd }) => {
  if (!isTokenCurrent?.()) return false;
  if (getSelectFrom()) selectEnd();
  return true;
};

const buildEntryEditDom = async ({
  buildSavePayload,
  getWorldEntry,
  isTokenCurrent,
  name,
  entry,
}) => {
  if (!isTokenCurrent()) return null;
  const payload = buildSavePayload(name);
  const payloadEntry = payload?.entries?.[entry.uid];
  if (!payloadEntry) return null;
  const entryEditorDom = (await getWorldEntry(name, payload, payloadEntry))[0];
  // The host builds a fresh active-state toggle on every `getWorldEntry`, with
  // no event to hang a re-apply on — so the keyboard treatment goes on here,
  // where the rebuild happens, before the DOM is appended. `applyMobileHeaderLayout`
  // later moves this same node into the mobile header slot, which keeps its
  // attributes and listeners.
  applyEntryToggleA11y(entryEditorDom?.querySelector?.('div[name="entryKillSwitch"]'));
  const drawerToggle = entryEditorDom?.querySelector?.('.inline-drawer');
  if (drawerToggle) {
    $(drawerToggle).trigger('inline-drawer-toggle');
  }
  if (!isTokenCurrent()) return null;
  // The payload goes back with the DOM: the host's field handlers write into it
  // and save it, so the Entry tags row has to write there too.
  return { entryEditorDom, payload, payloadEntry };
};

const renderEntryEditorDom = ({
  appendUnfocusButton,
  clearEditor,
  clearEntryHighlights,
  dom,
  entryEditorDom,
  entryRowDom,
  header,
}) => {
  clearEditor({ resetCurrent: false });
  clearEntryHighlights();
  entryRowDom.classList.add(ACTIVE_STATE_CLASS);
  appendUnfocusButton();
  dom.drawer.body?.classList?.add(MOBILE_PANEL_OPEN_CLASS);
  if (header) dom.editor.append(header);
  dom.editor.append(entryEditorDom);
  return entryRowDom;
};

const fetchEntryHeaderElement = async (renderTemplateAsync, isTokenCurrent) => {
  if (!isTokenCurrent()) return null;
  const headerTemplate = await renderTemplateAsync('worldInfoKeywordHeaders');
  if (!isTokenCurrent()) return null;
  return document
    .createRange()
    .createContextualFragment(headerTemplate)
    .querySelector('#WIEntryHeaderTitlesPC');
};

const fixTextpoleHeights = (entryEditorDom) => {
  // Separate the write/read/write phases so the browser only reflows once
  // instead of once per textarea (PERF-W4-06): reset both heights, then read
  // both scrollHeights, then apply both final heights.
  const textpoleTextareas = [
    ...entryEditorDom.querySelectorAll('.keyprimarytextpole, .keysecondarytextpole'),
  ];
  for (const textpoleTextarea of textpoleTextareas) {
    textpoleTextarea.style.height = '0px';
  }
  const finalHeights = textpoleTextareas.map(
    (textpoleTextarea) => textpoleTextarea.scrollHeight + 3,
  );
  textpoleTextareas.forEach((textpoleTextarea, index) => {
    textpoleTextarea.style.height = `${finalHeights[index]}px`;
  });
};

const createDirtyTracker = ({ dom, noteEdit }) => {
  let isEditorDirty = false;
  let currentEditorKey = null;

  const markEditorClean = (name, uid) => {
    if (!hasValidEditorKey(name, uid)) return;
    currentEditorKey = { name, uid };
    isEditorDirty = false;
  };

  const markEditorDirtyIfCurrent = () => {
    if (!currentEditorKey) return;
    isEditorDirty = true;
    // Not undone by markClean / markEditorClean: the host's own save of this
    // edit can still be waiting after the editor stops being 'dirty'.
    noteEdit();
  };

  const shouldMarkDirtyOnKeydown = (evt) => {
    if (evt.ctrlKey || evt.metaKey || evt.altKey) return false;
    const pressedKey = evt.key;
    if (NON_EDITING_KEYS.has(pressedKey)) return false;

    const target = evt.target instanceof HTMLElement ? evt.target : null;
    if (!target) return false;
    return Boolean(
      target.closest('input, textarea, [contenteditable=""], [contenteditable="true"]'),
    );
  };

  const { cleanup } = wireEditorDirtyTracking({
    dom,
    markEditorDirtyIfCurrent,
    shouldMarkDirtyOnKeydown,
  });

  return {
    cleanup,
    markEditorClean,
    setCurrentEditorKey: (v) => {
      currentEditorKey = v;
    },
    setIsEditorDirty: (v) => {
      isEditorDirty = v;
    },
    getIsEditorDirty: () => isEditorDirty,
    getCurrentEditorKey: () => currentEditorKey,
  };
};

export const initEditorPanel = ({
  dom,
  activationBlock,
  activationBlockParent,
  renderTemplateAsync,
  getWorldEntry,
  wiHandlerApi,
  cache,
  enqueueBookSave,
  saveWorldInfo,
  setCurrentEditor,
  getSelectFrom,
  selectEnd,
}) => {
  const { buildSavePayload, waitForWorldInfoUpdate, waitForWorldInfoUpdateWithTimeout } = wiHandlerApi;
  const pendingSave = createPendingEditorSave({
    enqueueBookSave,
    saveWorldInfo,
    waitForWorldInfoUpdate,
    waitForWorldInfoUpdateWithTimeout,
    hostSaveDelayMs: debounce_timeout.relaxed,
    onSaveFailed: () => toastr.error(LAST_EDIT_SAVE_FAILED_MESSAGE),
  });

  const {
    cleanup,
    markEditorClean,
    setCurrentEditorKey,
    setIsEditorDirty,
    getIsEditorDirty,
    getCurrentEditorKey,
  } = createDirtyTracker({ dom, noteEdit: pendingSave.noteEdit });

  const resetEditorOwnership = () => {
    resetEditorOwnershipState({
      setCurrentEditor,
      setCurrentEditorKey,
      setIsEditorDirty,
    });
  };

  // The touch and keyboard help bubble lives in the editor column, so clearing
  // or rebuilding the editor closes it.
  const fieldHelpBubble = createFieldHelpBubble(dom.editor);

  const { clearEntryHighlights, clearEditor, setActiveEntryDom } = createEditorClearer({
    closeFieldHelp: fieldHelpBubble.close,
    dom,
    flushPendingSave: () => pendingSave.flush(),
    resetEditorOwnership,
    resetPendingSave: pendingSave.reset,
  });

  // Responsive lifecycle for the open entry editor. The mobile header transform only runs
  // once at open time, so without this the editor keeps a stale layout when the viewport
  // crosses the 1000px breakpoint (e.g. window resize, phone rotation, split-screen).
  const editorLayoutMedia = window.matchMedia?.(MOBILE_EDITOR_MEDIA_QUERY);
  let currentEntryEditorDom = null;
  let reopenCurrentEditor = null;
  let openEditorIsMobileLayout = false;

  const handleEditorLayoutBreakpointChange = () => {
    if (!currentEntryEditorDom || !document.contains(currentEntryEditorDom)) return;
    const nowMobileLayout = editorLayoutMedia?.matches ?? false;
    if (nowMobileLayout === openEditorIsMobileLayout) return;
    fieldHelpBubble.close();

    if (nowMobileLayout) {
      // Entering mobile: restructure the live editor in place. applyMobileHeaderLayout
      // relocates existing nodes (it does not rebuild them), so unsaved edits survive.
      applyMobileHeaderLayout(currentEntryEditorDom);
      // The rebuild re-mints the header titles and drops their ? icons.
      decorateFieldHelp(currentEntryEditorDom);
      openEditorIsMobileLayout = true;
      return;
    }

    // Leaving mobile for desktop: the transform is destructive and not reversible in
    // place, so the only clean recovery is a full re-render from saved entry data. That
    // would discard unsaved edits, so re-render only when the editor is clean; otherwise
    // keep the user's current input intact even if the layout looks slightly off.
    if (getIsEditorDirty()) return;
    reopenCurrentEditor?.();
  };

  editorLayoutMedia?.addEventListener?.('change', handleEditorLayoutBreakpointChange);

  const entryTagsRow = createEntryTagsRowController({
    cache,
    buildSavePayload,
    enqueueBookSave,
    saveWorldInfo,
  });

  const resetEditorState = () => {
    if (dom.activationToggle.classList.contains(ACTIVE_STATE_CLASS)) {
      hideActivationSettings();
    } else {
      clearEditor();
    }
    clearEntryHighlights();
  };

  const hideActivationSettings = () => {
    if (!hasActivationSettingsDom(activationBlock, activationBlockParent)) return;
    dom.activationToggle.classList.remove(ACTIVE_STATE_CLASS);
    activationBlockParent.append(activationBlock);
    clearEditor({ resetCurrent: false });
    dom.drawer.body?.classList?.remove(MOBILE_PANEL_OPEN_CLASS);
    resetEditorOwnership();
  };

  const { showActivationSettings, toggleActivationSettings } = createActivationSettingsController({
    activationBlock,
    activationBlockParent,
    clearEditor,
    clearEntryHighlights,
    dom,
    hideActivationSettings,
    resetEditorOwnership,
  });

  const createFocusToggleButton = (toggleClass, iconClass, title) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', title);
    button.classList.add(toggleClass, 'fa-solid', 'fa-fw', iconClass);
    button.title = title;
    button.addEventListener('click', () => {
      dom.editor.classList.toggle(FOCUS_CLASS);
    });
    return button;
  };

  const { appendFocusButton, appendUnfocusButton } = createFocusControls({
    createFocusToggleButton,
    dom,
  });

  const closeCompetingPanels = () => {
    if (dom.activationToggle.classList.contains(ACTIVE_STATE_CLASS)) {
      hideActivationSettings();
    }
    if (dom.order.toggle.classList.contains(ACTIVE_STATE_CLASS)) {
      dom.order.toggle.click();
    }
  };

  const openEntryEditor = async ({ entry, entryDom: entryRowDom, name, isTokenCurrent }) => {
    if (!prepareToOpenEntryEditor({ getSelectFrom, isTokenCurrent, selectEnd })) return;
    closeCompetingPanels();
    const header = await fetchEntryHeaderElement(renderTemplateAsync, isTokenCurrent);
    if (!isTokenCurrent()) return;
    // Save the entry being left before this one's copy of the book is built, so
    // the copy contains that edit and the host's pending save is not replaced.
    await pendingSave.flush({ nextBookName: name });
    if (!isTokenCurrent()) return;
    const editDom = await buildEntryEditDom({
      buildSavePayload,
      getWorldEntry,
      isTokenCurrent,
      name,
      entry,
    });
    if (!editDom) return;
    const { entryEditorDom, payload, payloadEntry } = editDom;
    pendingSave.track(name, payload);
    applyMobileHeaderLayout(entryEditorDom);
    entryTagsRow.mount({
      entryEditorDom,
      bookName: name,
      uid: entry.uid,
      editorPayload: payload,
      editorEntry: payloadEntry,
    });
    decorateFieldHelp(entryEditorDom);
    appendFocusButton(entryEditorDom);
    setActiveEntryDom(
      renderEntryEditorDom({
        appendUnfocusButton,
        clearEditor,
        clearEntryHighlights,
        dom,
        entryEditorDom,
        entryRowDom,
        header,
      }),
    );
    wireAmsDrawerSection(entryEditorDom);
    fixTextpoleHeights(entryEditorDom);
    setCurrentEditor({ name, uid: entry.uid });
    markEditorClean(name, entry.uid);

    // Track the open editor so a later viewport breakpoint change can re-apply or
    // re-render the correct layout. Reusing the original isTokenCurrent keeps the
    // re-render safe: if the user has since opened another entry, the token is stale
    // and the re-open aborts on its own.
    currentEntryEditorDom = entryEditorDom;
    reopenCurrentEditor = () =>
      openEntryEditor({ entry, entryDom: entryRowDom, name, isTokenCurrent });
    openEditorIsMobileLayout = editorLayoutMedia?.matches ?? false;
  };

  const isDirty = (name, uid) => {
    if (!hasValidEditorKey(name, uid)) return false;
    return Boolean(getIsEditorDirty() && isEditorKeyFor(getCurrentEditorKey(), name, uid));
  };

  const markClean = (name, uid) => {
    if (!hasValidEditorKey(name, uid)) return;
    if (!isEditorKeyFor(getCurrentEditorKey(), name, uid)) return;
    setIsEditorDirty(false);
  };

  const cleanupEditorPanel = () => {
    cleanup();
    entryTagsRow.cleanup();
    fieldHelpBubble.cleanup();
    editorLayoutMedia?.removeEventListener?.('change', handleEditorLayoutBreakpointChange);
  };

  return {
    cleanup: cleanupEditorPanel,
    clearEditor,
    clearEntryHighlights,
    hideActivationSettings,
    showActivationSettings,
    toggleActivationSettings,
    resetEditorState,
    openEntryEditor,
    isDirty,
    markClean,
    /** Redraws the open entry's tag row after the tag definitions changed. */
    refreshEntryTags: () => entryTagsRow.refresh(),
  };
};
