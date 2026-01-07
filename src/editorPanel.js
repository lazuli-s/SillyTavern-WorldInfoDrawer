export const initEditorPanel = ({
    dom,
    activationBlock,
    activationBlockParent,
    renderTemplateAsync,
    getWorldEntry,
    cache,
    setCurrentEditor,
    getSelectFrom,
    selectEnd,
}) => {
    const clearEntryHighlights = () => {
        for (const cb of Object.values(cache)) {
            for (const ce of Object.values(cb.dom.entry)) {
                ce.root.classList.remove('stwid--active');
            }
        }
    };

    const clearEditor = ({ resetCurrent = true } = {}) => {
        dom.editor.innerHTML = '';
        if (resetCurrent) {
            setCurrentEditor(null);
        }
    };

    const hideActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        dom.activationToggle.classList.remove('stwid--active');
        activationBlockParent.append(activationBlock);
        clearEditor({ resetCurrent: false });
        setCurrentEditor(null);
    };

    const showActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        dom.activationToggle.classList.add('stwid--active');
        setCurrentEditor(null);
        clearEditor({ resetCurrent: false });
        if (dom.order.toggle.classList.contains('stwid--active')) {
            dom.order.toggle.click();
        }
        clearEntryHighlights();
        const h4 = document.createElement('h4'); {
            h4.textContent = 'Global World Info/Lorebook activation settings';
            dom.editor.append(h4);
        }
        dom.editor.append(activationBlock);
    };

    const toggleActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        const isActive = dom.activationToggle.classList.toggle('stwid--active');
        setCurrentEditor(null);
        if (isActive) {
            clearEditor({ resetCurrent: false });
            if (dom.order.toggle.classList.contains('stwid--active')) {
                dom.order.toggle.click();
            }
            clearEntryHighlights();
            const h4 = document.createElement('h4'); {
                h4.textContent = 'Global World Info/Lorebook activation settings';
                dom.editor.append(h4);
            }
            dom.editor.append(activationBlock);
        } else {
            activationBlockParent.append(activationBlock);
            clearEditor({ resetCurrent: false });
        }
    };

    const resetEditorState = () => {
        if (dom.activationToggle.classList.contains('stwid--active')) {
            hideActivationSettings();
        } else {
            clearEditor();
        }
        clearEntryHighlights();
    };

    const appendUnfocusButton = () => {
        const unfocus = document.createElement('div'); {
            unfocus.classList.add('stwid--unfocusToggle');
            unfocus.classList.add('menu_button');
            unfocus.classList.add('fa-solid', 'fa-fw', 'fa-compress');
            unfocus.title = 'Unfocus';
            unfocus.addEventListener('click', () => {
                dom.editor.classList.toggle('stwid--focus');
            });
            dom.editor.append(unfocus);
        }
    };

    const appendFocusButton = (editDom) => {
        const focusContainer = editDom.querySelector('label[for="content "] > small > span > span');
        if (!focusContainer) return;
        const btn = document.createElement('div'); {
            btn.classList.add('stwid--focusToggle');
            btn.classList.add('menu_button');
            btn.classList.add('fa-solid', 'fa-fw', 'fa-expand');
            btn.title = 'Focus';
            btn.addEventListener('click', () => {
                dom.editor.classList.toggle('stwid--focus');
            });
            focusContainer.append(btn);
        }
    };

    const openEntryEditor = async ({ entry, entryDom, name, isTokenCurrent }) => {
        if (getSelectFrom()) selectEnd();
        clearEntryHighlights();
        if (dom.activationToggle.classList.contains('stwid--active')) {
            hideActivationSettings();
        }
        if (dom.order.toggle.classList.contains('stwid--active')) {
            dom.order.toggle.click();
        }
        entryDom.classList.add('stwid--active');
        clearEditor({ resetCurrent: false });
        appendUnfocusButton();
        const editDom = (await getWorldEntry(name, { entries: cache[name].entries }, cache[name].entries[entry.uid]))[0];
        const titleMemoInput = editDom.querySelector('[name="comment"]');
        if (titleMemoInput) {
            const titleMemoLabel = document.createElement('small'); {
                titleMemoLabel.classList.add('textAlignCenter');
                const span = document.createElement('span'); {
                    span.textContent = 'Title/Memo';
                    titleMemoLabel.append(span);
                }
            }
            titleMemoInput.insertAdjacentElement('beforebegin', titleMemoLabel);
        }
        $(editDom.querySelector('.inline-drawer')).trigger('inline-drawer-toggle');
        if (!isTokenCurrent()) return;
        appendFocusButton(editDom);
        dom.editor.append(editDom);
        setCurrentEditor({ name, uid: entry.uid });
    };

    return {
        clearEditor,
        clearEntryHighlights,
        hideActivationSettings,
        showActivationSettings,
        toggleActivationSettings,
        resetEditorState,
        openEntryEditor,
    };
};
