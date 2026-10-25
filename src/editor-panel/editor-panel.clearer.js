// Empties the entry editor and forgets which entry row is highlighted. Leaving
// the editor first closes the field-help bubble and flushes the pending save,
// so an edit still inside the host's save delay reaches disk.

const ACTIVE_STATE_CLASS = 'stwid--state-active';
const FOCUS_CLASS = 'stwid--focus';
const MOBILE_PANEL_OPEN_CLASS = 'stwid--mobile-panel-open';

export const createEditorClearer = ({ closeFieldHelp, dom, flushPendingSave, resetEditorOwnership, resetPendingSave }) => {
  let activeEntryDom = null;

  const clearEntryHighlights = () => {
    if (activeEntryDom) {
      activeEntryDom.classList.remove(ACTIVE_STATE_CLASS);
      activeEntryDom = null;
    }
  };

  const clearEditor = ({ resetCurrent = true } = {}) => {
    closeFieldHelp();
    // Not awaited: leaving the editor must not wait on the disk. The call reads
    // the tracked copy synchronously, before `reset()` forgets it.
    flushPendingSave();
    dom.editor.innerHTML = '';
    dom.editor.classList.remove(FOCUS_CLASS);
    if (resetCurrent) {
      dom.drawer.body?.classList?.remove(MOBILE_PANEL_OPEN_CLASS);
      resetEditorOwnership();
      resetPendingSave();
    }
  };

  const setActiveEntryDom = (entryRowDom) => {
    activeEntryDom = entryRowDom;
  };

  return { clearEntryHighlights, clearEditor, setActiveEntryDom };
};
