const ACTIVE_STATE_CLASS = 'stwid--state-active';
const FOCUS_CLASS = 'stwid--focus';
const AMS_OPEN_CLASS = 'stwid--ams-open';
const AMS_WIRED_DATASET_VALUE = '1';
const EDITOR_EVENT_INPUT = 'input';
const EDITOR_EVENT_CHANGE = 'change';
const EDITOR_EVENT_KEYDOWN = 'keydown';
const MOBILE_EDITOR_MEDIA_QUERY = '(max-width: 1000px)';

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

    const appendFocusButton = (editDom) => {
        const focusContainer = editDom.querySelector('label[for="content"] > small > span > span')
            ?? editDom.querySelector('label[for="content "] > small > span > span');
        if (!focusContainer) return;
        const focusToggleButton = createFocusToggleButton('stwid--focusToggle', 'fa-expand', 'Focus');
        focusContainer.append(focusToggleButton);
    };

    return { appendFocusButton, appendUnfocusButton };
};

const syncAmsDrawerIcon = ({ icon, isOpen }) => {
    if (!icon) return;
    icon.classList.toggle('up', isOpen);
    icon.classList.toggle('down', !isOpen);
    icon.classList.toggle('fa-circle-chevron-up', isOpen);
    icon.classList.toggle('fa-circle-chevron-down', !isOpen);
};

