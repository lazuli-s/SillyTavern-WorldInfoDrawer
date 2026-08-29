import { setTooltip } from '../entry-manager.utils.js';
import { ENTRY_MANAGER_RECURSION_OPTIONS } from '../../shared/constants.js';
import { maybeYieldToEventLoop } from '../../shared/utils.js';
import { mirrorEntryFieldsToOriginalData } from '../../shared/original-data.js';
import {
  BULK_APPLY_BATCH_SIZE,
  APPLY_DIRTY_CLASS,
  NON_NEGATIVE_PLACEHOLDER,
  createLabeledBulkContainer,
  createApplyButton,
  runBulkTargetsApply,
  withApplyButtonLock,
  createPersistedBulkNumberInput,
  runBulkNumericFieldApply,
  buildRecursionCheckboxRow,
  applyRecursionFlagsToRowInputs,
  RECURSION_ENTRY_FIELDS,
} from './bulk-edit-row.helpers.js';

const RECURSION_OPTIONS_CLASS = 'stwid--recursion-options';
const TOGGLE_ON_CLASS = 'fa-toggle-on';
const TOGGLE_OFF_CLASS = 'fa-toggle-off';
const BULK_ACTIVE_STORAGE_KEY = 'stwid--bulk-active-value';
const BULK_STRATEGY_STORAGE_KEY = 'stwid--bulk-strategy-value';

function buildBulkNonNegativeIntegerSection({
  id,
  label,
  description,
  storageKey,
  entryField,
  rowInputName,
  emptyValueWarning,
  invalidValueWarning,
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyRegistry,
}) {
  const container = createLabeledBulkContainer(id, label, description);
  const persistedInput = createPersistedBulkNumberInput({
    container,
    storageKey,
    min: '0',
    placeholder: NON_NEGATIVE_PLACEHOLDER,
    tooltip: `${label} turns value to apply`,
  });

  const runApply = async () => {
    // Validation runs here, before the shared runner locks the apply button —
    // the same placement `runApplyNonNegativeIntegerField` used internally.
    const rawValue = persistedInput.value.trim();
    if (rawValue === '') {
      toastr.warning(emptyValueWarning);
      return;
    }

    const parsedValue = parseInt(rawValue, 10);
    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
      toastr.warning(invalidValueWarning);
      return;
    }

    await runBulkNumericFieldApply({
      resolveValue: () => parsedValue,
      entryField,
      rowInputName,
      noTargetsWarning: `No selected entries to apply ${label} to.`,
      dom,
      cache,
      isEntryManagerRowSelected,
      saveWorldInfo,
      buildSavePayload,
      applyButton,
    });
  };

  const applyButton = createApplyButton(
    `Apply this ${label.toLowerCase()} value to all selected entries`,
    runApply,
    applyRegistry,
  );
  persistedInput.addEventListener('change', () => applyButton.classList.add(APPLY_DIRTY_CLASS));
  container.append(applyButton);
  return container;
}

function buildBulkActiveToggle() {
  const activeToggle = document.createElement('div');
  activeToggle.classList.add('fa-solid', 'killSwitch');
  const storedActive = localStorage.getItem(BULK_ACTIVE_STORAGE_KEY);
  const isActiveOn = storedActive !== 'false';
  activeToggle.classList.toggle(TOGGLE_ON_CLASS, isActiveOn);
  activeToggle.classList.toggle(TOGGLE_OFF_CLASS, !isActiveOn);
  setTooltip(
    activeToggle,
    'State to apply: toggle on = enable entries, toggle off = disable entries',
  );
  activeToggle.addEventListener('click', () => {
    const isOn = activeToggle.classList.contains(TOGGLE_ON_CLASS);
    activeToggle.classList.toggle(TOGGLE_ON_CLASS, !isOn);
    activeToggle.classList.toggle(TOGGLE_OFF_CLASS, isOn);
    localStorage.setItem(BULK_ACTIVE_STORAGE_KEY, String(!isOn));
  });
  return activeToggle;
}

