// The emoji picker of the Manage entry tags popup — WorldInfoEngine's emoji
// grid (`storyEmojiPopup.js` in that repo, its `stwie--emoji-grid*` classes
// renamed `stwid--emoji-grid*`) in a panel floating just under the clicked
// emoji button, over the rows below, so nothing in the list moves. Look: the
// entry tags spec, Visual decision 8 (8A).
//
// The host popup clips its content (`.popup .popup-content { overflow: hidden }`),
// so the panel is `position: fixed` and placed from the button's rect, the way
// the shared multiselect dropdown's in-cell menu is (`placeFixedMenu`).
// It still lives inside the popup's own DOM: the popup is a modal `<dialog>` in
// the top layer, and anything outside it would be drawn underneath.
//
// A `No emoji` cell comes first, then a heading per library group. Closes on a
// pick, a click outside, focus leaving it, or Escape — and Escape never reaches
// the host popup, which would close too.

import { placeFixedMenu } from '../shared/multiselect-dropdown.js';
import { EMOJI_GROUPS, isSameEmoji } from './entry-tag-manager.emoji-library.js';

const POPOVER_CLASS = 'stwid--emoji-popover';
const GRID_CLASS = 'stwid--emoji-grid';
const GROUP_LABEL_CLASS = 'stwid--emoji-grid__group-label';
const GROUP_CLASS = 'stwid--emoji-grid__group';
const GROUP_NONE_CLASS = 'stwid--emoji-grid__group--none';
const CELL_CLASS = 'stwid--emoji-grid__cell';
const CELL_NONE_CLASS = 'stwid--emoji-grid__cell--none';
const CELL_SELECTED_CLASS = 'stwid--emoji-grid__cell--selected';
const ACTIVE_STATE_CLASS = 'stwid--state-active';

const NO_EMOJI_LABEL = 'No emoji';

// The cell's emoji, or an empty string for `No emoji`; one grid listener reads it.
const buildCell = (value) => {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.classList.add(CELL_CLASS);
  cell.dataset.emoji = value ?? '';
  return cell;
};

const markSelected = (cell) => {
  cell.classList.add(CELL_SELECTED_CLASS);
  cell.setAttribute('aria-current', 'true');
};

/**
 * Builds the grid: the `No emoji` cell on its own line, then a heading and the
 * cells of each library group. The cell matching `current` is marked selected
 * — the `No emoji` one when the tag has none.
 * @param {{ current: string|null, onPick: (emoji: string|null) => void }} args
 * @returns {{ grid: HTMLElement, selected: HTMLElement|null }}
 */
function buildEmojiGrid({ current, onPick }) {
  const grid = document.createElement('div');
  grid.classList.add(GRID_CLASS);
  grid.addEventListener('click', (evt) => {
    const cell = evt.target instanceof Element ? evt.target.closest(`.${CELL_CLASS}`) : null;
    if (cell) onPick(cell.dataset.emoji || null);
  });
  let selected = null;

  const noneGroup = document.createElement('div');
  noneGroup.classList.add(GROUP_CLASS, GROUP_NONE_CLASS);
  const noneCell = buildCell(null);
  noneCell.classList.add(CELL_NONE_CLASS);
  const noneIcon = document.createElement('i');
  noneIcon.classList.add('fa-solid', 'fa-ban');
  noneIcon.setAttribute('aria-hidden', 'true');
  const noneText = document.createElement('span');
  noneText.textContent = NO_EMOJI_LABEL;
  noneCell.append(noneIcon, noneText);
  noneGroup.append(noneCell);
  grid.append(noneGroup);
  if (!current) {
    markSelected(noneCell);
    selected = noneCell;
  }

  for (const group of EMOJI_GROUPS) {
    const label = document.createElement('p');
    label.classList.add(GROUP_LABEL_CLASS);
    label.textContent = group.label;
    const row = document.createElement('div');
    row.classList.add(GROUP_CLASS);
    for (const emoji of group.emoji) {
      const cell = buildCell(emoji);
      cell.textContent = emoji;
      // The glyph is the whole label, so it is also the accessible name.
      cell.title = `Use ${emoji}`;
      cell.setAttribute('aria-label', `Use ${emoji}`);
      if (!selected && isSameEmoji(current, emoji)) {
        markSelected(cell);
        selected = cell;
      }
      row.append(cell);
    }
    grid.append(label, row);
  }
  return { grid, selected };
}

