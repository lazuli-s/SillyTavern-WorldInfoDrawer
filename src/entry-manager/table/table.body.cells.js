import {
  setTooltip,
  formatCharacterFilter,
  truncateCharacterFilterLines,
  CHARACTER_FILTER_LINE_LIMIT,
} from '../entry-manager.utils.js';
import { ENTRY_MANAGER_RECURSION_OPTIONS } from '../../shared/constants.js';
import { createMoveButton } from './table.body.row-sorting.js';
import { mirrorEntryFieldsToOriginalData } from '../../shared/original-data.js';

const TEXT_POLE_CLASS = 'text_pole';
const ORDER_INPUT_TIGHT_CLASS = 'stwid--order-input';
const CHARACTER_FILTER_COLLAPSED_CLASS = 'stwid--character-filter-options--collapsed';

function buildCharacterFilterLine(line, { overflow }) {
  const row = document.createElement('div');
  row.classList.add('stwid--character-filter-row', `stwid--character-filter-row--${line.mode}`);
  if (line.stale) row.classList.add('stwid--character-filter-row--stale');
  if (overflow) row.classList.add('stwid--character-filter-row--overflow');
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-fw', line.icon);
  const text = document.createElement('span');
  text.classList.add('stwid--character-filter-label');
  text.textContent = line.label;
  row.append(icon, text);
  setTooltip(row, line.tooltip);
  return row;
}

// R5 — in-place expand: every line is in the DOM, the overflow is collapsed by CSS.
function buildCharacterFilterMoreButton(wrap, hiddenCount, totalCount) {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('stwid--character-filter-more', 'interactable');
  const applyState = (expanded) => {
    wrap.classList.toggle(CHARACTER_FILTER_COLLAPSED_CLASS, !expanded);
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Show less' : `+${hiddenCount} more`;
    setTooltip(
      button,
      expanded
        ? `Show only the first ${CHARACTER_FILTER_LINE_LIMIT} filter values`
        : `Show all ${totalCount} filter values in this cell`,
    );
  };
  button.addEventListener('click', (evt) => {
    evt.stopPropagation();
    applyState(button.getAttribute('aria-expanded') !== 'true');
  });
  applyState(false);
  return button;
}

function renderCharacterFilterCell(wrap, entryData) {
  wrap.textContent = '';
  wrap.classList.remove(CHARACTER_FILTER_COLLAPSED_CLASS);
  const lines = formatCharacterFilter(entryData);
  if (!lines.length) return;

  const { visible, overflow, hiddenCount } = truncateCharacterFilterLines(lines);
  for (const line of visible) wrap.append(buildCharacterFilterLine(line, { overflow: false }));
  for (const line of overflow) wrap.append(buildCharacterFilterLine(line, { overflow: true }));
  if (hiddenCount > 0) wrap.append(buildCharacterFilterMoreButton(wrap, hiddenCount, lines.length));
}

export function buildNumberInputCell({ col, name, tooltip, max = '99999', getValue, onSave }) {
  const td = document.createElement('td');
  td.setAttribute('data-col', col);
  td.classList.add('stwid--order-table--number-columns');
  const inputEl = document.createElement('input');
  inputEl.classList.add('stwid--input', TEXT_POLE_CLASS);
  inputEl.name = name;
  setTooltip(inputEl, tooltip);
  inputEl.min = '0';
  inputEl.max = max;
  inputEl.type = 'number';
  inputEl.value = getValue() ?? '';
  inputEl.addEventListener('change', async () => {
    const value = parseInt(inputEl.value);
    await onSave(Number.isFinite(value) ? value : undefined);
  });
  td.append(inputEl);
  return td;
}

export function buildTextInput({ name, tooltip, getValue, onChange }) {
  const inputEl = document.createElement('input');
  inputEl.classList.add('stwid--input', TEXT_POLE_CLASS, ORDER_INPUT_TIGHT_CLASS);
  inputEl.name = name;
  setTooltip(inputEl, tooltip);
  inputEl.type = 'text';
  inputEl.value = getValue() ?? '';
  inputEl.addEventListener('change', async () => {
    await onChange(inputEl.value);
  });
  return inputEl;
}

function buildRecursionOptionRow({
  entryRow,
  tr,
  key,
  label,
  cache,
  enqueueSave,
  applyEntryManagerRecursionFilterToRow,
}) {
  const row = document.createElement('label');
  row.classList.add('stwid--option-check-row');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.classList.add('checkbox');
  setTooltip(input, label);
  input.checked = Boolean(entryRow.data[key]);
  input.addEventListener('change', async () => {
    const entryData = cache[entryRow.book].entries[entryRow.data.uid];
    entryData[key] = input.checked;
    entryRow.data[key] = input.checked;
    mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, [key]);
    applyEntryManagerRecursionFilterToRow(tr, entryData);
    await enqueueSave(entryRow.book);
  });
  row.append(input, label);
  return row;
}