function syncActiveStateToggles({ tr, cache, bookName, uid, willDisable }) {
  const rowToggle = tr.querySelector('[name="entryKillSwitch"]');
  if (rowToggle) {
    rowToggle.classList.toggle(TOGGLE_OFF_CLASS, willDisable);
    rowToggle.classList.toggle(TOGGLE_ON_CLASS, !willDisable);
  }

  const listToggle = cache?.[bookName]?.dom?.entry?.[uid]?.isEnabled;
  if (listToggle) {
    listToggle.classList.toggle(TOGGLE_OFF_CLASS, willDisable);
    listToggle.classList.toggle(TOGGLE_ON_CLASS, !willDisable);
  }
}

function applyBulkActiveStateToSingleTarget({ tr, bookName, uid, entryData, cache, willDisable }) {
  entryData.disable = willDisable;
  mirrorEntryFieldsToOriginalData(cache?.[bookName], entryData, ['disable']);
  syncActiveStateToggles({ tr, cache, bookName, uid, willDisable });
}

function buildBulkStrategySelect(getStrategyOptions) {
  const strategySelect = document.createElement('select');
  strategySelect.classList.add('stwid--input', 'text_pole', 'stwid--sort-select');
  setTooltip(strategySelect, 'Strategy to apply to selected entries');
  for (const strategyOption of getStrategyOptions()) {
    const option = document.createElement('option');
    option.value = strategyOption.value;
    option.textContent = strategyOption.label;
    strategySelect.append(option);
  }
  const storedStrategy = localStorage.getItem(BULK_STRATEGY_STORAGE_KEY);
  if (
    storedStrategy &&
    [...strategySelect.options].some(
      (existingStrategyOption) => existingStrategyOption.value === storedStrategy,
    )
  ) {
    strategySelect.value = storedStrategy;
  }
  strategySelect.addEventListener('change', () => {
    localStorage.setItem(BULK_STRATEGY_STORAGE_KEY, strategySelect.value);
  });
  return strategySelect;
}

function applyStrategyToSingleTarget({ tr, cache, bookName, uid, entryData, value }) {
  entryData.constant = value === 'constant';
  entryData.vectorized = value === 'vectorized';
  mirrorEntryFieldsToOriginalData(cache?.[bookName], entryData, ['constant', 'vectorized']);
  const rowStrategyInput = tr.querySelector('[name="entryStateSelector"]');
  if (rowStrategyInput) rowStrategyInput.value = value;
  const listStrategyInput = cache?.[bookName]?.dom?.entry?.[uid]?.strategy;
  if (listStrategyInput) listStrategyInput.value = value;
}

function applyBulkProbabilityToSingleTarget({ tr, bookName, entryData, cache, parsed }) {
  entryData.probability = parsed;
  mirrorEntryFieldsToOriginalData(cache?.[bookName], entryData, ['probability']);
  const rowProbabilityInput = tr.querySelector('[name="selective_probability"]');
  if (rowProbabilityInput) rowProbabilityInput.value = String(parsed);
}

export async function applyBulkProbabilityToTargets({ targets, cache, parsed }) {
  const books = new Set();
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    books.add(target.bookName);
    applyBulkProbabilityToSingleTarget({ ...target, cache, parsed });
    await maybeYieldToEventLoop(i, BULK_APPLY_BATCH_SIZE);
  }
  return books;
}

