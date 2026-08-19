export const MULTISELECT_DROPDOWN_CLOSE_HANDLER = 'stwidCloseMultiselectDropdownMenu';
const CSS_STATE_ACTIVE = 'stwid--state-active';
const CSS_STATE_HIDDEN = 'stwid--state-hidden';
const ARIA_EXPANDED_ATTR = 'aria-expanded';

/** The class every caller marks an option with; also the default option selector. */
export const MULTISELECT_DROPDOWN_OPTION_SELECTOR = '.stwid--multiselect-dropdown__option';
const DEFAULT_OPTION_SELECTOR = MULTISELECT_DROPDOWN_OPTION_SELECTOR;
const CSS_MENU_IN_CELL = 'stwid--multiselect-dropdown__menu--in-cell';
const CSS_SEARCH_WRAP = 'stwid--multiselect-dropdown__search';
const CSS_SEARCH_INPUT = 'stwid--multiselect-dropdown__search-input';
const CSS_EMPTY_STATE = 'stwid--multiselect-dropdown__empty-state';
const CSS_NO_RESULTS = 'stwid--multiselect-dropdown__no-results';

/** Elements that already take focus without a `tabindex`. */
const NATIVELY_FOCUSABLE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);

/** Gap kept between an in-cell menu and the viewport edges, in CSS pixels. */
const IN_CELL_VIEWPORT_MARGIN = 8;
/** Gap kept between an in-cell menu and the cell that opened it, in CSS pixels. */
const IN_CELL_TRIGGER_GAP = 4;

/** The class the search filter and the two message elements are hidden with. */
export const MULTISELECT_DROPDOWN_HIDDEN_CLASS = CSS_STATE_HIDDEN;

export const setMultiselectDropdownOptionCheckboxState = (checkbox, isChecked) => {
  if (!checkbox) return;
  checkbox.classList.toggle('fa-square-check', Boolean(isChecked));
  checkbox.classList.toggle('fa-square', !isChecked);
};

export const createMultiselectDropdownCheckbox = (checked = false) => {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.tabIndex = -1;
  input.classList.add('stwid--multiselect-dropdown__option-input');
  const checkbox = document.createElement('i');
  checkbox.classList.add('fa-solid', 'fa-fw', 'stwid--multiselect-dropdown__option-checkbox');
  const setChecked = (isChecked) => {
    input.checked = Boolean(isChecked);
    setMultiselectDropdownOptionCheckboxState(checkbox, input.checked);
  };
  input.addEventListener('change', () => {
    setChecked(input.checked);
  });
  setChecked(checked);
  return {
    input,
    checkbox,
    setChecked,
  };
};

