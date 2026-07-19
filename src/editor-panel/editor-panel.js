import { applyMobileHeaderLayout } from './editor-panel-mobile.js';

const ACTIVE_STATE_CLASS = 'stwid--state-active';
const FOCUS_CLASS = 'stwid--focus';
const AMS_OPEN_CLASS = 'stwid--ams-open';
const MOBILE_PANEL_OPEN_CLASS = 'stwid--mobile-panel-open';
const AMS_WIRED_DATASET_VALUE = '1';
const EDITOR_EVENT_INPUT = 'input';
const EDITOR_EVENT_CHANGE = 'change';
const EDITOR_EVENT_KEYDOWN = 'keydown';

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

const wireEditorDirtyTracking = ({ dom, markEditorDirtyIfCurrent, shouldMarkDirtyOnKeydown }) => {
  const onEditorInput = markEditorDirtyIfCurrent;
  const onEditorChange = markEditorDirtyIfCurrent;
  const onEditorKeydown = (evt) => {
    if (shouldMarkDirtyOnKeydown(evt)) {
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
    dom.editor.append(unfocus);
  };

  const appendFocusButton = (entryEditorDom) => {
    const focusContainer =
      entryEditorDom.querySelector('label[for="content"] > small > span > span') ??
      entryEditorDom.querySelector('label[for="content "] > small > span > span');
    if (!focusContainer) return;
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
  const drawerToggle = entryEditorDom?.querySelector?.('.inline-drawer');
  if (drawerToggle) {
    $(drawerToggle).trigger('inline-drawer-toggle');
  }
  if (!isTokenCurrent()) return null;
  return entryEditorDom;
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

const createDirtyTracker = ({ dom }) => {
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

const createEditorClearer = ({ dom, resetEditorOwnership }) => {
  let activeEntryDom = null;

  const clearEntryHighlights = () => {
    if (activeEntryDom) {
      activeEntryDom.classList.remove(ACTIVE_STATE_CLASS);
      activeEntryDom = null;
    }
  };

  const clearEditor = ({ resetCurrent = true } = {}) => {
    dom.editor.innerHTML = '';
    dom.editor.classList.remove(FOCUS_CLASS);
    if (resetCurrent) {
      dom.drawer.body?.classList?.remove(MOBILE_PANEL_OPEN_CLASS);
      resetEditorOwnership();
    }
  };

  const setActiveEntryDom = (entryRowDom) => {
    activeEntryDom = entryRowDom;
  };

  return { clearEntryHighlights, clearEditor, setActiveEntryDom };
};

export const initEditorPanel = ({
  dom,
  activationBlock,
  activationBlockParent,
  renderTemplateAsync,
  getWorldEntry,
  buildSavePayload,
  setCurrentEditor,
  getSelectFrom,
  selectEnd,
}) => {
  const {
    cleanup,
    markEditorClean,
    setCurrentEditorKey,
    setIsEditorDirty,
    getIsEditorDirty,
    getCurrentEditorKey,
  } = createDirtyTracker({ dom });

  const resetEditorOwnership = () => {
    resetEditorOwnershipState({
      setCurrentEditor,
      setCurrentEditorKey,
      setIsEditorDirty,
    });
  };

  const { clearEntryHighlights, clearEditor, setActiveEntryDom } = createEditorClearer({
    dom,
    resetEditorOwnership,
  });

  // Responsive lifecycle for the open entry editor. The mobile header transform only runs
  // once at open time, so without this the editor keeps a stale layout when the viewport
  // crosses the 1000px breakpoint (e.g. window resize, phone rotation, split-screen).
  const editorLayoutMedia = window.matchMedia?.('(max-width: 1000px)');
  let currentEntryEditorDom = null;
  let reopenCurrentEditor = null;
  let openEditorIsMobileLayout = false;

  const handleEditorLayoutBreakpointChange = () => {
    if (!currentEntryEditorDom || !document.contains(currentEntryEditorDom)) return;
    const nowMobileLayout = editorLayoutMedia?.matches ?? false;
    if (nowMobileLayout === openEditorIsMobileLayout) return;

    if (nowMobileLayout) {
      // Entering mobile: restructure the live editor in place. applyMobileHeaderLayout
      // relocates existing nodes (it does not rebuild them), so unsaved edits survive.
      applyMobileHeaderLayout(currentEntryEditorDom);
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
    button.classList.add(toggleClass);
    button.classList.add('menu_button');
    button.classList.add('fa-solid', 'fa-fw', iconClass);
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
    const entryEditorDom = await buildEntryEditDom({
      buildSavePayload,
      getWorldEntry,
      isTokenCurrent,
      name,
      entry,
    });
    if (!entryEditorDom) return;
    applyMobileHeaderLayout(entryEditorDom);
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
    return Boolean(
      getIsEditorDirty() &&
      getCurrentEditorKey()?.name === name &&
      getCurrentEditorKey()?.uid === uid,
    );
  };

  const markClean = (name, uid) => {
    if (!hasValidEditorKey(name, uid)) return;
    if (getCurrentEditorKey()?.name !== name || getCurrentEditorKey()?.uid !== uid) return;
    setIsEditorDirty(false);
  };

  const cleanupEditorPanel = () => {
    cleanup();
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
  };
};