export function buildBulkSelectSection({
  dom,
  getEntryManagerRows,
  isEntryManagerRowSelected,
  setAllEntryManagerRowSelected,
  updateEntryManagerSelectAllButton,
}) {
  const selectContainer = createLabeledBulkContainer(
    'select',
    'Select',
    'Toggle selection of entries. Selected entries are targeted by bulk operations in this row.',
  );

  const selectionCountEl = document.createElement('span');
  selectionCountEl.classList.add('stwid--visibility-count');
  selectionCountEl.textContent = 'Selected 0 out of 0 entries';

  const refreshSelectionCount = () => {
    const rows = dom.order.tbody ? [...dom.order.tbody.children] : [];
    const visible = rows.filter(
      (tableRow) => !tableRow.classList.contains('stwid--state-filtered'),
    );
    const total = visible.length;
    const selected = visible.filter((tableRow) => isEntryManagerRowSelected(tableRow)).length;
    selectionCountEl.textContent = `Selected ${selected} out of ${total} entries`;
  };

  const selectAll = document.createElement('div');
  dom.order.selectAll = selectAll;
  selectAll.classList.add('menu_button', 'interactable');
  selectAll.classList.add('fa-solid', 'fa-fw', 'fa-square-check', 'stwid--state-active');
  setTooltip(selectAll, 'Select/deselect all entries to be edited by Apply Order');
  selectAll.addEventListener('click', async () => {
    await withApplyButtonLock(selectAll, async () => {
      const rows = getEntryManagerRows();
      const shouldSelect =
        !rows.length || rows.some((tableRow) => !isEntryManagerRowSelected(tableRow));
      await setAllEntryManagerRowSelected(shouldSelect, rows);
      updateEntryManagerSelectAllButton(rows);
      refreshSelectionCount();
    });
  });

  selectContainer.append(selectAll, selectionCountEl);
  return { selectContainer, refreshSelectionCount };
}

export function buildApplyAllSection(applyRegistry) {
  const applyAllContainer = createLabeledBulkContainer(
    'applyAll',
    'Apply All Changes',
    'Applies all containers that have unsaved changes. Skips containers that have not been modified.',
  );

  const applyAll = document.createElement('div');
  applyAll.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
  setTooltip(applyAll, 'Apply all containers with unsaved changes');
  applyAll.addEventListener('click', async () => {
    await withApplyButtonLock(applyAll, async () => {
      const dirty = applyRegistry.filter(({ isDirty }) => isDirty());
      if (!dirty.length) {
        toastr.info('No changes to apply.');
        return;
      }
      // One broken section must not cancel the rest: attempt every dirty
      // container, report every failure. A failed container keeps its
      // APPLY_DIRTY_CLASS, so Apply All can simply be clicked again.
      for (const { runApply } of dirty) {
        try {
          await runApply();
        } catch (error) {
          console.error('STWID: a container failed to apply during Apply All.', error);
          toastr.error('One or more sections failed to apply.');
        }
      }
    });
  });

  applyAllContainer.append(applyAll);
  return applyAllContainer;
}

export function buildBulkProbabilitySection({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyRegistry,
}) {
  const probabilityContainer = createLabeledBulkContainer(
    'probability',
    'Probability',
    'Trigger probability (0–100%). Sets how likely the entry fires when its keywords match. Leave blank to skip.',
  );

  const probabilityInput = createPersistedBulkNumberInput({
    container: probabilityContainer,
    storageKey: 'stwid--bulk-probability-value',
    min: '0',
    max: '100',
    placeholder: '0–100',
    tooltip: 'Probability value to apply (0–100)',
  });

  const runApplyProbability = async () => {
    // Validation runs here, inside the runner's lock — the same placement the
    // hand-rolled skeleton used before `runBulkTargetsApply` existed.
    let parsed = null;
    await runBulkTargetsApply({
      applyButton: applyProbability,
      dom,
      cache,
      isEntryManagerRowSelected,
      saveWorldInfo,
      buildSavePayload,
      prepare: () => {
        const rawValue = probabilityInput.value.trim();
        if (rawValue === '') {
          toastr.warning('Enter a probability value (0–100).');
          return false;
        }
        parsed = parseInt(rawValue, 10);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
          toastr.warning('Probability must be a whole number between 0 and 100.');
          return false;
        }
        return true;
      },
      applyToTarget: (target) => applyBulkProbabilityToSingleTarget({ ...target, cache, parsed }),
    });
  };

  const applyProbability = createApplyButton(
    'Apply this probability to all selected entries',
    runApplyProbability,
    applyRegistry,
  );
  probabilityInput.addEventListener('change', () =>
    applyProbability.classList.add(APPLY_DIRTY_CLASS),
  );
  probabilityContainer.append(applyProbability);
  return probabilityContainer;
}

export function buildBulkStickySection({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyRegistry,
}) {
  return buildBulkNonNegativeIntegerSection({
    id: 'sticky',
    label: 'Sticky',
    description:
      'Sticky turns — keeps the entry active for N turns after it triggers. Leave blank to skip.',
    storageKey: 'stwid--bulk-sticky-value',
    entryField: 'sticky',
    rowInputName: 'sticky',
    emptyValueWarning: 'Enter a sticky value (0 or more).',
    invalidValueWarning: 'Sticky must be a non-negative whole number.',
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyRegistry,
  });
}