export const closeOpenMultiselectDropdownMenus = (excludeMenu = null) => {
  for (const menu of document.querySelectorAll(
    `.stwid--multiselect-dropdown__menu.${CSS_STATE_ACTIVE}`,
  )) {
    if (menu === excludeMenu) continue;
    const closeMenu = menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
    if (typeof closeMenu === 'function') {
      closeMenu();
      continue;
    }
    menu.classList.remove(CSS_STATE_ACTIVE);
    const trigger = menu.parentElement?.querySelector('.stwid--multiselect-dropdown__button');
    trigger?.setAttribute(ARIA_EXPANDED_ATTR, 'false');
  }

  for (const blocker of document.querySelectorAll('.stwid--blocker')) {
    const menu = blocker.querySelector('.stwid--list-dropdown__menu');
    const closeMenu = menu?.[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
    if (typeof closeMenu === 'function') {
      closeMenu();
      continue;
    }
    const trigger = document.querySelector(
      `.stwid--list-dropdown__trigger[${ARIA_EXPANDED_ATTR}="true"]`,
    );
    blocker.remove();
    trigger?.setAttribute(ARIA_EXPANDED_ATTR, 'false');
    trigger?.focus();
  }
};

/* -------------------------------------------------------------------------- */
/* Opt-in capability 1: type-to-filter search                                 */
/* -------------------------------------------------------------------------- */

/**
 * Folds searchable text down to a case- and accent-insensitive form, so a
 * pt-BR roster ("Renée", "São Paulo") is reachable from an ASCII keyboard.
 *
 * @param {unknown} value
 * @returns {string} the normalized text, or `''` for anything that is not a string
 */
export const normalizeMultiselectDropdownSearchText = (value) => {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
};

/**
 * Substring match between one option's searchable text and the typed query.
 * An empty query matches everything, which is what makes "clear the box" show
 * the whole list again.
 *
 * @param {unknown} optionText
 * @param {unknown} query
 * @returns {boolean}
 */
export const multiselectDropdownSearchMatches = (optionText, query) => {
  const normalizedQuery = normalizeMultiselectDropdownSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeMultiselectDropdownSearchText(optionText).includes(normalizedQuery);
};

/** Default searchable text for an option: whatever it shows on screen. */
const defaultOptionSearchText = (option) => option.textContent;

/**
 * Hides every option whose searchable text does not match `query`.
 *
 * @param {Iterable<Element>} optionElements the options to filter, in DOM order
 * @param {string} query the raw text typed into the search box
 * @param {(option: Element) => unknown} [getOptionSearchText] caller-supplied
 *   text derivation, so an option can match on more than its visible label
 * @returns {{ visibleCount: number, totalCount: number }}
 */
export const applyMultiselectDropdownSearchFilter = (
  optionElements,
  query,
  getOptionSearchText = defaultOptionSearchText,
) => {
  let visibleCount = 0;
  let totalCount = 0;
  for (const option of optionElements) {
    totalCount += 1;
    const matches = multiselectDropdownSearchMatches(getOptionSearchText(option), query);
    option.classList.toggle(CSS_STATE_HIDDEN, !matches);
    if (matches) visibleCount += 1;
  }
  return { visibleCount, totalCount };
};

/* -------------------------------------------------------------------------- */
/* Keyboard navigation of the option list (roving tabindex)                   */
/* -------------------------------------------------------------------------- */

/** The four keys that move the focused option. */
const OPTION_NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

/**
 * Whether arrow-key navigation is allowed to land on this option.
 *
 * The search filter hides options with a class rather than removing them, so
 * "is it in the DOM" is not the same question as "can the user reach it".
 *
 * @param {Element|null|undefined} option
 * @returns {boolean}
 */
export const isMultiselectDropdownOptionNavigable = (option) => {
  if (!option) return false;
  if (option.classList?.contains(CSS_STATE_HIDDEN)) return false;
  if (option.hidden) return false;
  if (option.disabled) return false;
  if (option.getAttribute?.('aria-disabled') === 'true') return false;
  if (option.getAttribute?.('aria-hidden') === 'true') return false;
  return true;
};

/**
 * The options a keyboard user can actually land on, in DOM order.
 *
 * @param {Iterable<Element>|null|undefined} options
 * @returns {Element[]}
 */
export const getNavigableMultiselectDropdownOptions = (options) =>
  Array.from(options ?? []).filter(isMultiselectDropdownOptionNavigable);

/**
 * Where ↑ / ↓ / Home / End move the focus, within a list of `count` options.
 *
 * `currentIndex` is `-1` when focus is inside the menu but not on an option —
 * which is what the search box reports — so ↓ enters the list at the top and ↑
 * enters it at the bottom.
 *
 * @param {object} args
 * @param {string} args.key the `KeyboardEvent.key`
 * @param {number} args.currentIndex index of the focused option, or `-1`
 * @param {number} args.count how many options can be landed on
 * @returns {number|null} the index to move to, or `null` when the key is not a
 *   navigation key or there is nothing to move to
 */
export const nextMultiselectDropdownIndex = ({ key, currentIndex, count }) => {
  if (!OPTION_NAVIGATION_KEYS.has(key)) return null;
  if (!Number.isInteger(count) || count <= 0) return null;
  const from = Number.isInteger(currentIndex) ? currentIndex : -1;
  switch (key) {
    case 'ArrowDown':
      return from < 0 ? 0 : (from + 1) % count;
    case 'ArrowUp':
      return from < 0 ? count - 1 : (from - 1 + count) % count;
    case 'Home':
      return 0;
    default:
      return count - 1;
  }
};

/**
 * Roving `tabindex`: exactly one option is in the page tab order at a time, so
 * a menu holding 300 characters adds one stop rather than 300.
 *
 * @param {Iterable<Element>|null|undefined} options
 * @param {number} activeIndex the option that should hold the stop; anything
 *   out of range parks it on the first option, so the menu always has an entry
 *   point
 * @returns {number} the index the stop actually landed on, or `-1` when there
 *   were no options
 */
export const applyMultiselectDropdownRovingTabIndex = (options, activeIndex) => {
  const list = Array.from(options ?? []);
  if (!list.length) return -1;
  const stop =
    Number.isInteger(activeIndex) && activeIndex >= 0 && activeIndex < list.length
      ? activeIndex
      : 0;
  for (const [index, option] of list.entries()) {
    option.tabIndex = index === stop ? 0 : -1;
  }
  return stop;
};

/* -------------------------------------------------------------------------- */
/* Opt-in capability 2: in-cell presentation                                  */
/* -------------------------------------------------------------------------- */

/**
 * Where an in-cell menu should sit, in viewport coordinates.
 *
 * In-cell menus are `position: fixed` so the Entry Manager's scroll containers
 * cannot clip them, which means this has to do the placement the browser would
 * otherwise have done: below the cell when it fits, flipped above when it does
 * not, and clamped inside the viewport either way. When the menu fits on
 * neither side it stays below and scrolls internally — flipping above would
 * only trade one cut-off edge for another.
 *
 * @param {object} args
 * @param {{ left: number, top: number, bottom: number }} args.triggerRect the cell's viewport rect
 * @param {{ width: number, height: number }} args.menuSize the menu's measured size
 * @param {{ width: number, height: number }} args.viewport
 * @param {number} [args.margin]
 * @param {number} [args.gap]
 * @returns {{ left: number, top: number, maxHeight: number }} `maxHeight` is the
 *   room actually left below `top`; without clamping to it, a menu that fits on
 *   neither side would keep its last options permanently below the fold, where
 *   internal scrolling cannot reach them.
 */
export const computeInCellDropdownPosition = ({
  triggerRect,
  menuSize,
  viewport,
  margin = IN_CELL_VIEWPORT_MARGIN,
  gap = IN_CELL_TRIGGER_GAP,
}) => {
  const rightmostLeft = Math.max(margin, viewport.width - menuSize.width - margin);
  const left = Math.min(Math.max(triggerRect.left, margin), rightmostLeft);

  const below = triggerRect.bottom + gap;
  const above = triggerRect.top - gap - menuSize.height;
  const fitsBelow = below + menuSize.height <= viewport.height - margin;
  const top = Math.max(margin, fitsBelow || above < margin ? below : above);

  return { left, top, maxHeight: Math.max(0, viewport.height - top - margin) };
};

/** Builds the search box; the caller decides where it is mounted. */
const createSearchBox = ({ placeholder, ariaLabel }) => {
  const wrap = document.createElement('div');
  wrap.classList.add(CSS_SEARCH_WRAP);
  const input = document.createElement('input');
  input.type = 'search';
  // .text_pole is the host's single input class - see the sillytavern:st-css skill.
  input.classList.add('text_pole', CSS_SEARCH_INPUT);
  input.setAttribute('placeholder', placeholder);
  input.setAttribute('aria-label', ariaLabel);
  wrap.append(input);
  return { wrap, input };
};

/** Builds one of the two hidden-by-default message rows. */
const createMessageRow = (className, text, isLive) => {
  const element = document.createElement('div');
  element.classList.add(className, CSS_STATE_HIDDEN);
  if (isLive) element.setAttribute('aria-live', 'polite');
  element.textContent = text;
  return element;
};

/**
 * Gives the menu and its options the ARIA roles that match the keyboard
 * behaviour wired below.
 *
 * **Pattern: `menu` / `menuitemcheckbox`**, not `listbox`. Three reasons, all
 * local to this repo: the extension's other menu system already standardized on
 * `role="menu"` + `role="menuitem"` (`Rework_MenuBehaviorUnification`); these
 * menus mix checkable options with plain commands ("SELECT ALL", "Show all
 * (N more)"), which `menu` allows and `listbox` does not; and a `listbox` may
 * not contain the search `<input>` that ticket 03 puts inside the panel — that
 * would have to become a `combobox`, a different widget from what this is.
 */
const applyMultiselectDropdownRoles = (menu, options) => {
  if (menu.getAttribute('role') !== 'menu') menu.setAttribute('role', 'menu');
  for (const option of options) {
    const checkboxInput = option.querySelector?.('input[type="checkbox"]');
    const pressed = option.getAttribute?.('aria-pressed');
    if (checkboxInput) {
      option.setAttribute('role', 'menuitemcheckbox');
      option.setAttribute('aria-checked', String(Boolean(checkboxInput.checked)));
    } else if (pressed === 'true' || pressed === 'false') {
      option.setAttribute('role', 'menuitemcheckbox');
      option.setAttribute('aria-checked', pressed);
    } else {
      option.setAttribute('role', 'menuitem');
    }
  }
};

/**
 * Activates one option from the keyboard.
 *
 * A checkbox option is toggled through its own `<input>` rather than through
 * the `<label>` wrapping it, so the caller's `change` listener fires exactly
 * once no matter how the browser resolves implicit label activation.
 */
const activateMultiselectDropdownOption = (option) => {
  const checkboxInput = option.querySelector?.('input[type="checkbox"]');
  if (checkboxInput) checkboxInput.click();
  else option.click();
};

/**
 * Makes one dropdown menu's options reachable and operable from the keyboard.
 *
 * Wired for every caller of `wireMultiselectDropdown`, and callable directly by
 * the two menus in this extension that hand-roll their own open/close.
 *
 * Keyboard contract:
 * - ↑ / ↓ move through the options and wrap at both ends; Home / End jump to
 *   the first / last. Options hidden by the search filter are skipped.
 * - **Both** Space and Enter toggle the focused option. Nothing competes for
 *   either: the host's global Enter-to-click handler only fires on elements
 *   matching its own interactable selectors (`.menu_button` and friends), and
 *   an option is never one of those. A native `<button>` option is left to the
 *   browser, which already clicks it on both keys — handling it here too would
 *   toggle it twice.
 * - Tab and Shift+Tab stay inside the menu while it is open (`trapTab`).
 * - Escape is handled by the menu's own close path, not here.
 *
 * @param {HTMLElement} menu
 * @param {object} [args]
 * @param {() => Iterable<Element>} [args.getOptions] all options, in DOM order;
 *   defaults to every `MULTISELECT_DROPDOWN_OPTION_SELECTOR` inside `menu`
 * @param {() => HTMLElement|null} [args.getSearchInput]
 * @param {() => Iterable<Element>} [args.getExtraTabStops] controls inside the
 *   menu that are not options and not the search box — a mode toggle in the
 *   panel header, say. Without this they are unreachable: `trapTab` keeps Tab
 *   inside the menu, and the ring is otherwise just the search box and the
 *   roving option. They are placed at the front of the ring, matching the DOM
 *   order of a header that sits above the search box.
 * @param {() => boolean} [args.isOpen]
 * @param {boolean} [args.trapTab] keep Tab inside the menu. Off for a popup
 *   that opens on focus of its own input — trapping there would make the input
 *   impossible to Tab out of.
 * @param {boolean} [args.applyRoles] apply the `menu` / `menuitemcheckbox`
 *   roles. Off for a popup that is not a menu.
 * @returns {{
 *   sync: () => Element[],
 *   focusFirst: () => boolean,
 *   reset: () => void,
 *   handleKeydown: (event: KeyboardEvent) => void,
 * }} `handleKeydown` is returned so a caller whose input lives *outside* `menu`
 *   — the outlet combobox's text field does — can attach it there as well.
 *   Handled events carry a flag, so a path that reaches both attachments only
 *   acts once.
 */
export const wireMultiselectDropdownKeyboardNavigation = (
  menu,
  {
    getOptions = () => menu.querySelectorAll(MULTISELECT_DROPDOWN_OPTION_SELECTOR),
    getSearchInput = () => null,
    getExtraTabStops = () => [],
    isOpen = () => true,
    trapTab = true,
    applyRoles = true,
  } = {},
) => {
  let activeIndex = -1;

  /** Re-reads the option list, then re-applies roles and the roving stop. */
  const sync = () => {
    const allOptions = Array.from(getOptions());
    if (applyRoles) applyMultiselectDropdownRoles(menu, allOptions);
    // Options filtered out of view must leave the tab order too, or Tab could
    // still land on something the user cannot see.
    for (const option of allOptions) option.tabIndex = -1;
    const navigable = getNavigableMultiselectDropdownOptions(allOptions);
    activeIndex = applyMultiselectDropdownRovingTabIndex(navigable, activeIndex);
    return navigable;
  };

  const focusOptionAt = (index) => {
    const navigable = getNavigableMultiselectDropdownOptions(getOptions());
    if (!navigable.length) return false;
    activeIndex = Math.min(Math.max(index, 0), navigable.length - 1);
    sync();
    navigable[activeIndex].focus?.({ preventScroll: true });
    return true;
  };

  const focusFirst = () => focusOptionAt(0);
  const reset = () => {
    activeIndex = -1;
  };

  /** The elements Tab cycles between while the menu is open. */
  const tabRing = () => {
    const ring = [];
    for (const stop of getExtraTabStops()) {
      if (isMultiselectDropdownOptionNavigable(stop)) ring.push(stop);
    }
    const searchInput = getSearchInput();
    if (searchInput && isMultiselectDropdownOptionNavigable(searchInput)) ring.push(searchInput);
    const navigable = getNavigableMultiselectDropdownOptions(getOptions());
    const roving = navigable[activeIndex >= 0 ? activeIndex : 0];
    if (roving) ring.push(roving);
    return ring;
  };

  const handleKeydown = (event) => {
    if (event.stwidMultiselectNavHandled) return;
    if (!isOpen()) return;

    const searchInput = getSearchInput();
    const isFromSearch = Boolean(searchInput) && event.target === searchInput;
    const navigable = getNavigableMultiselectDropdownOptions(getOptions());
    const currentIndex = isFromSearch ? -1 : navigable.indexOf(event.target);
    // Anything focused inside an open menu still must not Tab out of it, even
    // when it is neither the search box nor a navigable option — an option the
    // filter hid while it held focus, say, or a control a future caller adds.
    // Arrow keys and activation stay off-limits for such a target; only the
    // trap applies, and it puts focus back on a known element.
    const isStrayInsideMenu = !isFromSearch && currentIndex === -1;
    if (isStrayInsideMenu && !(trapTab && event.key === 'Tab' && menu.contains(event.target))) {
      return;
    }
    event.stwidMultiselectNavHandled = true;

    const moveTo = isStrayInsideMenu
      ? null
      : nextMultiselectDropdownIndex({
          key: event.key,
          currentIndex,
          count: navigable.length,
        });
    if (moveTo !== null) {
      event.preventDefault();
      event.stopPropagation();
      focusOptionAt(moveTo);
      return;
    }

    if (event.key === 'Tab') {
      if (!trapTab) return;
      const ring = tabRing();
      event.preventDefault();
      event.stopPropagation();
      if (!ring.length) return; // Nothing to hold focus — but not out, either.
      // A stray target is not in the ring, so `at < 0` lands it on the ring's
      // first element, which is the recovery this branch exists for.
      const at = ring.indexOf(event.target);
      const step = event.shiftKey ? -1 : 1;
      const next = at < 0 ? 0 : (at + step + ring.length) % ring.length;
      ring[next].focus?.({ preventScroll: true });
      return;
    }

    if (isFromSearch || isStrayInsideMenu) return;
    if (event.key !== ' ' && event.key !== 'Enter') return;
    const option = navigable[currentIndex];
    // A real <button> already clicks itself on both keys.
    if (option.tagName === 'BUTTON' && !option.querySelector?.('input[type="checkbox"]')) return;
    event.preventDefault();
    // Keeps this Enter away from the host's global Enter-to-click handler,
    // which walks up from the event target looking for an interactable.
    event.stopPropagation();
    activateMultiselectDropdownOption(option);
    sync();
  };

  menu.addEventListener('keydown', handleKeydown);
  // Keeps the `aria-checked` mirror honest after a toggle this helper did not
  // perform. Both events are needed and neither is redundant: checkbox options
  // report through `change`, while the Book Browser's visibility options are
  // <button>s that only ever fire `click`. Verified in the browser 17-08-2026 —
  // without the `click` listener, `aria-checked` on that menu kept reporting
  // the state the options had when the menu was opened.
  const resyncRoles = () => {
    if (applyRoles) applyMultiselectDropdownRoles(menu, Array.from(getOptions()));
  };
  menu.addEventListener('change', resyncRoles);
  menu.addEventListener('click', resyncRoles);

  return { sync, focusFirst, reset, handleKeydown };
};

/* -------------------------------------------------------------------------- */
/* Wiring                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Wires a dropdown's open/close behaviour, and optionally its two opt-in
 * capabilities. Every option defaults to off, so a caller that passes nothing
 * gets exactly the behaviour this module had before those capabilities existed.
 *
 * @param {HTMLElement} menu the menu panel
 * @param {HTMLElement} menuButton the trigger
 * @param {HTMLElement} menuWrap the element the outside-click test is scoped to
 * @param {object} [options]
 * @param {HTMLElement} [options.listContainer] where the options live and where
 *   the empty-state / no-results rows are appended; defaults to `menu`
 * @param {string} [options.optionSelector] selector identifying a filterable
 *   option inside `listContainer`
 * @param {object|null} [options.search] opt-in search box:
 *   `{ placeholder, ariaLabel, noResultsText, container, getOptionSearchText }`.
 *   Without `container` the box is prepended to `menu`. An in-cell menu scrolls
 *   its own content, so a caller with a long list should pass a `container`
 *   outside the scrolled area (and a `listContainer` for the list) rather than
 *   let the box scroll away with the options.
 * @param {boolean} [options.inCell] opt-in in-cell (viewport-positioned) mode
 * @param {string|null} [options.emptyStateText] message shown, in place of the
 *   list, when the caller supplied no options at all
 * @param {() => Iterable<Element>} [options.getExtraTabStops] non-option controls
 *   inside the menu that Tab must still reach while it is open
 * @param {(() => void)|null} [options.onBeforeOpen] runs at the top of every
 *   open, before the empty-state and search passes read the list. A caller whose
 *   options depend on state that changes between opens — a cell menu rebuilt
 *   from the entry it edits, say — repopulates `listContainer` here, so the two
 *   passes see the list the user is about to be shown rather than the previous
 *   one.
 * @returns {() => void} the menu's close function
 */
export const wireMultiselectDropdown = (menu, menuButton, menuWrap, options = {}) => {
  const {
    listContainer = menu,
    optionSelector = DEFAULT_OPTION_SELECTOR,
    search = null,
    inCell = false,
    emptyStateText = null,
    onBeforeOpen = null,
    getExtraTabStops = () => [],
  } = options;

  const searchConfig = search
    ? {
        placeholder: 'Search…',
        ariaLabel: 'Search options',
        noResultsText: 'No matches.',
        container: null,
        getOptionSearchText: defaultOptionSearchText,
        ...search,
      }
    : null;

  let removalObserver = null;
  let repositionFrame = 0;
  // Declared up here, not at its assignment below, so `runSearchFilter` can
  // reach it without depending on where in this function it happens to be set.
  let keyboardNav = null;
  let searchWrap = null;
  let searchInput = null;
  let noResultsRow = null;
  let emptyStateRow = null;

  const getOptionElements = () => listContainer.querySelectorAll(optionSelector);

  if (searchConfig) {
    const searchBox = createSearchBox(searchConfig);
    searchWrap = searchBox.wrap;
    searchInput = searchBox.input;
    if (searchConfig.container) searchConfig.container.append(searchWrap);
    else menu.prepend(searchWrap);

    noResultsRow = createMessageRow(CSS_NO_RESULTS, searchConfig.noResultsText, true);
    listContainer.append(noResultsRow);
    searchInput.addEventListener('input', () => runSearchFilter());
  }

  if (emptyStateText) {
    emptyStateRow = createMessageRow(CSS_EMPTY_STATE, emptyStateText, false);
    listContainer.append(emptyStateRow);
  }

  if (inCell) {
    menu.classList.add(CSS_MENU_IN_CELL);
  }

  // The focus restore below only works if the trigger can hold focus, and a
  // trigger here is typically a plain <div>. Make it Tab-reachable so a
  // keyboard user can get to the menu at all, and so closing it returns focus
  // somewhere instead of stranding it on <body>. (The host's keyboard.js
  // already does this for `.menu_button`; doing it here too is idempotent and
  // covers the triggers that are not menu_buttons.)
  if (menuButton && !menuButton.hasAttribute('tabindex')) {
    if (!NATIVELY_FOCUSABLE_TAGS.has(menuButton.tagName)) menuButton.tabIndex = 0;
  }
  if (menuButton && !NATIVELY_FOCUSABLE_TAGS.has(menuButton.tagName)) {
    if (!menuButton.hasAttribute('role')) menuButton.setAttribute('role', 'button');
  }
  menuButton?.setAttribute('aria-haspopup', 'true');
  if (!menuButton?.hasAttribute(ARIA_EXPANDED_ATTR)) {
    menuButton?.setAttribute(ARIA_EXPANDED_ATTR, 'false');
  }

  const runSearchFilter = () => {
    if (!searchConfig) return;
    const { visibleCount, totalCount } = applyMultiselectDropdownSearchFilter(
      getOptionElements(),
      searchInput.value,
      searchConfig.getOptionSearchText,
    );
    // With no options at all the empty state speaks for the menu; don't stack
    // a second message on top of it.
    noResultsRow.classList.toggle(CSS_STATE_HIDDEN, visibleCount > 0 || totalCount === 0);
    // Filtering changes the menu's height; an in-cell menu flipped above its
    // cell would otherwise stay pinned at its old top and drift away from it.
    applyInCellPosition();
    // ...and it changes which options exist to be focused, so the roving stop
    // has to move off anything the filter just hid.
    keyboardNav?.sync();
  };

  const refreshEmptyState = () => {
    // Nothing opted in - skip the query entirely so a plain caller's open path
    // stays exactly as cheap as it was.
    if (!emptyStateRow && !searchWrap) return false;
    const isEmpty = getOptionElements().length === 0;
    emptyStateRow?.classList.toggle(CSS_STATE_HIDDEN, !isEmpty);
    // Nothing to search means nothing to type into; the caller's own controls
    // stay in place either way.
    searchWrap?.classList.toggle(CSS_STATE_HIDDEN, isEmpty);
    return isEmpty;
  };

  const applyInCellPosition = () => {
    if (!inCell || !menu.classList.contains(CSS_STATE_ACTIVE)) return;
    const trigger = menuButton ?? menuWrap;
    if (!trigger?.getBoundingClientRect) return;
    // Measure from a known origin, then correct by the delta: an ancestor with
    // a transform/filter/backdrop-filter makes a fixed element's coordinates
    // relative to that ancestor rather than the viewport, and this cancels it
    // out without having to find the ancestor.
    menu.style.left = '0px';
    menu.style.top = '0px';
    // Measure unclamped, so the stylesheet's cap - not last call's clamp - is
    // what the placement decision sees.
    menu.style.maxHeight = '';
    const menuRect = menu.getBoundingClientRect();
    const { left, top, maxHeight } = computeInCellDropdownPosition({
      triggerRect: trigger.getBoundingClientRect(),
      menuSize: { width: menuRect.width, height: menuRect.height },
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
    });
    menu.style.left = `${left - menuRect.left}px`;
    menu.style.top = `${top - menuRect.top}px`;
    if (menuRect.height > maxHeight) menu.style.maxHeight = `${maxHeight}px`;
  };

  const handleReposition = () => {
    if (repositionFrame) return;
    repositionFrame = requestAnimationFrame(() => {
      repositionFrame = 0;
      applyInCellPosition();
    });
  };

  const addRepositionListeners = () => {
    if (!inCell) return;
    // Capture phase so a scroll inside the entry table - which does not bubble
    // to window - still moves the menu with its cell.
    document.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
  };

  const removeRepositionListeners = () => {
    if (!inCell) return;
    document.removeEventListener('scroll', handleReposition, true);
    window.removeEventListener('resize', handleReposition);
    if (repositionFrame) {
      cancelAnimationFrame(repositionFrame);
      repositionFrame = 0;
    }
  };

  const removeDocumentListeners = () => {
    document.removeEventListener('click', handleOutsideClick, true);
    document.removeEventListener('keydown', handleEscapeKey);
  };

  const disconnectRemovalObserver = () => {
    if (!removalObserver) return;
    removalObserver.disconnect();
    removalObserver = null;
  };

  const teardown = () => {
    removeDocumentListeners();
    removeRepositionListeners();
    disconnectRemovalObserver();
  };

  const observeMenuWrapRemoval = () => {
    if (removalObserver) return;
    const parentNode = menuWrap.parentNode;
    if (!parentNode) return;

    removalObserver = new MutationObserver(() => {
      if (!menuWrap.isConnected) {
        teardown();
      }
    });
    removalObserver.observe(parentNode, { childList: true });
  };

  const handleOutsideClick = (event) => {
    if (menuWrap.contains(event.target)) return;
    closeMenu();
  };
  const handleEscapeKey = (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  };
  const closeMenu = () => {
    if (!menu.classList.contains(CSS_STATE_ACTIVE)) return;
    // Read before hiding: hiding the menu blurs whatever it holds, which would
    // strand a keyboard user on <body>.
    const hadFocusInside = menu.contains(document.activeElement);
    teardown();
    menu.classList.remove(CSS_STATE_ACTIVE);
    menuButton?.setAttribute(ARIA_EXPANDED_ATTR, 'false');
    keyboardNav.reset();
    if (hadFocusInside) menuButton?.focus?.({ preventScroll: true });
  };
  /**
   * @param {boolean} [moveFocusInside] true when the open came from the
   *   keyboard. A mouse open deliberately leaves focus where it was, so an
   *   existing caller's pointer behaviour is bit-for-bit what it was before.
   */
  const openMenu = (moveFocusInside = false) => {
    if (menu.classList.contains(CSS_STATE_ACTIVE)) return;
    closeOpenMultiselectDropdownMenus(menu);
    onBeforeOpen?.();
    if (searchInput) searchInput.value = '';
    const isEmpty = refreshEmptyState();
    runSearchFilter();
    menu.classList.add(CSS_STATE_ACTIVE);
    menuButton?.setAttribute(ARIA_EXPANDED_ATTR, 'true');
    applyInCellPosition();
    addRepositionListeners();
    observeMenuWrapRemoval();
    document.addEventListener('click', handleOutsideClick, true);
    document.addEventListener('keydown', handleEscapeKey);
    keyboardNav.reset();
    keyboardNav.sync();
    if (searchInput && !isEmpty) searchInput.focus({ preventScroll: true });
    else if (moveFocusInside) keyboardNav.focusFirst();
  };

  keyboardNav = wireMultiselectDropdownKeyboardNavigation(menu, {
    getOptions: getOptionElements,
    // A hidden search wrap means an empty menu; Tab must not park on a box the
    // user cannot see.
    getSearchInput: () =>
      searchWrap && !searchWrap.classList.contains(CSS_STATE_HIDDEN) ? searchInput : null,
    getExtraTabStops,
    isOpen: () => menu.classList.contains(CSS_STATE_ACTIVE),
  });

  menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER] = closeMenu;
  menu.addEventListener('click', (event) => event.stopPropagation());
  menuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (menu.classList.contains(CSS_STATE_ACTIVE)) {
      closeMenu();
    } else {
      openMenu();
    }
  });
  menuButton.addEventListener('keydown', (event) => {
    const isOpen = menu.classList.contains(CSS_STATE_ACTIVE);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // The host's global Enter-to-click handler would open this a second time
      // for a `.menu_button` trigger; keep the two from fighting.
      event.stopPropagation();
      if (isOpen) closeMenu();
      else openMenu(true);
      return;
    }
    // Tabbing off a trigger whose menu is open would leave the menu behind and
    // skip everything in it — step into it instead.
    if (event.key === 'Tab' && !event.shiftKey && isOpen) {
      if (searchInput && !searchWrap?.classList.contains(CSS_STATE_HIDDEN)) {
        event.preventDefault();
        searchInput.focus({ preventScroll: true });
        return;
      }
      if (keyboardNav.focusFirst()) event.preventDefault();
    }
  });
  return closeMenu;
};
