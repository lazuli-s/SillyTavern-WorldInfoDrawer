import { applyMobileHeaderLayout } from './editor-panel-mobile.js';

const ACTIVE_STATE_CLASS = 'stwid--state-active';
const FOCUS_CLASS = 'stwid--focus';
const AMS_OPEN_CLASS = 'stwid--ams-open';
const AMS_WIRED_DATASET_VALUE = '1';
const EDITOR_EVENT_INPUT = 'input';
const EDITOR_EVENT_CHANGE = 'change';
const EDITOR_EVENT_KEYDOWN = 'keydown';

const NON_EDITING_KEYS = new Set([
    'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
    'Tab', 'Escape', 'Enter',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'PageUp', 'PageDown', 'Home', 'End',
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
    return Boolean(name && uid != null);
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
        const activationHeading = document.createElement('h4'); {
            activationHeading.textContent = 'Global World Info/Lorebook activation settings';
            dom.editor.append(activationHeading);
        }
        dom.editor.append(activationBlock);
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
        const unfocus = createFocusToggleButton('stwid--unfocusToggle', 'fa-compress', 'Unfocus');
        dom.editor.append(unfocus);
    };

    const appendFocusButton = (entryEditorDom) => {
        const focusContainer = entryEditorDom.querySelector('label[for="content"] > small > span > span')
            ?? entryEditorDom.querySelector('label[for="content "] > small > span > span');
        if (!focusContainer) return;
        const focusToggleButton = createFocusToggleButton('stwid--focusToggle', 'fa-expand', 'Focus');
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

const buildEntryEditDom = async ({ buildSavePayload, getWorldEntry, isTokenCurrent, name, entry }) => {
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
    if (header) dom.editor.append(header);
    dom.editor.append(entryEditorDom);
    return entryRowDom;
};

const fetchEntryHeaderElement = async (renderTemplateAsync, isTokenCurrent) => {
    if (!isTokenCurrent()) return null;
    const headerTemplate = await renderTemplateAsync('worldInfoKeywordHeaders');
    if (!isTokenCurrent()) return null;
    return document.createRange()
        .createContextualFragment(headerTemplate)
        .querySelector('#WIEntryHeaderTitlesPC');
};

const fixTextpoleHeights = (entryEditorDom) => {
    entryEditorDom.querySelectorAll('.keyprimarytextpole, .keysecondarytextpole').forEach(textpoleTextarea => {
        textpoleTextarea.style.height = '0px';
        textpoleTextarea.style.height = `${textpoleTextarea.scrollHeight + 3}px`;
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

        const target = (evt.target instanceof HTMLElement ? evt.target : null);
        if (!target) return false;
        return Boolean(target.closest('input, textarea, [contenteditable=""], [contenteditable="true"]'));
    };

    const { cleanup } = wireEditorDirtyTracking({ dom, markEditorDirtyIfCurrent, shouldMarkDirtyOnKeydown });

    return {
        cleanup,
        markEditorClean,
        setCurrentEditorKey: (v) => { currentEditorKey = v; },
        setIsEditorDirty: (v) => { isEditorDirty = v; },
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

    const { clearEntryHighlights, clearEditor, setActiveEntryDom } = createEditorClearer({ dom, resetEditorOwnership });

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
        resetEditorOwnership();
    };

    const {
        showActivationSettings,
        toggleActivationSettings,
    } = createActivationSettingsController({
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
        setActiveEntryDom(renderEntryEditorDom({
            appendUnfocusButton,
            clearEditor,
            clearEntryHighlights,
            dom,
            entryEditorDom,
            entryRowDom,
            header,
        }));
        wireAmsDrawerSection(entryEditorDom);
        fixTextpoleHeights(entryEditorDom);
        setCurrentEditor({ name, uid: entry.uid });
        markEditorClean(name, entry.uid);
    };

    const isDirty = (name, uid) => {
        if (!hasValidEditorKey(name, uid)) return false;
        return Boolean(getIsEditorDirty() && getCurrentEditorKey()?.name === name && getCurrentEditorKey()?.uid === uid);
    };

    const markClean = (name, uid) => {
        if (!hasValidEditorKey(name, uid)) return;
        if (getCurrentEditorKey()?.name !== name || getCurrentEditorKey()?.uid !== uid) return;
        setIsEditorDirty(false);
    };

    return {
        cleanup,
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
