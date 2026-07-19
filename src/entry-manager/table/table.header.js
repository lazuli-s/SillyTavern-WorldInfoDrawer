import {
  createMultiselectDropdownCheckbox,
  wireMultiselectDropdown,
} from '../entry-manager.utils.js';
import {
  ENTRY_MANAGER_TABLE_COLUMNS,
  ENTRY_MANAGER_NUMBER_COLUMN_KEYS,
  ENTRY_MANAGER_RECURSION_OPTIONS,
} from '../../shared/constants.js';

const ACTIVE_FILTER_CLASS = 'stwid--state-active';
// Outlet/automationId/group option counts scale with the number of distinct
// entry values and are unbounded; strategy/position/recursion are small fixed
// sets and are left uncapped. Capping is display-only: values beyond the cap
// stay in entryManagerState.filters, so no row is hidden by an unbuilt option.
const FILTER_OPTION_DISPLAY_CAP = 200;

function ensureDefaultFiltersSelected({ stateKey, allValues, entryManagerState }) {
  if (!entryManagerState.filters[stateKey].length) {
    entryManagerState.filters[stateKey] = [...allValues];
  }
}

function updateFilterIndicatorState({
  stateKey,
  stateValuesKey,
  getValues,
  normalizeFilters,
  entryManagerState,
  menuButton,
}) {
  const allValues =
    normalizeFilters === null
      ? (entryManagerState[stateValuesKey] ?? [])
      : entryManagerState[stateValuesKey].length
        ? entryManagerState[stateValuesKey]
        : getValues();

  if (!allValues.length) {
    return;
  }

  if (normalizeFilters !== null) {
    entryManagerState.filters[stateKey] = normalizeFilters(entryManagerState.filters[stateKey]);
  }

  ensureDefaultFiltersSelected({ stateKey, allValues, entryManagerState });

  const isActive = entryManagerState.filters[stateKey].length !== allValues.length;
  menuButton.classList.toggle(ACTIVE_FILTER_CLASS, isActive);
}

function applyFiltersAndNotify({ updateFilterIndicator, applyFilters, onFilterChange }) {
  updateFilterIndicator();
  applyFilters();
  onFilterChange();
}

function createFilterMenuShell() {
  const menuWrap = document.createElement('div');
  menuWrap.classList.add('stwid--multiselect-dropdown__wrap');

  const menuButton = document.createElement('div');
  menuButton.classList.add(
    'menu_button',
    'fa-solid',
    'fa-fw',
    'fa-filter',
    'stwid--order-filter-button',
    'stwid--multiselect-dropdown__button',
  );
  menuWrap.append(menuButton);

  const menu = document.createElement('div');
  menu.classList.add('stwid--multiselect-dropdown__menu', 'stwid--menu');

  return { menuWrap, menuButton, menu };
}

function createFilterMenuUpdaters({
  stateKey,
  stateValuesKey,
  getValues,
  normalizeFilters,
  applyFilters,
  onFilterChange,
  entryManagerState,
  menuButton,
}) {
  let updateFilterIndicator;
  let updateFilters;

  if (normalizeFilters === null) {
    updateFilterIndicator = () => {
      updateFilterIndicatorState({
        stateKey,
        stateValuesKey,
        getValues,
        normalizeFilters,
        entryManagerState,
        menuButton,
      });
    };

    updateFilters = () => {
      const allValues = entryManagerState[stateValuesKey] ?? [];
      ensureDefaultFiltersSelected({ stateKey, allValues, entryManagerState });
      applyFiltersAndNotify({ updateFilterIndicator, applyFilters, onFilterChange });
    };
  } else {
    updateFilterIndicator = () => {
      updateFilterIndicatorState({
        stateKey,
        stateValuesKey,
        getValues,
        normalizeFilters,
        entryManagerState,
        menuButton,
      });
    };

    updateFilters = () => {
      entryManagerState.filters[stateKey] = normalizeFilters(entryManagerState.filters[stateKey]);
      applyFiltersAndNotify({ updateFilterIndicator, applyFilters, onFilterChange });
    };
  }

  return { updateFilterIndicator, updateFilters };
}