const wireAmsDrawerSection = (editDom, attempts = 0) => {
    const amsHeader = editDom.querySelector('.userSettingsInnerExpandable');
    const amsDrawer = amsHeader?.closest('.inline-drawer');
    if (!amsHeader || !amsDrawer) {
        if (attempts < 30) {
            requestAnimationFrame(() => wireAmsDrawerSection(editDom, attempts + 1));
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
    const icon = amsDrawer.querySelector('.inline-drawer-icon');
    syncAmsDrawerIcon({ icon, isOpen: false });

    amsHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = amsDrawer.classList.toggle(AMS_OPEN_CLASS);
        syncAmsDrawerIcon({ icon, isOpen });
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
    const editDom = (await getWorldEntry(name, payload, payloadEntry))[0];
    const drawerToggle = editDom?.querySelector?.('.inline-drawer');
    if (drawerToggle) {
        $(drawerToggle).trigger('inline-drawer-toggle');
    }
    if (!isTokenCurrent()) return null;
    return editDom;
};

const shouldUseMobileEditorLayout = () => {
    return window.matchMedia?.(MOBILE_EDITOR_MEDIA_QUERY)?.matches ?? false;
};

const createMobileHeaderLabel = (text) => {
    const label = document.createElement('small');
    label.classList.add('textAlignCenter', 'stwid--editorHeaderLabel');
    label.textContent = text.replace(/:\s*$/, '');
    return label;
};

const normalizeMobileHeaderControl = (control) => {
    control.classList.add('stwid--editorHeaderControl');
    control.classList.remove(
        'wi-enter-footer-text',
        'flex-container',
        'flexNoGap',
        'world_entry_form_radios',
        'probabilityContainer',
    );
    const existingLabel = control.querySelector('.WIEntryHeaderTitleMobile');
    if (!existingLabel || control.querySelector('.stwid--editorHeaderLabel')) return control;

    const label = createMobileHeaderLabel(existingLabel.textContent ?? '');
    existingLabel.remove();
    control.prepend(label);
    return control;
};

const applyMobileHeaderLayout = (editDom) => {
    if (!shouldUseMobileEditorLayout()) return;

    const thinControls = editDom.querySelector('.world_entry_thin_controls');
    const headerContent = thinControls?.querySelector('.flex-container.alignitemscenter.wide100p');
    const titleAndStatus = editDom.querySelector('.WIEntryTitleAndStatus');
    const titleTextarea = titleAndStatus?.querySelector("textarea[name='comment']");
    const headerControls = editDom.querySelector('.WIEnteryHeaderControls');
    const strategySelect = titleAndStatus?.querySelector?.("select[name='entryStateSelector']");
    const killSwitch = thinControls?.querySelector('.killSwitch');
    if (!thinControls || !headerContent || !titleAndStatus || !titleTextarea || !headerControls || !strategySelect || !killSwitch) return;
    if (thinControls.querySelector('.stwid--editorHeaderTopRow')) return;

    const topRow = document.createElement('div');
    topRow.classList.add('stwid--editorHeaderTopRow');

    const toggleSlot = document.createElement('div');
    toggleSlot.classList.add('stwid--editorHeaderToggleSlot');
    toggleSlot.append(killSwitch);

    const titleControl = document.createElement('div');
    titleControl.classList.add('world_entry_form_control', 'stwid--editorHeaderTitleControl');
    titleTextarea.rows = 2;
    titleControl.append(createMobileHeaderLabel('Title/Memo'), titleTextarea);

    topRow.append(toggleSlot, titleControl);

    const strategyControl = document.createElement('div');
    strategyControl.classList.add(
        'world_entry_form_control',
        'stwid--editorHeaderStrategy',
    );
    strategyControl.append(createMobileHeaderLabel('Strategy'), strategySelect);

    headerControls.classList.add('stwid--editorHeaderFieldRow');
    headerControls.prepend(strategyControl);
    Array.from(headerControls.children)
        .filter((child) => child instanceof HTMLElement && child.classList.contains('world_entry_form_control'))
        .forEach((child) => normalizeMobileHeaderControl(child));

    titleAndStatus.remove();
    headerContent.replaceChildren(topRow, headerControls);
};

const renderEntryEditorDom = ({
    appendUnfocusButton,
    clearEditor,
    clearEntryHighlights,
    dom,
    editDom,
    entryDom,
    header,
}) => {
    clearEditor({ resetCurrent: false });
    clearEntryHighlights();
    entryDom.classList.add(ACTIVE_STATE_CLASS);
    appendUnfocusButton();
    if (header) dom.editor.append(header);
    dom.editor.append(editDom);
    return entryDom;
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
    let isEditorDirty = false;
    let currentEditorKey = null;
    let activeEntryDom = null;

    const markEditorClean = (name, uid)=>{
        if (!hasValidEditorKey(name, uid)) return;
        currentEditorKey = { name, uid };
        isEditorDirty = false;
    };

    const markEditorDirtyIfCurrent = ()=>{
        if (!currentEditorKey) return;
        isEditorDirty = true;
    };

    const shouldMarkDirtyOnKeydown = (evt)=>{
        if (evt.ctrlKey || evt.metaKey || evt.altKey) return false;
        const pressedKey = evt.key;
        const nonEditingKeys = new Set([
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
        if (nonEditingKeys.has(pressedKey)) return false;

        const target =  (evt.target instanceof HTMLElement ? evt.target : null);
        if (!target) return false;
        return Boolean(target.closest('input, textarea, [contenteditable=""], [contenteditable="true"]'));
    };

    const { cleanup } = wireEditorDirtyTracking({
        dom,
        markEditorDirtyIfCurrent,
        shouldMarkDirtyOnKeydown,
    });

    const clearEntryHighlights = () => {
        if (activeEntryDom) {
            activeEntryDom.classList.remove(ACTIVE_STATE_CLASS);
            activeEntryDom = null;
        }
    };

    const clearEditor = ({ resetCurrent = true } = {}) => {
        dom.editor.innerHTML = '';
        if (resetCurrent) {
            resetEditorOwnershipState({
                setCurrentEditor,
                setCurrentEditorKey: (nextValue) => { currentEditorKey = nextValue; },
                setIsEditorDirty: (nextValue) => { isEditorDirty = nextValue; },
            });
        }
    };

    const resetEditorOwnership = () => {
        resetEditorOwnershipState({
            setCurrentEditor,
            setCurrentEditorKey: (nextValue) => { currentEditorKey = nextValue; },
            setIsEditorDirty: (nextValue) => { isEditorDirty = nextValue; },
        });
    };

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

    const fetchEntryHeaderElement = async (isTokenCurrent) => {
        if (!isTokenCurrent()) return null;
        const headerTemplate = await renderTemplateAsync('worldInfoKeywordHeaders');
        if (!isTokenCurrent()) return null;
        return document.createRange()
            .createContextualFragment(headerTemplate)
            .querySelector('#WIEntryHeaderTitlesPC');
    };

    const fixTextpoleHeights = (editDom) => {
        editDom.querySelectorAll('.keyprimarytextpole, .keysecondarytextpole').forEach(textpoleTextarea => {
            textpoleTextarea.style.height = '0px';
            textpoleTextarea.style.height = `${textpoleTextarea.scrollHeight + 3}px`;
        });
    };

    const openEntryEditor = async ({ entry, entryDom, name, isTokenCurrent }) => {
        if (!prepareToOpenEntryEditor({ getSelectFrom, isTokenCurrent, selectEnd })) return;
        closeCompetingPanels();
        const header = await fetchEntryHeaderElement(isTokenCurrent);
        if (!isTokenCurrent()) return;
        const editDom = await buildEntryEditDom({
            buildSavePayload,
            getWorldEntry,
            isTokenCurrent,
            name,
            entry,
        });
        if (!editDom) return;
        applyMobileHeaderLayout(editDom);
        appendFocusButton(editDom);
        activeEntryDom = renderEntryEditorDom({
            appendUnfocusButton,
            clearEditor,
            clearEntryHighlights,
            dom,
            editDom,
            entryDom,
            header,
        });
        wireAmsDrawerSection(editDom);
        fixTextpoleHeights(editDom);
        setCurrentEditor({ name, uid: entry.uid });
        markEditorClean(name, entry.uid);
    };

    const isDirty = (name, uid)=>{
        if (!hasValidEditorKey(name, uid)) return false;
        return Boolean(isEditorDirty && currentEditorKey?.name === name && currentEditorKey?.uid === uid);
    };

    const markClean = (name, uid)=>{
        if (!hasValidEditorKey(name, uid)) return;
        if (currentEditorKey?.name !== name || currentEditorKey?.uid !== uid) return;
        isEditorDirty = false;
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
