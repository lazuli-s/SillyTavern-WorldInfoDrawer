import {
  FIELD_HELP,
  FIELD_HELP_KEYS,
  formatHelpIconName,
  getFieldHelp,
  HELP_KIND,
} from './editor-panel.help-text.js';
import {
  createEditorHeaderLabel,
  ensureHeaderActionsRow,
  stripHeaderTitleColon,
} from './editor-panel-mobile.js';

// Puts the ? help icon on every field title and checkbox of an open entry
// editor (gallery decision 7D). The host's markup stays: the icon is added next
// to it, the host's (i) icons are hidden by `style.css`, and Inclusion Group's
// own ? link is restyled instead of doubled. A mouse gets the icon's hover text;
// a finger, a pen or the keyboard gets the help bubble (gallery decision 8H),
// which `createFieldHelpBubble` owns.

const HELP_ICON_CLASS = 'stwid--field-help';
const HELP_LINK_CLASS = 'stwid--field-help-link';
const TITLE_TEXT_CLASS = 'stwid--field-help-title-text';

// A header title: the host's per-control label on desktop, the one
// `editor-panel-mobile.js` mints in its place at ≤1000px, or the Title, Strategy
// and Actions titles minted below. Every other field title in a
// `.world_entry_form_control` is the host's `small.textAlignCenter`.
const FORM_CONTROL_TITLE_SELECTOR =
  ':scope > :is(label.WIEntryHeaderTitleMobile, .stwid--editor-header-label, small.textAlignCenter)';
const HEADER_TITLE_CLASSES = ['WIEntryHeaderTitleMobile', 'stwid--editor-header-label'];

const findControl = (editDom, name) => editDom.querySelector(`[name='${name}']`);

/** Title of a control sitting directly in a `.world_entry_form_control`. */
const findFormControlTitle = (editDom, name) => {
  const formControl = findControl(editDom, name)?.parentElement;
  if (!formControl?.classList.contains('world_entry_form_control')) return null;
  return formControl.querySelector(FORM_CONTROL_TITLE_SELECTOR);
};

/** Title of a control in the host's titled columns (group, timing and filter rows). */
const findColumnTitle = (editDom, name) => {
  const range = findControl(editDom, name)?.parentElement;
  if (!range?.classList.contains('range-block-range')) return null;
  return range.parentElement?.querySelector(':scope > .flex-container > small') ?? null;
};

const findTitle = (editDom, key) => {
  switch (key) {
    case 'content':
      return editDom.querySelector("[name='contentAndCharFilterBlock'] .mdhotkey_location");
    case 'entryTags':
      // `editor-panel.entry-tags.js` builds this row and its `small` title.
      return editDom.querySelector('.stwid--entry-tags > .flex-container > small');
    case 'actions':
      // The header has no Actions title until one is minted; that title carries this attribute.
      return editDom.querySelector("[data-stwid-help-key='actions']");
    default:
      return findFormControlTitle(editDom, key) ?? findColumnTitle(editDom, key);
  }
};

const stopLabelActivation = (evt) => {
  // A ? inside a `<label>` must never tick its checkbox or focus its control.
  evt.preventDefault();
  evt.stopPropagation();
};

const createHelpIcon = (key, help) => {
  const icon = document.createElement('i');
  icon.classList.add(HELP_ICON_CLASS, 'fa-solid', 'fa-circle-question');
  icon.dataset.stwidHelpKey = key;
  icon.tabIndex = 0;
  icon.setAttribute('role', 'button');
  icon.setAttribute('aria-label', formatHelpIconName(help.label));
  icon.setAttribute('aria-expanded', 'false');
  icon.title = help.text;
  icon.addEventListener('click', stopLabelActivation);
  return icon;
};

const hasHelpIcon = (container) => Boolean(container.querySelector(`:scope > .${HELP_ICON_CLASS}`));

// A header title truncates with an ellipsis; its text moves into its own span so
// the ellipsis cuts the text and never the ? after it.
const wrapHeaderTitleText = (title) => {
  if (!HEADER_TITLE_CLASSES.some((cls) => title.classList.contains(cls))) return;
  const text = document.createElement('span');
  text.classList.add(TITLE_TEXT_CLASS);
  text.append(...title.childNodes);
  title.append(text);
};

