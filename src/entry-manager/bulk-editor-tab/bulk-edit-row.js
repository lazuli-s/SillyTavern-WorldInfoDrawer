import { wrapRowContent } from '../entry-manager.utils.js';
import {
  buildBulkSelectSection,
  buildApplyAllSection,
  buildBulkProbabilitySection,
  buildBulkStickySection,
  buildBulkCooldownSection,
  buildBulkDelaySection,
  buildBulkStateSection,
  buildBulkStrategySection,
  buildBulkRecursionSection,
  buildBulkBudgetSection,
} from './bulk-edit-row.sections.js';
import { buildBulkCharacterFilterSection } from './bulk-edit-row.character-filter.js';
import { buildBulkPositionSection } from './bulk-edit-row.position.js';
import { buildBulkOrderSection } from './bulk-edit-row.order.js';
import { buildBulkUidSection } from './bulk-edit-row.uid.js';

function createBulkEditRowRoot() {
  const row = document.createElement('div');
  row.classList.add('stwid--bulk-edit-row');
  return row;
}

function appendBulkSelectSection(
  row,
  {
    dom,
    getEntryManagerRows,
    isEntryManagerRowSelected,
    setAllEntryManagerRowSelected,
    updateEntryManagerSelectAllButton,
  },
) {
  const { selectContainer, refreshSelectionCount } = buildBulkSelectSection({
    dom,
    getEntryManagerRows,
    isEntryManagerRowSelected,
    setAllEntryManagerRowSelected,
    updateEntryManagerSelectAllButton,
  });
  row.append(selectContainer);
  return refreshSelectionCount;
}

function appendBulkEditSections(row, options, applyRegistry) {
  const {
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    getStrategyOptions,
    applyEntryManagerStrategyFilterToRow,
    getPositionOptions,
    applyEntryManagerPositionFilterToRow,
    isOutletPosition,
    getOutletOptions,
    applyEntryManagerOutletFilterToRow,
    syncEntryManagerOutletFilters,
    filterIndicatorRefs,
    applyEntryManagerRecursionFilterToRow,
    debounce,
  } = options;
  // Builders routed through this helper must return exactly one element; a
  // section needing several elements or a cleanup is destructured at its call
  // site instead, like buildBulkPositionSection below.
  const appendBulkSection = (buildSection, extraArgs = {}) => {
    const section = buildSection({
      dom,
      cache,
      isEntryManagerRowSelected,
      saveWorldInfo,
      buildSavePayload,
      applyRegistry,
      ...extraArgs,
    });
    if (!(section instanceof Node)) {
      throw new Error(
        `[STWID] Bulk section builder must return an element, got: ${String(section)} (${buildSection.name})`,
      );
    }
    row.append(section);
  };

  appendBulkSection(buildBulkStateSection);
  appendBulkSection(buildBulkStrategySection, {
    getStrategyOptions,
    applyEntryManagerStrategyFilterToRow,
  });

  const { positionContainer, depthContainer, outletContainer, cleanup } = buildBulkPositionSection({
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
  });
  row.append(positionContainer, depthContainer, outletContainer);

  appendBulkSection(buildBulkOrderSection);
  appendBulkSection(buildBulkUidSection);
  appendBulkSection(buildBulkRecursionSection, {
    applyEntryManagerRecursionFilterToRow,
  });
  appendBulkSection(buildBulkBudgetSection);
  appendBulkSection(buildBulkProbabilitySection);
  appendBulkSection(buildBulkStickySection);
  appendBulkSection(buildBulkCooldownSection);
  appendBulkSection(buildBulkDelaySection);
  appendBulkSection(buildBulkCharacterFilterSection);

  return cleanup;
}

function finalizeBulkEditRow(row, applyRegistry, refreshSelectionCount, cleanup) {
  row.append(buildApplyAllSection(applyRegistry));
  wrapRowContent(row);
  return { element: row, refreshSelectionCount, cleanup };
}

export function buildBulkEditRow(options) {
  const row = createBulkEditRowRoot();
  const refreshSelectionCount = appendBulkSelectSection(row, options);
  const applyRegistry = [];
  const cleanup = appendBulkEditSections(row, options, applyRegistry);

  return finalizeBulkEditRow(row, applyRegistry, refreshSelectionCount, cleanup);
}
