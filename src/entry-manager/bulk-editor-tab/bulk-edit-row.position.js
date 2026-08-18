import { setTooltip } from '../entry-manager.utils.js';
import {
  MULTISELECT_DROPDOWN_CLOSE_HANDLER,
  closeOpenMultiselectDropdownMenus,
  wireMultiselectDropdownKeyboardNavigation,
} from '../../shared/multiselect-dropdown.js';
import { maybeYieldToEventLoop } from '../../shared/utils.js';
import { mirrorEntryFieldsToOriginalData } from '../../shared/original-data.js';
import {
  BULK_APPLY_BATCH_SIZE,
  APPLY_DIRTY_CLASS,
  createLabeledBulkContainer,
  createApplyButton,
  getSafeTbodyRows,
  getBulkTargets,
  saveUpdatedBooks,
  withApplyButtonLock,
} from './bulk-edit-row.helpers.js';

const STORAGE_KEY_BULK_POSITION = 'stwid--bulk-position-value';
const STORAGE_KEY_BULK_DEPTH = 'stwid--bulk-depth-value';
const STORAGE_KEY_BULK_OUTLET = 'stwid--bulk-outlet-value';
const STATE_ACTIVE_CLASS = 'stwid--state-active';

function runBulkApplyForSelectedEntries({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyButton,
  perTargetUpdate,
  afterTargetsUpdate,
}) {
  return async function runBulkApply() {
    const rows = getSafeTbodyRows(dom);
    if (!rows) return;
    const targets = getBulkTargets(rows, cache, isEntryManagerRowSelected);
    const books = new Set();
    for (let i = 0; i < targets.length; i++) {
      books.add(targets[i].bookName);
      perTargetUpdate(targets[i]);
      await maybeYieldToEventLoop(i, BULK_APPLY_BATCH_SIZE);
    }
    afterTargetsUpdate?.(targets);
    const { failedBooks } = await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
    // Leave the row marked dirty when a book did not save, so the user can retry.
    if (failedBooks.length === 0) applyButton.classList.remove(APPLY_DIRTY_CLASS);
  };
}

function buildBulkPositionControls({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  getPositionOptions,
  applyEntryManagerPositionFilterToRow,
  applyRegistry,
}) {
  const positionContainer = createLabeledBulkContainer(
    'position',
    'Position',
    'Choose a position and apply it to all selected entries at once.',
  );

  const positionSelect = document.createElement('select');
  positionSelect.classList.add('stwid--input', 'text_pole', 'stwid--sort-select');
  setTooltip(positionSelect, 'Position to apply to selected entries');
  for (const positionOption of getPositionOptions()) {
    const option = document.createElement('option');
    option.value = positionOption.value;
    option.textContent = positionOption.label;
    positionSelect.append(option);
  }
  const storedPosition = localStorage.getItem(STORAGE_KEY_BULK_POSITION);
  if (
    storedPosition &&
    [...positionSelect.options].some((option) => option.value === storedPosition)
  ) {
    positionSelect.value = storedPosition;
  }
  positionSelect.addEventListener('change', () => {
    localStorage.setItem(STORAGE_KEY_BULK_POSITION, positionSelect.value);
  });
  positionContainer.append(positionSelect);

  let applyPosition;
  const runApplyPosition = async () => {
    await withApplyButtonLock(applyPosition, async () => {
      const value = positionSelect.value;
      if (!value) {
        toastr.warning('No position selected.');
        return;
      }
      const numericPosition = Number(value);
      const nextPosition = Number.isNaN(numericPosition) ? 0 : numericPosition;

      await runBulkApplyForSelectedEntries({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyButton: applyPosition,
        perTargetUpdate: ({ tr, bookName, uid, entryData }) => {
          entryData.position = nextPosition;
          mirrorEntryFieldsToOriginalData(cache[bookName], entryData, ['position']);
          const domPos = cache?.[bookName]?.dom?.entry?.[uid]?.position;
          if (domPos) domPos.value = value;
          applyEntryManagerPositionFilterToRow(tr, entryData);
        },
      })();
    });
  };
  applyPosition = createApplyButton(
    'Apply selected position to all selected entries',
    runApplyPosition,
    applyRegistry,
  );
  positionSelect.addEventListener('change', () => applyPosition.classList.add(APPLY_DIRTY_CLASS));
  positionContainer.append(applyPosition);

  return { positionContainer, positionSelect, applyPosition };
}