const decorateTitle = (editDom, key, help) => {
  const title = findTitle(editDom, key);
  if (!title) return;
  if (key === 'content') {
    // Content's text is a span inside the host's flex label row, before the
    // maximize icon: the ? goes right after the text.
    const row = title.parentElement;
    if (!row || hasHelpIcon(row)) return;
    title.after(createHelpIcon(key, help));
    return;
  }
  if (hasHelpIcon(title)) return;
  wrapHeaderTitleText(title);
  title.append(createHelpIcon(key, help));
};

const decorateCheckbox = (editDom, key, help) => {
  const label = editDom.querySelector(`input[type='checkbox'][name='${key}']`)?.closest('label');
  if (!label) return;
  // Prioritize and Exclude nest their text in `span > small`; the ? joins it there.
  const container = label.querySelector(':scope > span > small') ?? label;
  if (hasHelpIcon(container)) return;
  container.append(createHelpIcon(key, help));
};

const decorateLink = (editDom, key, help) => {
  const link = findColumnTitle(editDom, key)?.querySelector(':scope > a.notes-link');
  if (!link || link.classList.contains(HELP_LINK_CLASS)) return;
  // The host's link, `href` and `target` stay; only its look and hover text change.
  link.classList.add(HELP_LINK_CLASS);
  link.title = help.text;
};

const DECORATORS = {
  [HELP_KIND.TITLE]: decorateTitle,
  [HELP_KIND.CHECKBOX]: decorateCheckbox,
  [HELP_KIND.LINK]: decorateLink,
};

const ACTIONS_FIELD_CLASS = 'stwid--editor-actions';

// Desktop only: the host gives the title box and the Strategy dot no title. At
// ≤1000px `editor-panel-mobile.js` mints both in its own title bar and removes
// `.WIEntryTitleAndStatus`, so its absence is the phone layout.
const mintDesktopTitleFields = (editDom) => {
  const titleAndStatus = editDom.querySelector('.WIEntryTitleAndStatus');
  if (!titleAndStatus) return;

  // The host's own wrapper around the title box becomes the field.
  const titleWrapper = titleAndStatus.querySelector("textarea[name='comment']")?.parentElement;
  if (
    titleWrapper &&
    titleWrapper !== titleAndStatus &&
    !titleWrapper.classList.contains('world_entry_form_control')
  ) {
    titleWrapper.classList.add('world_entry_form_control', 'stwid--editor-header-title-field');
    titleWrapper.prepend(createEditorHeaderLabel('Title'));
  }

  const strategySelect = titleAndStatus.querySelector(":scope > select[name='entryStateSelector']");
  if (strategySelect) {
    const strategyField = document.createElement('div');
    strategyField.classList.add('world_entry_form_control', 'stwid--editor-header-strategy');
    strategySelect.before(strategyField);
    strategyField.append(createEditorHeaderLabel('Strategy'), strategySelect);
  }
};

// Desktop only: Position, Depth, Order and Trigger % keep the host's label
// element and lose its trailing colon, the strip the phone's minted titles get.
// A label that already holds its ? was stripped on an earlier run.
const stripDesktopHeaderColons = (editDom) => {
  for (const label of editDom.querySelectorAll(
    '.WIEnteryHeaderControls label.WIEntryHeaderTitleMobile',
  )) {
    if (label.childElementCount) continue;
    label.textContent = stripHeaderTitleColon(label.textContent ?? '');
  }
};

// Every width: the move / duplicate / delete buttons get an Actions title over
// them. The field wraps the row the phone layout groups them into, so crossing
// into that layout later finds the row already made and moves nothing.
const mintActionsField = (editDom) => {
  const actionsRow = ensureHeaderActionsRow(editDom);
  if (!actionsRow || actionsRow.parentElement?.classList.contains(ACTIONS_FIELD_CLASS)) return;
  const title = createEditorHeaderLabel('Actions');
  title.dataset.stwidHelpKey = 'actions';
  const actionsField = document.createElement('div');
  actionsField.classList.add('world_entry_form_control', ACTIONS_FIELD_CLASS);
  actionsRow.before(actionsField);
  actionsField.append(title, actionsRow);
};

/**
 * Adds the ? help icon to every field title and checkbox in an entry editor,
 * after minting the header's Title, Strategy and Actions titles the host does
 * not have and dropping the colons from its own header titles. Safe to run
 * twice: a title that already has its ? is left alone, nothing is minted twice,
 * and a field the host does not render is skipped. Hidden fields (Recursion
 * Level, the collapsed Additional Matching Sources) are decorated too, so they
 * show their ? as soon as they appear.
 */