export function buildBulkCooldownSection({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyRegistry,
}) {
  return buildBulkNonNegativeIntegerSection({
    id: 'cooldown',
    label: 'Cooldown',
    description:
      'Cooldown turns — prevents the entry from re-triggering for N turns after activation. Leave blank to skip.',
    storageKey: 'stwid--bulk-cooldown-value',
    entryField: 'cooldown',
    rowInputName: 'cooldown',
    emptyValueWarning: 'Enter a cooldown value (0 or more).',
    invalidValueWarning: 'Cooldown must be a non-negative whole number.',
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyRegistry,
  });
}

export function buildBulkDelaySection({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyRegistry,
}) {
  return buildBulkNonNegativeIntegerSection({
    id: 'bulkDelay',
    label: 'Delay',
    description:
      'Delay turns — the entry will not activate until N messages have passed since the chat started. Leave blank to skip.',
    storageKey: 'stwid--bulk-delay-value',
    entryField: 'delay',
    rowInputName: 'delay',
    emptyValueWarning: 'Enter a delay value (0 or more).',
    invalidValueWarning: 'Delay must be a non-negative whole number.',
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyRegistry,
  });
}

export function buildBulkStateSection({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyRegistry,
}) {
  const activeStateContainer = createLabeledBulkContainer(
    'activeState',
    'State',
    'Choose enabled or disabled and apply it to all selected entries at once.',
  );

  const activeToggle = buildBulkActiveToggle();

  const runApplyActiveState = async () => {
    // The toggle is read once per apply, not once per entry — a click on it
    // mid-apply must not mix two states into one run.
    let willDisable = false;
    await runBulkTargetsApply({
      applyButton: applyActiveState,
      dom,
      cache,
      isEntryManagerRowSelected,
      saveWorldInfo,
      buildSavePayload,
      prepare: () => {
        willDisable = activeToggle.classList.contains(TOGGLE_OFF_CLASS);
      },
      applyToTarget: (target) =>
        applyBulkActiveStateToSingleTarget({ ...target, cache, willDisable }),
    });
  };

  const applyActiveState = createApplyButton(
    'Apply the active state to all selected entries',
    runApplyActiveState,
    applyRegistry,
  );
  activeToggle.addEventListener('click', () => applyActiveState.classList.add(APPLY_DIRTY_CLASS));
  activeStateContainer.append(activeToggle, applyActiveState);
  return activeStateContainer;
}

export function buildBulkStrategySection({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  getStrategyOptions,
  applyEntryManagerStrategyFilterToRow,
  applyRegistry,
}) {
  const strategyContainer = createLabeledBulkContainer(
    'strategy',
    'Strategy',
    'Choose a strategy and apply it to all selected entries at once.',
  );

  const strategySelect = buildBulkStrategySelect(getStrategyOptions);
  strategyContainer.append(strategySelect);

  const runApplyStrategy = async () => {
    let value = '';
    await runBulkTargetsApply({
      applyButton: applyStrategy,
      dom,
      cache,
      isEntryManagerRowSelected,
      saveWorldInfo,
      buildSavePayload,
      prepare: () => {
        value = strategySelect.value;
        if (!value) {
          toastr.warning('No strategy selected.');
          return false;
        }
        return true;
      },
      applyToTarget: ({ tr, bookName, uid, entryData }) => {
        applyStrategyToSingleTarget({ tr, cache, bookName, uid, entryData, value });
        applyEntryManagerStrategyFilterToRow(tr, entryData);
      },
    });
  };

  const applyStrategy = createApplyButton(
    'Apply selected strategy to all selected entries',
    runApplyStrategy,
    applyRegistry,
  );
  strategySelect.addEventListener('change', () => applyStrategy.classList.add(APPLY_DIRTY_CLASS));
  strategyContainer.append(applyStrategy);
  return strategyContainer;
}

