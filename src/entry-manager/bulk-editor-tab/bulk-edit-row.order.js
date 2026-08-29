import { setTooltip } from '../entry-manager.utils.js';
import {
  APPLY_DIRTY_CLASS,
  createLabeledBulkContainer,
  createApplyButton,
  buildDirectionRadio,
  buildPersistedNumberInput,
  runBulkNumericFieldApply,
} from './bulk-edit-row.helpers.js';

const MAX_ORDER_INPUT = '10000';
const ORDER_DIRECTION_GROUP = 'stwid--order-direction';
const ORDER_START_STORAGE_KEY = 'stwid--order-start';
const ORDER_STEP_STORAGE_KEY = 'stwid--order-step';

// Exported for tests: the factory takes every dependency as an argument, so a
// unit test can drive `runApplyOrder` with fakes.
export function createRunApplyOrder({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyOrder,
}) {
  return async function runApplyOrder() {
    const applyButton = typeof applyOrder === 'function' ? applyOrder() : applyOrder;
    // Validation stays outside the button lock, matching the shared runner's
    // other callers; these warnings therefore surface even while another apply
    // holds the lock, where the busy-guard used to swallow them silently.
    const startValue = Number.parseInt(dom.order.start.value, 10);
    const stepValue = Number.parseInt(dom.order.step.value, 10);
    if (!Number.isInteger(startValue) || startValue <= 0) {
      toastr.warning('Start must be a positive whole number.');
      return;
    }
    if (!Number.isInteger(stepValue) || stepValue <= 0) {
      toastr.warning('Spacing must be a positive whole number.');
      return;
    }
    // Enforce the same ceiling the inputs' `max` attribute advertises; HTML
    // min/max do not block typed or pasted values.
    if (startValue > Number(MAX_ORDER_INPUT)) {
      toastr.warning(`Start must be ${MAX_ORDER_INPUT} or less.`);
      return;
    }
    if (stepValue > Number(MAX_ORDER_INPUT)) {
      toastr.warning(`Spacing must be ${MAX_ORDER_INPUT} or less.`);
      return;
    }

    await runBulkNumericFieldApply({
      resolveValue: (_target, index) => startValue + index * stepValue,
      entryField: 'order',
      rowInputName: 'order',
      noTargetsWarning: 'No selected entries to apply Order to.',
      reverse: dom.order.direction.up.checked,
      dom,
      cache,
      isEntryManagerRowSelected,
      saveWorldInfo,
      buildSavePayload,
      applyButton,
    });
  };
}

function buildOrderStartSpacingControls({ dom, applyButtonEl }) {
  const startSpacingPair = document.createElement('div');
  startSpacingPair.classList.add('stwid--order-start-spacing-pair');

  const markApplyButtonDirty = () => applyButtonEl.classList.add(APPLY_DIRTY_CLASS);
  const { label: startLabel, inputEl: startInputEl } = buildPersistedNumberInput({
    labelText: 'Start',
    tooltipText: 'Starting Order value',
    storageKey: ORDER_START_STORAGE_KEY,
    defaultValue: '100',
    maxValue: MAX_ORDER_INPUT,
    onDirty: markApplyButtonDirty,
  });
  dom.order.start = startInputEl;
  startSpacingPair.append(startLabel);

  const { label: stepLabel, inputEl: stepInputEl } = buildPersistedNumberInput({
    labelText: 'Spacing',
    tooltipText: 'Spacing between Order values',
    storageKey: ORDER_STEP_STORAGE_KEY,
    defaultValue: '10',
    maxValue: MAX_ORDER_INPUT,
    onDirty: markApplyButtonDirty,
  });
  dom.order.step = stepInputEl;
  startSpacingPair.append(stepLabel);

  return startSpacingPair;
}

function buildOrderDirectionControls({ dom, applyButtonEl }) {
  const directionGroup = document.createElement('div');
  directionGroup.classList.add('stwid--input-wrap');
  setTooltip(directionGroup, 'Direction used when applying Order values');
  directionGroup.append('Direction: ');

  const radioToggleWrap = document.createElement('div');
  radioToggleWrap.classList.add('stwid--toggleWrap');
  const upDirection = buildDirectionRadio(
    ORDER_DIRECTION_GROUP,
    'up',
    'up',
    'Start from the bottom row',
    ORDER_DIRECTION_GROUP,
    applyButtonEl,
  );
  dom.order.direction.up = upDirection.radioInput;
  radioToggleWrap.append(upDirection.directionRow);

  const downDirection = buildDirectionRadio(
    ORDER_DIRECTION_GROUP,
    'down',
    'down',
    'Start from the top row',
    ORDER_DIRECTION_GROUP,
    applyButtonEl,
  );
  dom.order.direction.down = downDirection.radioInput;
  radioToggleWrap.append(downDirection.directionRow);

  directionGroup.append(radioToggleWrap);
  return directionGroup;
}

export function buildBulkOrderSection({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyRegistry,
}) {
  const orderContainer = createLabeledBulkContainer(
    'order',
    'Order',
    'Assign sequential Order numbers to selected entries using the start value, spacing, and direction below.',
  );

  let applyOrder;
  const runApplyOrder = createRunApplyOrder({
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyOrder: () => applyOrder,
  });

  applyOrder = createApplyButton(
    'Apply current row order to the Order field',
    runApplyOrder,
    applyRegistry,
  );

  const startSpacingPair = buildOrderStartSpacingControls({ dom, applyButtonEl: applyOrder });
  orderContainer.append(startSpacingPair);

  const directionGroup = buildOrderDirectionControls({ dom, applyButtonEl: applyOrder });
  orderContainer.append(directionGroup);

  orderContainer.append(applyOrder);
  return orderContainer;
}