export const decorateFieldHelp = (editDom) => {
  if (!editDom?.querySelector) return;
  mintDesktopTitleFields(editDom);
  stripDesktopHeaderColons(editDom);
  mintActionsField(editDom);
  for (const key of FIELD_HELP_KEYS) {
    const help = FIELD_HELP[key];
    DECORATORS[help.kind](editDom, key, help);
  }
};

const BUBBLE_CLASS = 'stwid--field-help-bubble';
const BUBBLE_ABOVE_CLASS = 'stwid--field-help-bubble--above';
const BUBBLE_ID = 'stwid--field-help-bubble';
// Decided per tap from the pointer, never from the screen width: a touch-screen
// laptop gets hover with the mouse and the bubble with a finger.
const BUBBLE_POINTER_TYPES = new Set(['touch', 'pen']);

/** Which side of the bubble lines up with its ?. */
export const BUBBLE_SIDE = Object.freeze({
  /** Opens toward the right, starting just left of the ?. */
  START: 'start',
  /** Near the right edge: its right side lines up just past the ?. */
  END: 'end',
});

/**
 * Where the help bubble opens, in viewport pixels (gallery decision 8H). It
 * opens under the ?, `gap` below it and toward the right; when that would pass
 * the editor's right edge it flips to align its right side `gap` past the ?. It
 * goes above the ? only when it does not fit below but does above, and it is
 * pinned inside the editor's left and right edges either way.
 *
 * @param {{ anchor: DOMRect, bounds: {left: number, top: number, right: number, bottom: number},
 *   size: {width: number, height: number}, gap: number }} boxes the ?'s box, the
 *   editor's visible box, the bubble's size and its gap
 * @returns {{ left: number, top: number, side: string, above: boolean, arrowX: number }}
 *   the bubble's top-left corner, and the arrow's x from the bubble's left side
 */
export const placeHelpBubble = ({ anchor, bounds, size, gap }) => {
  const startLeft = anchor.left - gap * 2;
  const side = startLeft + size.width <= bounds.right ? BUBBLE_SIDE.START : BUBBLE_SIDE.END;
  const preferredLeft = side === BUBBLE_SIDE.START ? startLeft : anchor.right + gap - size.width;
  const left = Math.max(bounds.left, Math.min(preferredLeft, bounds.right - size.width));

  const belowTop = anchor.bottom + gap;
  const aboveTop = anchor.top - gap - size.height;
  const above = belowTop + size.height > bounds.bottom && aboveTop >= bounds.top;
  const top = above ? aboveTop : belowTop;

  const anchorMiddle = (anchor.left + anchor.right) / 2;
  const arrowX = Math.max(gap, Math.min(anchorMiddle - left, size.width - gap));
  return { left, top, side, above, arrowX };
};

/** The editor's visible box: its padding box, without a scrollbar. */
const readVisibleBounds = (container) => {
  const box = container.getBoundingClientRect();
  const left = box.left + container.clientLeft;
  const top = box.top + container.clientTop;
  return { left, top, right: left + container.clientWidth, bottom: top + container.clientHeight };
};

/**
 * The help bubble of one entry editor (gallery decision 8H): one element inside
 * the editor's scroll container, opened by a finger or pen tap on a ?, or by
 * Enter or Space on a focused ?. At most one is open. It closes on a press
 * anywhere but its own ?, a second tap on that ?, the start of a scroll, a
 * resize, Escape, or `close()` — which `editor-panel.js` calls whenever it
 * clears or rebuilds the editor. Inclusion Group's host link is not one of our
 * icons, so a tap on it opens the docs and nothing here.
 *
 * @param {HTMLElement} container the editor column (`.stwid--editor`)
 * @returns {{ close: () => void, cleanup: () => void }}
 */
