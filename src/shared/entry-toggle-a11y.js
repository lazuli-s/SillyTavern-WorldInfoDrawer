// Keyboard reach and ARIA for the entry active-state toggle — SillyTavern's
// `div.killSwitch` in the editor panel, and this extension's own clone of the
// same template node in the Book Browser row.
//
// The host renders it as a bare `div` carrying only a `title`: no `tabindex`,
// no `role`, no accessible name and no key handling — `handleEntryKillSwitchHelper`
// in the host's `world-info.js` binds one jQuery `click` and nothing else. That
// makes it the only control in the editor panel a keyboard cannot operate.
//
// The ownership decision that allows this lives in the round-2 spec, section
// *F — keyboard reach*: attributes go on the per-entry element the host built
// for us, never on `#entry_edit_template`, and activation routes through the
// element's own `click()` so the host's handler still owns the toggle, the
// `originalData` mirror and the save.

const TOGGLE_ON_CLASS = 'fa-toggle-on';
const APPLIED_DATASET_VALUE = '1';

// Used only when the host element carries no `title` — every build of
// SillyTavern seen so far does, and its own text is preferred because it is
// what the host's i18n translates.
const FALLBACK_TOGGLE_LABEL = "Toggle entry's active state";

// The `aria-checked` value the element's classes currently mean. The class is
// the truth here, not the entry record: the host flips
// `fa-toggle-on`/`fa-toggle-off` synchronously inside its click handler, and
// this extension's row toggle does the same in `applyEnabledIcon`. An element
// carrying neither class reads as off - claiming an entry is active when we
// cannot tell is the more misleading of the two answers.
const readEntryToggleChecked = (element) =>
  String(Boolean(element?.classList?.contains(TOGGLE_ON_CLASS)));

/**
 * Writes `aria-checked` back in step with the element's classes.
 *
 * @param {Element} element the toggle element
 */
export const syncEntryToggleChecked = (element) => {
  if (!element) return;
  element.setAttribute('aria-checked', readEntryToggleChecked(element));
};

/**
 * Makes one active-state toggle reachable and operable by keyboard.
 *
 * Idempotent: a second call on the same element is a no-op, so a caller that
 * runs twice cannot stack duplicate listeners.
 *
 * @param {Element | null | undefined} element the toggle element, or nothing
 * @returns {boolean} whether this call was the one that applied the treatment
 */
export const applyEntryToggleA11y = (element) => {
  if (!element) return false;
  if (element.dataset.stwidToggleA11y === APPLIED_DATASET_VALUE) return false;
  element.dataset.stwidToggleA11y = APPLIED_DATASET_VALUE;

  // Claim the tab stop only when the host has not set one. The day SillyTavern
  // ships its own `tabindex` here, this becomes a no-op instead of a fight over
  // the attribute.
  if (element.getAttribute('tabindex') === null) {
    element.setAttribute('tabindex', '0');
  }
  element.setAttribute('role', 'switch');
  // The Book Browser row sets its own, better-scoped label before calling this;
  // the host element has none, so it falls back to the host's translated title.
  if (element.getAttribute('aria-label') === null) {
    element.setAttribute('aria-label', element.title || FALLBACK_TOGGLE_LABEL);
  }
  syncEntryToggleChecked(element);

  element.addEventListener('keydown', (evt) => {
    if (evt.key !== 'Enter' && evt.key !== ' ') return;
    // Space would scroll the panel and Enter would submit an enclosing form;
    // neither may happen in place of the toggle.
    evt.preventDefault();
    element.click();
  });

  // Registered after the host's own click handler, which jQuery bound inside
  // `getWorldEntry`. Listeners on one element fire in registration order, and
  // the host flips the classes synchronously before its first `await`, so this
  // reads the state the click just produced rather than the one before it.
  element.addEventListener('click', () => {
    syncEntryToggleChecked(element);
  });

  return true;
};