/** Scrolls the grid so a cell sits in its middle, without scrolling anything else. */
const scrollCellIntoGrid = (grid, cell) => {
  const cellTop = cell.getBoundingClientRect().top - grid.getBoundingClientRect().top;
  grid.scrollTop += cellTop - (grid.clientHeight - cell.offsetHeight) / 2;
};

/**
 * Opens the emoji panel for one tag's emoji button.
 * @param {object} args
 * @param {HTMLElement} args.button - The emoji button the panel hangs from.
 * @param {HTMLElement} args.mount - Where the panel is appended; must be inside the host popup.
 * @param {string} args.label - The panel's accessible name.
 * @param {string|null} args.current - The tag's emoji now, or null for none.
 * @param {(emoji: string|null) => void} args.onPick - A cell was picked; the panel is already closed.
 * @param {() => void} [args.onClose] - The panel closed, for whatever reason.
 * @returns {{ close: (options?: { restoreFocus?: boolean }) => void }}
 */
export function openEmojiPopover({ button, mount, label, current, onPick, onClose }) {
  const panel = document.createElement('div');
  panel.classList.add(POPOVER_CLASS);
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', label);

  let isOpen = true;
  let repositionFrame = 0;

  const close = ({ restoreFocus = false } = {}) => {
    if (!isOpen) return;
    isOpen = false;
    document.removeEventListener('click', onOutsideClick, true);
    document.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('scroll', onReposition, true);
    window.removeEventListener('resize', onReposition);
    if (repositionFrame) cancelAnimationFrame(repositionFrame);
    panel.remove();
    button.classList.remove(ACTIVE_STATE_CLASS);
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus && button.isConnected) button.focus({ preventScroll: true });
    onClose?.();
  };

  const pick = (emoji) => {
    close({ restoreFocus: true });
    onPick(emoji);
  };

  // The button's own click toggles the panel, so it is not "outside".
  function onOutsideClick(evt) {
    if (panel.contains(evt.target) || button.contains(evt.target)) return;
    close();
  }

  function onKeydown(evt) {
    if (evt.key !== 'Escape') return;
    // Cancelling the keydown also stops the host dialog's own Escape close.
    evt.preventDefault();
    evt.stopPropagation();
    close({ restoreFocus: true });
  }

  function onReposition(evt) {
    // Scrolling the grid itself does not move the button.
    if (evt?.target instanceof Node && panel.contains(evt.target)) return;
    if (repositionFrame) return;
    repositionFrame = requestAnimationFrame(() => {
      repositionFrame = 0;
      if (isOpen) placeFixedMenu(panel, button);
    });
  }

  panel.addEventListener('focusout', (evt) => {
    const next = evt.relatedTarget;
    if (next instanceof Node && !panel.contains(next) && !button.contains(next)) close();
  });

  const { grid, selected } = buildEmojiGrid({ current, onPick: pick });
  panel.append(grid);
  mount.append(panel);
  placeFixedMenu(panel, button);
  button.classList.add(ACTIVE_STATE_CLASS);
  button.setAttribute('aria-expanded', 'true');

  document.addEventListener('click', onOutsideClick, true);
  document.addEventListener('keydown', onKeydown, true);
  // Capture phase: a scroll inside the popup does not bubble to window.
  document.addEventListener('scroll', onReposition, true);
  window.addEventListener('resize', onReposition);

  const focusTarget = selected ?? grid.querySelector(`.${CELL_CLASS}`);
  if (selected) scrollCellIntoGrid(grid, selected);
  focusTarget?.focus({ preventScroll: true });

  return { close };
}