function buildBulkDepthControls({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  positionSelect,
  applyRegistry,
}) {
  const depthContainer = createLabeledBulkContainer(
    'depth',
    'Depth',
    'Apply a Depth value to all selected entries at once. Depth controls how many messages back from the latest the trigger check looks (0 = last message). Leave blank to clear depth.',
  );

  const depthInput = document.createElement('input');
  depthInput.classList.add('stwid--cell-input', 'text_pole');
  depthInput.type = 'number';
  depthInput.min = '0';
  depthInput.max = '99999';
  depthInput.placeholder = '';
  setTooltip(depthInput, 'Depth value to apply to selected entries');
  const storedDepth = localStorage.getItem(STORAGE_KEY_BULK_DEPTH);
  if (storedDepth !== null) depthInput.value = storedDepth;
  depthInput.addEventListener('change', () => {
    localStorage.setItem(STORAGE_KEY_BULK_DEPTH, depthInput.value);
  });
  depthContainer.append(depthInput);

  let applyDepth;
  const runApplyDepth = async () => {
    await withApplyButtonLock(applyDepth, async () => {
      const rawValue = depthInput.value.trim();
      const parsedDepth = rawValue === '' ? undefined : parseInt(rawValue, 10);
      if (rawValue !== '' && (!Number.isInteger(parsedDepth) || parsedDepth < 0)) {
        toastr.warning('Depth must be a non-negative whole number, or blank to clear.');
        return;
      }

      await runBulkApplyForSelectedEntries({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyButton: applyDepth,
        perTargetUpdate: ({ tr, bookName, entryData }) => {
          entryData.depth = parsedDepth;
          mirrorEntryFieldsToOriginalData(cache[bookName], entryData, ['depth']);
          const rowDepth = tr.querySelector('[name="depth"]');
          if (rowDepth) rowDepth.value = parsedDepth !== undefined ? String(parsedDepth) : '';
        },
      })();
    });
  };
  applyDepth = createApplyButton(
    'Apply depth value to all selected entries',
    runApplyDepth,
    applyRegistry,
  );
  depthInput.addEventListener('change', () => applyDepth.classList.add(APPLY_DIRTY_CLASS));
  depthContainer.append(applyDepth);

  const applyDepthContainerState = () => {
    const isDepth = positionSelect.value === '4';
    depthContainer.classList.toggle('stwid--state-disabled', !isDepth);
    depthInput.disabled = !isDepth;
  };
  positionSelect.addEventListener('change', applyDepthContainerState);
  applyDepthContainerState();

  return { depthContainer };
}