export const createFieldHelpBubble = (container) => {
  if (!container?.addEventListener) return { close: () => {}, cleanup: () => {} };

  const bubble = document.createElement('div');
  bubble.classList.add(BUBBLE_CLASS);
  bubble.id = BUBBLE_ID;
  bubble.setAttribute('role', 'tooltip');
  let openIcon = null;
  let lastPointerType = '';

  const position = (icon) => {
    // Measured at 0,0 first, so the offset holds whatever box the bubble is
    // positioned against: the host's markup decides which ancestor that is.
    const bounds = readVisibleBounds(container);
    bubble.style.setProperty('--stwid-field-help-bubble-room', `${bounds.right - bounds.left}px`);
    bubble.style.left = '0px';
    bubble.style.top = '0px';
    const origin = bubble.getBoundingClientRect();
    // The bubble's vertical padding is its gap, `--stwid-gap-m` at its own font size.
    const gap = parseFloat(getComputedStyle(bubble).paddingTop) || 0;
    const anchor = icon.getBoundingClientRect();
    const placed = placeHelpBubble({ anchor, bounds, size: origin, gap });
    bubble.style.left = `${placed.left - origin.left}px`;
    bubble.style.top = `${placed.top - origin.top}px`;
    bubble.style.setProperty('--stwid-field-help-bubble-arrow-x', `${placed.arrowX}px`);
    bubble.classList.toggle(BUBBLE_ABOVE_CLASS, placed.above);
  };

  const close = () => {
    document.removeEventListener('pointerdown', onOutsidePointerDown, true);
    document.removeEventListener('keydown', onEscape, true);
    document.removeEventListener('scroll', close, true);
    window.removeEventListener('resize', close);
    bubble.remove();
    if (!openIcon) return;
    openIcon.setAttribute('aria-expanded', 'false');
    openIcon.removeAttribute('aria-describedby');
    openIcon = null;
  };

  const open = (icon) => {
    close();
    const help = getFieldHelp(icon.dataset.stwidHelpKey);
    if (!help) return;
    const name = document.createElement('strong');
    name.textContent = help.label;
    bubble.replaceChildren(name, help.text);
    container.append(bubble);
    position(icon);
    openIcon = icon;
    icon.setAttribute('aria-expanded', 'true');
    icon.setAttribute('aria-describedby', BUBBLE_ID);
    document.addEventListener('pointerdown', onOutsidePointerDown, true);
    document.addEventListener('keydown', onEscape, true);
    // Scroll events do not bubble; a capturing listener hears every scroller.
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
  };

  // The open ? is left to its own click, which toggles the bubble shut; a press
  // anywhere else — another ?, the bubble itself, an empty spot — closes it.
  function onOutsidePointerDown(evt) {
    if (evt.target instanceof Node && openIcon?.contains(evt.target)) return;
    close();
  }

  function onEscape(evt) {
    if (evt.key !== 'Escape') return;
    // One Escape closes one layer: the drawer's own Escape handling never sees it.
    evt.preventDefault();
    evt.stopPropagation();
    close();
  }

  const findIcon = (target) => {
    const icon = target instanceof Element ? target.closest(`.${HELP_ICON_CLASS}`) : null;
    return icon && container.contains(icon) ? icon : null;
  };

  const onPointerDown = (evt) => {
    lastPointerType = evt.pointerType ?? '';
  };

  // Capturing, because the icon's own click listener stops the event so that a
  // ? inside a `<label>` never ticks its checkbox.
  const onClick = (evt) => {
    const icon = findIcon(evt.target);
    if (!icon) return;
    if (icon === openIcon) {
      close();
      return;
    }
    // `click` carries its pointer type in current browsers; the last
    // `pointerdown` covers the ones that do not. A mouse click opens nothing.
    const pointerType = evt.pointerType || lastPointerType;
    if (BUBBLE_POINTER_TYPES.has(pointerType)) open(icon);
  };

  const onKeydown = (evt) => {
    if (evt.key !== 'Enter' && evt.key !== ' ') return;
    const icon = findIcon(evt.target);
    if (!icon || icon !== evt.target) return;
    // Space would scroll the editor, and a scroll closes the bubble.
    evt.preventDefault();
    if (evt.repeat) return;
    if (icon === openIcon) close();
    else open(icon);
  };

  container.addEventListener('pointerdown', onPointerDown, true);
  container.addEventListener('click', onClick, true);
  container.addEventListener('keydown', onKeydown);

  const cleanup = () => {
    close();
    container.removeEventListener('pointerdown', onPointerDown, true);
    container.removeEventListener('click', onClick, true);
    container.removeEventListener('keydown', onKeydown);
  };

  return { close, cleanup };
};