export function buildEntryManagerRow({
  entryRow,
  dom,
  cache,
  enqueueSave,
  focusWorldEntry,
  isEntryManagerRowSelected,
  setEntryManagerRowSelected,
  updateEntryManagerSelectAllButton,
  refreshSelectionCount,
  applyEntryManagerStrategyFilterToRow,
  applyEntryManagerPositionFilterToRow,
  applyEntryManagerRecursionFilterToRow,
  syncEntryManagerOutletFilters,
  syncEntryManagerAutomationIdFilters,
  syncEntryManagerGroupFilters,
  refreshOutletFilterIndicator,
  refreshAutomationIdFilterIndicator,
  refreshGroupFilterIndicator,
  applyEntryManagerOutletFilters,
  applyEntryManagerAutomationIdFilters,
  applyEntryManagerGroupFilters,
  isOutletPosition,
  entryState,
  enabledToggleTemplate,
  strategyTemplate,
  positionTemplate,
  getVisibleEntryManagerRows,
  updateCustomOrderFromDom,
}) {
  const tr = document.createElement('tr');
  tr.setAttribute('data-book', entryRow.book);
  tr.setAttribute('data-uid', entryRow.data.uid);
  tr.dataset.stwidFilterStrategy = 'false';
  tr.dataset.stwidFilterPosition = 'false';
  tr.dataset.stwidFilterRecursion = 'false';
  tr.dataset.stwidFilterOutlet = 'false';
  tr.dataset.stwidFilterAutomationId = 'false';
  tr.dataset.stwidFilterGroup = 'false';
  tr.dataset.stwidFilterScript = 'false';

  if (!dom.order.entries[entryRow.book]) {
    dom.order.entries[entryRow.book] = {};
  }
  dom.order.entries[entryRow.book][entryRow.data.uid] = tr;

  const select = document.createElement('td');
  select.setAttribute('data-col', 'select');
  const selectButton = document.createElement('div');
  selectButton.classList.add('stwid--order-select', 'fa-solid', 'fa-fw');
  setTooltip(selectButton, 'Include/exclude this row from Apply Order');
  const selectIcon = document.createElement('i');
  selectIcon.classList.add('fa-solid', 'fa-fw', 'stwid--icon');
  selectButton.append(selectIcon);
  selectButton.addEventListener('click', () => {
    setEntryManagerRowSelected(tr, !isEntryManagerRowSelected(tr));
    updateEntryManagerSelectAllButton();
    refreshSelectionCount?.();
  });
  select.append(selectButton);
  tr.append(select);

  const handle = document.createElement('td');
  handle.setAttribute('data-col', 'drag');
  const controls = document.createElement('div');
  controls.classList.add('stwid--order-move');
  const upButton = createMoveButton({
    row: tr,
    direction: 'up',
    iconClass: 'fa-caret-up',
    title: 'Move up',
    jumpTitle: 'the top of the filtered list',
    dom,
    getVisibleEntryManagerRows,
    updateCustomOrderFromDom,
  });
  const downButton = createMoveButton({
    row: tr,
    direction: 'down',
    iconClass: 'fa-caret-down',
    title: 'Move down',
    jumpTitle: 'the bottom of the filtered list',
    dom,
    getVisibleEntryManagerRows,
    updateCustomOrderFromDom,
  });
  const dragHandle = document.createElement('div');
  dragHandle.classList.add('stwid--sortable-handle', 'fa-solid', 'fa-fw', 'fa-grip-lines');
  setTooltip(dragHandle, 'Drag to reorder rows');
  controls.append(upButton, dragHandle, downButton);
  handle.append(controls);
  tr.append(handle);

  const active = document.createElement('td');
  active.setAttribute('data-col', 'enabled');
  const enabledToggle = enabledToggleTemplate.cloneNode(true);
  enabledToggle.classList.add('stwid--enabled');
  setTooltip(enabledToggle, 'Enable/disable this entry');
  const applyEnabledIcon = (el, disabled) => {
    el.classList.toggle('fa-toggle-off', Boolean(disabled));
    el.classList.toggle('fa-toggle-on', !Boolean(disabled));
  };
  applyEnabledIcon(enabledToggle, entryRow.data.disable);
  enabledToggle.addEventListener('click', async () => {
    const entryData = cache[entryRow.book].entries[entryRow.data.uid];
    const nextDisabled = !entryData.disable;
    entryData.disable = nextDisabled;
    entryRow.data.disable = nextDisabled;
    mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['disable']);
    applyEnabledIcon(enabledToggle, nextDisabled);
    const listToggle = cache[entryRow.book].dom.entry?.[entryRow.data.uid]?.isEnabled;
    if (listToggle) {
      applyEnabledIcon(listToggle, nextDisabled);
    }
    await enqueueSave(entryRow.book);
  });
  active.append(enabledToggle);
  tr.append(active);

  const entryCell = document.createElement('td');
  entryCell.setAttribute('data-col', 'entry');
  const entryCellWrap = document.createElement('div');
  entryCellWrap.classList.add('stwid--colwrap', 'stwid--entry');
  const bookLabel = document.createElement('div');
  bookLabel.classList.add('stwid--book');
  const bookIcon = document.createElement('i');
  bookIcon.classList.add('fa-solid', 'fa-fw', 'fa-book-atlas');
  bookLabel.append(bookIcon);
  const bookText = document.createElement('span');
  bookText.textContent = entryRow.book;
  bookLabel.append(bookText);
  entryCellWrap.append(bookLabel);
  const commentLink = document.createElement('a');
  commentLink.classList.add('stwid--comment', 'stwid--comment-link');
  commentLink.href = `#world_entry/${encodeURIComponent(entryRow.data.uid)}`;
  commentLink.textContent = entryRow.data.comment ?? '';
  commentLink.addEventListener('click', (evt) => {
    evt.preventDefault();
    focusWorldEntry(entryRow.book, entryRow.data.uid);
  });
  entryCellWrap.append(commentLink);
  const key = document.createElement('div');
  key.classList.add('stwid--key');
  key.textContent = entryRow.data.key.join(', ');
  entryCellWrap.append(key);
  entryCell.append(entryCellWrap);
  tr.append(entryCell);

  const strategy = document.createElement('td');
  strategy.setAttribute('data-col', 'strategy');
  const strategySelect = strategyTemplate.cloneNode(true);
  strategySelect.classList.add('stwid--strategy', 'stwid--sort-select');
  setTooltip(strategySelect, 'Entry strategy');
  strategySelect.value = entryState(entryRow.data);
  strategySelect.addEventListener('change', async () => {
    const value = strategySelect.value;
    cache[entryRow.book].dom.entry[entryRow.data.uid].strategy.value = value;
    switch (value) {
      case 'constant':
        cache[entryRow.book].entries[entryRow.data.uid].constant = true;
        cache[entryRow.book].entries[entryRow.data.uid].vectorized = false;
        break;
      case 'normal':
        cache[entryRow.book].entries[entryRow.data.uid].constant = false;
        cache[entryRow.book].entries[entryRow.data.uid].vectorized = false;
        break;
      case 'vectorized':
        cache[entryRow.book].entries[entryRow.data.uid].constant = false;
        cache[entryRow.book].entries[entryRow.data.uid].vectorized = true;
        break;
    }
    mirrorEntryFieldsToOriginalData(
      cache[entryRow.book],
      cache[entryRow.book].entries[entryRow.data.uid],
      ['constant', 'vectorized'],
    );
    applyEntryManagerStrategyFilterToRow(tr, cache[entryRow.book].entries[entryRow.data.uid]);
    await enqueueSave(entryRow.book);
  });
  strategy.append(strategySelect);
  tr.append(strategy);

  let updateOutlet;
  const positionSelect = positionTemplate.cloneNode(true);
  const position = document.createElement('td');
  position.setAttribute('data-col', 'position');
  cache[entryRow.book].dom.entry[entryRow.data.uid].position = positionSelect;
  positionSelect.classList.add('stwid--position', 'stwid--sort-select');
  setTooltip(positionSelect, 'Where this entry is inserted');
  positionSelect.value = entryRow.data.position;
  positionSelect.addEventListener('change', async () => {
    const value = positionSelect.value;
    const numericPosition = Number(value);
    const nextPosition = Number.isNaN(numericPosition) ? 0 : numericPosition;
    cache[entryRow.book].dom.entry[entryRow.data.uid].position.value = value;
    cache[entryRow.book].entries[entryRow.data.uid].position = nextPosition;
    entryRow.data.position = nextPosition;
    mirrorEntryFieldsToOriginalData(
      cache[entryRow.book],
      cache[entryRow.book].entries[entryRow.data.uid],
      ['position'],
    );
    applyEntryManagerPositionFilterToRow(tr, cache[entryRow.book].entries[entryRow.data.uid]);
    updateOutlet?.();
    await enqueueSave(entryRow.book);
  });
  position.append(positionSelect);
  tr.append(position);

  tr.append(
    buildNumberInputCell({
      col: 'depth',
      name: 'depth',
      tooltip: 'Entry depth',
      getValue: () => entryRow.data.depth,
      onSave: async (value) => {
        const entryData = cache[entryRow.book].entries[entryRow.data.uid];
        entryData.depth = value;
        mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['depth']);
        await enqueueSave(entryRow.book);
      },
    }),
  );

  const outlet = document.createElement('td');
  outlet.setAttribute('data-col', 'outlet');
  const outletWrap = document.createElement('div');
  outletWrap.classList.add('stwid--colwrap', 'stwid--outlet');
  const outletInput = buildTextInput({
    name: 'outletName',
    tooltip: 'Outlet name (used for outlet positions)',
    getValue: () =>
      cache[entryRow.book].entries[entryRow.data.uid].outletName ?? entryRow.data.outletName ?? '',
    onChange: async (nextValue) => {
      const entryData = cache[entryRow.book].entries[entryRow.data.uid];
      entryData.outletName = nextValue;
      entryRow.data.outletName = nextValue;
      mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['outletName']);
      syncEntryManagerOutletFilters();
      refreshOutletFilterIndicator();
      applyEntryManagerOutletFilters();
      await enqueueSave(entryRow.book);
      updateOutlet?.();
    },
  });
  updateOutlet = () => {
    const entryData = cache[entryRow.book].entries[entryRow.data.uid];
    const currentPosition = entryData.position ?? positionSelect.value;
    const outletName = entryData.outletName ?? entryRow.data.outletName ?? '';
    outletInput.value = outletName;
    outletWrap.hidden = !isOutletPosition(currentPosition);
  };
  updateOutlet();
  outletWrap.append(outletInput);
  outlet.append(outletWrap);
  tr.append(outlet);

  const group = document.createElement('td');
  group.setAttribute('data-col', 'group');
  const groupWrap = document.createElement('div');
  groupWrap.classList.add('stwid--colwrap', 'stwid--outlet', 'stwid--recursion-options');
  const groupInput = buildTextInput({
    name: 'group',
    tooltip: 'Inclusion group name',
    getValue: () => cache[entryRow.book].entries[entryRow.data.uid].group ?? '',
    onChange: async (nextValue) => {
      const entryData = cache[entryRow.book].entries[entryRow.data.uid];
      entryData.group = nextValue;
      entryRow.data.group = nextValue;
      mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['group']);
      syncEntryManagerGroupFilters();
      refreshGroupFilterIndicator();
      applyEntryManagerGroupFilters();
      await enqueueSave(entryRow.book);
    },
  });
  groupWrap.append(groupInput, document.createElement('br'));
  const prioritizeRow = document.createElement('label');
  prioritizeRow.classList.add('stwid--option-check-row');
  const prioritizeInput = document.createElement('input');
  prioritizeInput.type = 'checkbox';
  prioritizeInput.classList.add('checkbox');
  setTooltip(prioritizeInput, 'Prioritize this entry within its inclusion group');
  prioritizeInput.checked = Boolean(entryRow.data.groupOverride);
  prioritizeInput.addEventListener('change', async () => {
    const entryData = cache[entryRow.book].entries[entryRow.data.uid];
    entryData.groupOverride = prioritizeInput.checked;
    entryRow.data.groupOverride = prioritizeInput.checked;
    mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['groupOverride']);
    await enqueueSave(entryRow.book);
  });
  prioritizeRow.append(prioritizeInput, 'Prioritize');
  groupWrap.append(prioritizeRow);
  group.append(groupWrap);
  tr.append(group);

  tr.append(
    buildNumberInputCell({
      col: 'order',
      name: 'order',
      tooltip: 'Order value',
      getValue: () => entryRow.data.order,
      onSave: async (value) => {
        const entryData = cache[entryRow.book].entries[entryRow.data.uid];
        entryData.order = value;
        mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['order']);
        await enqueueSave(entryRow.book);
      },
    }),
  );
  tr.append(
    buildNumberInputCell({
      col: 'sticky',
      name: 'sticky',
      tooltip: 'Sticky duration',
      getValue: () => entryRow.data.sticky,
      onSave: async (value) => {
        const entryData = cache[entryRow.book].entries[entryRow.data.uid];
        entryData.sticky = value;
        mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['sticky']);
        await enqueueSave(entryRow.book);
      },
    }),
  );
  tr.append(
    buildNumberInputCell({
      col: 'cooldown',
      name: 'cooldown',
      tooltip: 'Cooldown duration',
      getValue: () => entryRow.data.cooldown,
      onSave: async (value) => {
        const entryData = cache[entryRow.book].entries[entryRow.data.uid];
        entryData.cooldown = value;
        mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['cooldown']);
        await enqueueSave(entryRow.book);
      },
    }),
  );
  tr.append(
    buildNumberInputCell({
      col: 'delay',
      name: 'delay',
      tooltip: 'Delay before activation',
      getValue: () => entryRow.data.delay,
      onSave: async (value) => {
        const entryData = cache[entryRow.book].entries[entryRow.data.uid];
        entryData.delay = value;
        mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['delay']);
        await enqueueSave(entryRow.book);
      },
    }),
  );

  const automationId = document.createElement('td');
  automationId.setAttribute('data-col', 'automationId');
  automationId.classList.add('stwid--order-table--number-columns');
  const automationIdInput = buildTextInput({
    name: 'automationId',
    tooltip: 'Automation ID',
    getValue: () =>
      cache[entryRow.book].entries[entryRow.data.uid].automationId ??
      entryRow.data.automationId ??
      '',
    onChange: async (nextValue) => {
      const entryData = cache[entryRow.book].entries[entryRow.data.uid];
      entryData.automationId = nextValue;
      entryRow.data.automationId = nextValue;
      mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['automationId']);
      syncEntryManagerAutomationIdFilters();
      refreshAutomationIdFilterIndicator();
      applyEntryManagerAutomationIdFilters();
      await enqueueSave(entryRow.book);
    },
  });
  automationId.append(automationIdInput);
  tr.append(automationId);

  tr.append(
    buildNumberInputCell({
      col: 'trigger',
      name: 'selective_probability',
      tooltip: 'Trigger chance percentage',
      max: '100',
      getValue: () => entryRow.data.probability,
      onSave: async (value) => {
        const entryData = cache[entryRow.book].entries[entryRow.data.uid];
        entryData.probability = value;
        entryRow.data.probability = value;
        mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['probability']);
        await enqueueSave(entryRow.book);
      },
    }),
  );

  const recursion = document.createElement('td');
  recursion.setAttribute('data-col', 'recursion');
  const recursionWrap = document.createElement('div');
  recursionWrap.classList.add('stwid--recursion-options');
  for (const { value, label } of ENTRY_MANAGER_RECURSION_OPTIONS) {
    recursionWrap.append(
      buildRecursionOptionRow({
        entryRow,
        tr,
        key: value,
        label,
        cache,
        enqueueSave,
        applyEntryManagerRecursionFilterToRow,
      }),
    );
  }
  recursion.append(recursionWrap);
  tr.append(recursion);

  const budget = document.createElement('td');
  budget.setAttribute('data-col', 'budget');
  const budgetWrap = document.createElement('div');
  budgetWrap.classList.add('stwid--recursion-options');
  const budgetRow = document.createElement('label');
  budgetRow.classList.add('stwid--option-check-row');
  const budgetInput = document.createElement('input');
  budgetInput.type = 'checkbox';
  budgetInput.classList.add('checkbox');
  setTooltip(budgetInput, 'Ignore World Info budget limit for this entry');
  budgetInput.checked = Boolean(entryRow.data.ignoreBudget);
  budgetInput.addEventListener('change', async () => {
    const entryData = cache[entryRow.book].entries[entryRow.data.uid];
    entryData.ignoreBudget = budgetInput.checked;
    entryRow.data.ignoreBudget = budgetInput.checked;
    mirrorEntryFieldsToOriginalData(cache[entryRow.book], entryData, ['ignoreBudget']);
    await enqueueSave(entryRow.book);
  });
  budgetRow.append(budgetInput, 'Ignore budget');
  budgetWrap.append(budgetRow);
  budget.append(budgetWrap);
  tr.append(budget);

  const characterFilter = document.createElement('td');
  characterFilter.setAttribute('data-col', 'characterFilter');
  const characterFilterWrap = document.createElement('div');
  characterFilterWrap.classList.add('stwid--colwrap', 'stwid--character-filter-options');
  renderCharacterFilterCell(characterFilterWrap, entryRow.data);
  characterFilter.append(characterFilterWrap);
  tr.append(characterFilter);

  setEntryManagerRowSelected(tr, true);
  return tr;
}