function toggleFilterValue({ stateKey, value, isChecked, entryManagerState }) {
  if (isChecked) {
    if (!entryManagerState.filters[stateKey].includes(value)) {
      entryManagerState.filters[stateKey].push(value);
    }
    return;
  }

  entryManagerState.filters[stateKey] = entryManagerState.filters[stateKey].filter(
    (item) => item !== value,
  );
}

function buildFilterMenuOption({ optionData, stateKey, entryManagerState, updateFilters }) {
  const option = document.createElement('label');
  option.classList.add('stwid--multiselect-dropdown__option', 'stwid--menu-item');
  const inputControl = createMultiselectDropdownCheckbox(
    entryManagerState.filters[stateKey].includes(optionData.value),
  );
  inputControl.input.addEventListener('change', () => {
    toggleFilterValue({
      stateKey,
      value: optionData.value,
      isChecked: inputControl.input.checked,
      entryManagerState,
    });
    updateFilters();
  });
  option.append(inputControl.input, inputControl.checkbox);
  const optionLabel = document.createElement('span');
  optionLabel.textContent = optionData.label;
  option.append(optionLabel);
  return option;
}

function buildShowAllOptionsButton({ hiddenCount, onShowAll }) {
  const showAll = document.createElement('button');
  showAll.type = 'button';
  showAll.classList.add('stwid--multiselect-dropdown__option', 'stwid--menu-item');
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-fw', 'fa-ellipsis', 'stwid--multiselect-dropdown__option-icon');
  const label = document.createElement('span');
  label.textContent = `Show all (${hiddenCount} more)`;
  showAll.append(icon, label);
  showAll.addEventListener('click', onShowAll);
  return showAll;
}

function renderFilterMenuOptions({
  options,
  stateKey,
  entryManagerState,
  updateFilters,
  menu,
  capOptions = false,
}) {
  if (!options.length) {
    menu.classList.add('stwid--empty');
    menu.textContent = 'No options available.';
  }

  const appendOptions = (optionList) => {
    const fragment = document.createDocumentFragment();
    for (const optionData of optionList) {
      fragment.append(
        buildFilterMenuOption({ optionData, stateKey, entryManagerState, updateFilters }),
      );
    }
    menu.append(fragment);
  };

  if (!capOptions || options.length <= FILTER_OPTION_DISPLAY_CAP) {
    appendOptions(options);
    return;
  }

  appendOptions(options.slice(0, FILTER_OPTION_DISPLAY_CAP));
  const showAllButton = buildShowAllOptionsButton({
    hiddenCount: options.length - FILTER_OPTION_DISPLAY_CAP,
    onShowAll: () => {
      showAllButton.remove();
      appendOptions(options.slice(FILTER_OPTION_DISPLAY_CAP));
    },
  });
  menu.append(showAllButton);
}

function finalizeFilterMenu({ menu, menuButton, menuWrap, updateFilterIndicator }) {
  updateFilterIndicator();
  wireMultiselectDropdown(menu, menuButton, menuWrap);
  menuWrap.append(menu);

  return { menuWrap, updateFilterIndicator };
}

function buildFilterMenu({
  stateKey,
  stateValuesKey,
  getOptions,
  getValues,
  normalizeFilters,
  applyFilters,
  onFilterChange,
  entryManagerState,
  capOptions,
}) {
  const { menuWrap, menuButton, menu } = createFilterMenuShell();
  const { updateFilterIndicator, updateFilters } = createFilterMenuUpdaters({
    stateKey,
    stateValuesKey,
    getValues,
    normalizeFilters,
    applyFilters,
    onFilterChange,
    entryManagerState,
    menuButton,
  });

  const options = getOptions();
  renderFilterMenuOptions({
    options,
    stateKey,
    entryManagerState,
    updateFilters,
    menu,
    capOptions,
  });

  return finalizeFilterMenu({ menu, menuButton, menuWrap, updateFilterIndicator });
}

function buildFilterColumnHeader(label, menuConfig, entryManagerState) {
  const header = document.createElement('div');
  header.classList.add('stwid--column-header');
  const headerTitle = document.createElement('div');
  headerTitle.textContent = label;
  header.append(headerTitle);
  const filterWrap = document.createElement('div');
  filterWrap.classList.add('stwid--column-filter');
  const { menuWrap, updateFilterIndicator } = buildFilterMenu({ ...menuConfig, entryManagerState });
  filterWrap.append(menuWrap);
  header.append(filterWrap);
  return { header, updateFilterIndicator };
}

