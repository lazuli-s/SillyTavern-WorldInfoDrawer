import { wrapRowContent } from '../action-bar.helpers.js';
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
import { buildBulkPositionSection } from './bulk-edit-row.position.js';
import { buildBulkOrderSection } from './bulk-edit-row.order.js';

export function buildBulkEditRow({
    dom,
    cache,
    saveWorldInfo,
    buildSavePayload,
    isOrderHelperRowSelected,
    setAllOrderHelperRowSelected,
    updateOrderHelperSelectAllButton,
    getOrderHelperRows,
    getStrategyOptions,
    applyOrderHelperStrategyFilterToRow,
    getPositionOptions,
    applyOrderHelperPositionFilterToRow,
    isOutletPosition,
    getOutletOptions,
    applyOrderHelperOutletFilterToRow,
    syncOrderHelperOutletFilters,
    filterIndicatorRefs,
    applyOrderHelperRecursionFilterToRow,
}) {
    const row = document.createElement('div');
    row.classList.add('stwid--bulkEditRow');

    const { selectContainer, refreshSelectionCount } = buildBulkSelectSection({
        dom,
        getOrderHelperRows,
        isOrderHelperRowSelected,
        setAllOrderHelperRowSelected,
        updateOrderHelperSelectAllButton,
    });
    row.append(selectContainer);

    const applyRegistry = [];

    row.append(buildBulkStateSection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkStrategySection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        getStrategyOptions,
        applyOrderHelperStrategyFilterToRow,
        applyRegistry,
    }));

    const {
        positionContainer,
        depthContainer,
        outletContainer,
        cleanup,
    } = buildBulkPositionSection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        getPositionOptions,
        applyOrderHelperPositionFilterToRow,
        isOutletPosition,
        getOutletOptions,
        applyOrderHelperOutletFilterToRow,
        syncOrderHelperOutletFilters,
        filterIndicatorRefs,
        applyRegistry,
    });
    row.append(positionContainer, depthContainer, outletContainer);

    row.append(buildBulkOrderSection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));

    row.append(buildBulkRecursionSection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyOrderHelperRecursionFilterToRow,
        applyRegistry,
    }));
    row.append(buildBulkBudgetSection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkProbabilitySection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkStickySection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkCooldownSection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkDelaySection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));

    row.append(buildApplyAllSection(applyRegistry));

    wrapRowContent(row);

    return { element: row, refreshSelectionCount, cleanup };
}