function buildBulkOutletControls({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  positionSelect,
  isOutletPosition,
  getOutletOptions,
  applyEntryManagerOutletFilterToRow,
  syncEntryManagerOutletFilters,
  filterIndicatorRefs,
  applyRegistry,
  debounce,
}) {
  const outletContainer = createLabeledBulkContainer(
    'outlet',
    'Outlet',
    'Apply an Outlet name to all selected entries at once. Only interactable when Position is set to Outlet.',
  );

  const outletDropdownWrap = document.createElement('div');
  outletDropdownWrap.classList.add('stwid--multiselect-dropdown__wrap');

  const outletInput = document.createElement('input');
  outletInput.classList.add('stwid--input', 'text_pole');
  outletInput.type = 'text';
  outletInput.placeholder = '(none)';
  setTooltip(outletInput, 'Outlet name to apply to selected entries');
  const storedOutlet = localStorage.getItem(STORAGE_KEY_BULK_OUTLET);
  if (storedOutlet !== null) outletInput.value = storedOutlet;

  const outletMenu = document.createElement('div');
  outletMenu.classList.add('stwid--multiselect-dropdown__menu', 'stwid--menu');

  // Focusing the input opens the menu. Returning focus to it after a keyboard
  // pick would therefore reopen what the pick just closed.
  let suppressNextFocusOpen = false;
  const closeOutletMenu = () => {
    if (!outletMenu.classList.contains(STATE_ACTIVE_CLASS)) return;
    const hadFocusInside = outletMenu.contains(document.activeElement);
    outletMenu.classList.remove(STATE_ACTIVE_CLASS);
    document.removeEventListener('click', handleOutletOutsideClick);
    if (hadFocusInside) {
      suppressNextFocusOpen = true;
      outletInput.focus({ preventScroll: true });
    }
  };
  const selectOutletOption = (value) => {
    outletInput.value = value;
    localStorage.setItem(STORAGE_KEY_BULK_OUTLET, outletInput.value);
    closeOutletMenu();
  };
  const handleOutletOutsideClick = (event) => {
    if (outletDropdownWrap.contains(event.target)) return;
    closeOutletMenu();
  };
  const openOutletMenu = () => {
    if (outletMenu.classList.contains(STATE_ACTIVE_CLASS)) return;
    closeOpenMultiselectDropdownMenus(outletMenu);
    outletMenu.classList.add(STATE_ACTIVE_CLASS);
    document.addEventListener('click', handleOutletOutsideClick);
    outletKeyboardNav.reset();
  };
  const buildOutletMenuOptions = () => {
    outletMenu.innerHTML = '';
    const filter = outletInput.value.toLowerCase();
    const allOptions = getOutletOptions();
    const visible = filter
      ? allOptions.filter((option) => option.value.toLowerCase().includes(filter))
      : allOptions;
    const fragment = document.createDocumentFragment();
    for (const option of visible) {
      const optEl = document.createElement('div');
      optEl.classList.add('stwid--multiselect-dropdown__option', 'stwid--menu-item');
      optEl.textContent = option.value;
      if (option.value === outletInput.value) optEl.classList.add(STATE_ACTIVE_CLASS);
      optEl.addEventListener('mousedown', (event) => {
        event.preventDefault();
        selectOutletOption(option.value);
      });
      // The keyboard path activates options with `.click()`. After a mouse
      // pick the menu is already closed, so this never double-fires.
      optEl.addEventListener('click', () => {
        if (outletMenu.classList.contains(STATE_ACTIVE_CLASS)) selectOutletOption(option.value);
      });
      fragment.append(optEl);
    }
    outletMenu.append(fragment);
  };
  let outletMenuDisposed = false;
  const refreshOutletMenu = () => {
    if (outletMenuDisposed) return;
    buildOutletMenuOptions();
    if (outletMenu.children.length === 0) closeOutletMenu();
    else openOutletMenu();
  };
  // Debounced so rapid typing rebuilds the option list once per pause, not per
  // keystroke. ST's debounce has no cancel, so refreshOutletMenu bails if the
  // row was torn down before a pending rebuild fires.
  const refreshOutletMenuDebounced = debounce(refreshOutletMenu, 150);
  const cleanup = () => {
    outletMenuDisposed = true;
    closeOutletMenu();
    document.removeEventListener('click', handleOutletOutsideClick);
  };
  outletMenu[MULTISELECT_DROPDOWN_CLOSE_HANDLER] = closeOutletMenu;
  outletMenu.addEventListener('click', (event) => event.stopPropagation());

  // This popup is a combobox, not a menu: it is anchored to a text input and
  // opens on focus. So it gets the shared arrow-key navigation but neither the
  // Tab trap (which would make the input impossible to Tab out of) nor the
  // `menu`/`menuitemcheckbox` roles (which would misdescribe it). See 03b.
  const outletKeyboardNav = wireMultiselectDropdownKeyboardNavigation(outletMenu, {
    getSearchInput: () => outletInput,
    isOpen: () => outletMenu.classList.contains(STATE_ACTIVE_CLASS),
    trapTab: false,
    applyRoles: false,
  });
  outletInput.addEventListener('keydown', outletKeyboardNav.handleKeydown);

  outletInput.addEventListener('focus', () => {
    if (suppressNextFocusOpen) {
      suppressNextFocusOpen = false;
      return;
    }
    buildOutletMenuOptions();
    if (outletMenu.children.length > 0) openOutletMenu();
  });
  outletInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEY_BULK_OUTLET, outletInput.value);
    refreshOutletMenuDebounced();
  });
  outletInput.addEventListener('change', () => {
    localStorage.setItem(STORAGE_KEY_BULK_OUTLET, outletInput.value);
  });
  outletInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeOutletMenu();
      outletInput.blur();
    }
  });

  outletDropdownWrap.append(outletInput, outletMenu);
  outletContainer.append(outletDropdownWrap);

  let applyOutlet;
  const runApplyOutlet = async () => {
    await withApplyButtonLock(applyOutlet, async () => {
      const value = outletInput.value.trim();
      await runBulkApplyForSelectedEntries({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyButton: applyOutlet,
        perTargetUpdate: ({ tr, bookName, entryData }) => {
          entryData.outletName = value;
          mirrorEntryFieldsToOriginalData(cache[bookName], entryData, ['outletName']);
          const rowOutlet = tr.querySelector('[name="outletName"]');
          if (rowOutlet) rowOutlet.value = value;
        },
        afterTargetsUpdate: (targets) => {
          syncEntryManagerOutletFilters();
          for (const { tr, entryData } of targets) {
            applyEntryManagerOutletFilterToRow(tr, entryData);
          }
          filterIndicatorRefs.outlet?.();
        },
      })();
    });
  };
  applyOutlet = createApplyButton(
    'Apply outlet name to all selected entries',
    runApplyOutlet,
    applyRegistry,
  );
  outletInput.addEventListener('input', () => applyOutlet.classList.add(APPLY_DIRTY_CLASS));
  outletContainer.append(applyOutlet);

  const applyOutletContainerState = () => {
    const isOutlet = isOutletPosition(positionSelect.value);
    outletContainer.classList.toggle('stwid--state-disabled', !isOutlet);
    outletInput.disabled = !isOutlet;
  };
  positionSelect.addEventListener('change', applyOutletContainerState);
  applyOutletContainerState();

  return { outletContainer, cleanup };
}

export function buildBulkPositionSection({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  getPositionOptions,
  applyEntryManagerPositionFilterToRow,
  isOutletPosition,
  getOutletOptions,
  applyEntryManagerOutletFilterToRow,
  syncEntryManagerOutletFilters,
  filterIndicatorRefs,
  applyRegistry,
  debounce,
}) {
  const { positionContainer, positionSelect } = buildBulkPositionControls({
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    getPositionOptions,
    applyEntryManagerPositionFilterToRow,
    applyRegistry,
  });
  const { depthContainer } = buildBulkDepthControls({
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    positionSelect,
    applyRegistry,
  });
  const { outletContainer, cleanup } = buildBulkOutletControls({
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    positionSelect,
    isOutletPosition,
    getOutletOptions,
    applyEntryManagerOutletFilterToRow,
    syncEntryManagerOutletFilters,
    filterIndicatorRefs,
    applyRegistry,
    debounce,
  });

  return { positionContainer, depthContainer, outletContainer, cleanup };
}