export function buildTableHeader({
  entryManagerState,
  applyEntryManagerStrategyFilters,
  applyEntryManagerPositionFilters,
  applyEntryManagerRecursionFilters,
  applyEntryManagerOutletFilters,
  applyEntryManagerAutomationIdFilters,
  applyEntryManagerGroupFilters,
  normalizeStrategyFilters,
  normalizePositionFilters,
  normalizeOutletFilters,
  normalizeAutomationIdFilters,
  normalizeGroupFilters,
  getStrategyOptions,
  getStrategyValues,
  getPositionOptions,
  getPositionValues,
  getOutletOptions,
  getOutletValues,
  getAutomationIdOptions,
  getAutomationIdValues,
  getGroupOptions,
  getGroupValues,
  onFilterChange = () => {},
}) {
  const refreshFilterIndicators = {};

  const filterMenuConfigs = {
    strategy: {
      stateKey: 'strategy',
      stateValuesKey: 'strategyValues',
      getOptions: getStrategyOptions,
      getValues: getStrategyValues,
      normalizeFilters: normalizeStrategyFilters,
      applyFilters: applyEntryManagerStrategyFilters,
    },
    position: {
      stateKey: 'position',
      stateValuesKey: 'positionValues',
      getOptions: getPositionOptions,
      getValues: getPositionValues,
      normalizeFilters: normalizePositionFilters,
      applyFilters: applyEntryManagerPositionFilters,
    },
    recursion: {
      stateKey: 'recursion',
      stateValuesKey: 'recursionValues',
      getOptions: () => ENTRY_MANAGER_RECURSION_OPTIONS,
      getValues: null,
      normalizeFilters: null,
      applyFilters: applyEntryManagerRecursionFilters,
    },
    outlet: {
      stateKey: 'outlet',
      stateValuesKey: 'outletValues',
      getOptions: getOutletOptions,
      getValues: getOutletValues,
      normalizeFilters: normalizeOutletFilters,
      applyFilters: applyEntryManagerOutletFilters,
      capOptions: true,
    },
    automationId: {
      stateKey: 'automationId',
      stateValuesKey: 'automationIdValues',
      getOptions: getAutomationIdOptions,
      getValues: getAutomationIdValues,
      normalizeFilters: normalizeAutomationIdFilters,
      applyFilters: applyEntryManagerAutomationIdFilters,
      capOptions: true,
    },
    group: {
      stateKey: 'group',
      stateValuesKey: 'groupValues',
      getOptions: getGroupOptions,
      getValues: getGroupValues,
      normalizeFilters: normalizeGroupFilters,
      applyFilters: applyEntryManagerGroupFilters,
      capOptions: true,
    },
  };

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  {
    for (const col of ENTRY_MANAGER_TABLE_COLUMNS) {
      const headerCell = document.createElement('th');
      {
        const menuConfig = filterMenuConfigs[col.key];
        if (menuConfig) {
          const { header, updateFilterIndicator } = buildFilterColumnHeader(
            col.label,
            { ...menuConfig, onFilterChange },
            entryManagerState,
          );
          headerCell.append(header);
          refreshFilterIndicators[col.key] = updateFilterIndicator;
        } else {
          headerCell.textContent = col.label;
        }
        if (col.key) {
          headerCell.setAttribute('data-col', col.key);
          if (ENTRY_MANAGER_NUMBER_COLUMN_KEYS.has(col.key)) {
            headerCell.classList.add('stwid--order-table--number-columns');
          }
        }
        headerRow.append(headerCell);
      }
    }
    thead.append(headerRow);
  }

  return {
    thead,
    refreshStrategyFilterIndicator: refreshFilterIndicators.strategy ?? (() => {}),
    refreshPositionFilterIndicator: refreshFilterIndicators.position ?? (() => {}),
    refreshRecursionFilterIndicator: refreshFilterIndicators.recursion ?? (() => {}),
    refreshOutletFilterIndicator: refreshFilterIndicators.outlet ?? (() => {}),
    refreshAutomationIdFilterIndicator: refreshFilterIndicators.automationId ?? (() => {}),
    refreshGroupFilterIndicator: refreshFilterIndicators.group ?? (() => {}),
  };
}