export function buildBulkRecursionSection({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyEntryManagerRecursionFilterToRow,
  applyRegistry,
}) {
  const recursionContainer = createLabeledBulkContainer(
    'recursion',
    'Recursion',
    'Set recursion flags on all selected entries. Overwrites the existing values of all three flags.',
  );

  const recursionCheckboxes = new Map();
  const recursionOptions = document.createElement('div');
  recursionOptions.classList.add(RECURSION_OPTIONS_CLASS);
  for (const { value, label } of ENTRY_MANAGER_RECURSION_OPTIONS) {
    recursionOptions.append(buildRecursionCheckboxRow(value, label, recursionCheckboxes));
  }
  recursionContainer.append(recursionOptions);

  const runApplyRecursion = async () => {
    await runBulkTargetsApply({
      applyButton: applyRecursion,
      dom,
      cache,
      isEntryManagerRowSelected,
      saveWorldInfo,
      buildSavePayload,
      applyToTarget: ({ tr, bookName, entryData }) => {
        const domInputs = tr.querySelectorAll(
          `[data-col="recursion"] .${RECURSION_OPTIONS_CLASS} input[type="checkbox"]`,
        );
        applyRecursionFlagsToRowInputs(domInputs, entryData, recursionCheckboxes);
        mirrorEntryFieldsToOriginalData(cache?.[bookName], entryData, RECURSION_ENTRY_FIELDS);
        applyEntryManagerRecursionFilterToRow(tr, entryData);
      },
    });
  };

  const applyRecursion = createApplyButton(
    'Apply recursion flags to all selected entries, overwriting their current values',
    runApplyRecursion,
    applyRegistry,
  );
  for (const input of recursionCheckboxes.values()) {
    input.addEventListener('change', () => applyRecursion.classList.add(APPLY_DIRTY_CLASS));
  }
  recursionContainer.append(applyRecursion);
  return recursionContainer;
}

export function buildBulkBudgetSection({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyRegistry,
}) {
  const budgetContainer = createLabeledBulkContainer(
    'budget',
    'Budget',
    'Set the Ignore Budget flag on all selected entries, overwriting existing values. When enabled, an entry bypasses the World Info token budget limit.',
  );

  const budgetOptions = document.createElement('div');
  budgetOptions.classList.add(RECURSION_OPTIONS_CLASS);
  const budgetRow = document.createElement('label');
  budgetRow.classList.add('stwid--option-check-row');
  const budgetIgnoreCheckbox = document.createElement('input');
  budgetIgnoreCheckbox.type = 'checkbox';
  budgetIgnoreCheckbox.classList.add('checkbox');
  setTooltip(budgetIgnoreCheckbox, 'Ignore World Info budget limit for this entry');
  budgetRow.append(budgetIgnoreCheckbox);
  budgetRow.append('Ignore budget');
  budgetOptions.append(budgetRow);
  budgetContainer.append(budgetOptions);

  const runApplyBudget = async () => {
    // The checkbox is read once per apply, not once per entry — a click on it
    // mid-apply must not mix two values into one run.
    let checked = false;
    await runBulkTargetsApply({
      applyButton: applyBudget,
      dom,
      cache,
      isEntryManagerRowSelected,
      saveWorldInfo,
      buildSavePayload,
      prepare: () => {
        checked = budgetIgnoreCheckbox.checked;
      },
      applyToTarget: ({ tr, bookName, entryData }) => {
        entryData.ignoreBudget = checked;
        mirrorEntryFieldsToOriginalData(cache?.[bookName], entryData, ['ignoreBudget']);
        const domInput = tr.querySelector(
          `[data-col="budget"] .${RECURSION_OPTIONS_CLASS} input[type="checkbox"]`,
        );
        if (domInput) domInput.checked = checked;
      },
    });
  };

  const applyBudget = createApplyButton(
    'Apply Ignore Budget to all selected entries, overwriting their current values',
    runApplyBudget,
    applyRegistry,
  );
  budgetIgnoreCheckbox.addEventListener('change', () =>
    applyBudget.classList.add(APPLY_DIRTY_CLASS),
  );
  budgetContainer.append(applyBudget);
  return budgetContainer;
}
