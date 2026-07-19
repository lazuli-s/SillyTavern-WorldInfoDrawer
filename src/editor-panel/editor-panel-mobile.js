const MOBILE_EDITOR_MEDIA_QUERY = '(max-width: 1000px)';
const FLAGS_ROW_CLASS = 'stwid--editorContentFlagsRow';
const GROUP_ROW_SELECTOR =
  ".inline-drawer-content > .world_entry_edit > .flex-container.wide100p.flexGap10:has([name='group'])";

const findToggleByName = (editDom, name) =>
  editDom.querySelector(`.${FLAGS_ROW_CLASS} label:has(input[name='${name}'])`) ??
  editDom.querySelector(`label:has(input[name='${name}'])`);

const shouldUseMobileEditorLayout = () => {
  return window.matchMedia?.(MOBILE_EDITOR_MEDIA_QUERY)?.matches ?? false;
};

const createMobileHeaderLabel = (text) => {
  const label = document.createElement('small');
  label.classList.add('textAlignCenter', 'stwid--editor-header-label');
  label.textContent = text.replace(/:\s*$/, '');
  return label;
};

const normalizeMobileHeaderControl = (control) => {
  control.classList.add('stwid--editorHeaderControl');
  control.classList.remove(
    'wi-enter-footer-text',
    'flex-container',
    'flexNoGap',
    'world_entry_form_radios',
    'probabilityContainer',
  );
  const existingLabel = control.querySelector('.WIEntryHeaderTitleMobile');
  if (!existingLabel || control.querySelector('.stwid--editor-header-label')) return control;

  const label = createMobileHeaderLabel(existingLabel.textContent ?? '');
  existingLabel.remove();
  control.prepend(label);
  return control;
};

const moveMobileContextualHeaderControls = (editDom) => {
  const header = editDom.querySelector(
    '.world_entry > .world_entry_form > .inline-drawer > .inline-drawer-header',
  );
  const positionControl = editDom.querySelector(
    ".WIEnteryHeaderControls > .world_entry_form_control[name='PositionBlock']",
  );
  const depthControl = editDom.querySelector(
    ".WIEnteryHeaderControls > .world_entry_form_control:has(input[name='depth'])",
  );
  const outletControl = editDom.querySelector(
    "[name='perEntryOverridesBlock'] > .world_entry_form_control:has([name='outletName'])",
  );
  if (
    !header ||
    !positionControl ||
    !depthControl ||
    !outletControl ||
    header.querySelector('.stwid--editor-header-context-row')
  )
    return;

  const contextRow = document.createElement('div');
  contextRow.classList.add('stwid--editor-header-context-row');

  positionControl.classList.add('stwid--editor-header-context-position');
  depthControl.classList.add('stwid--editor-header-context-depth');
  outletControl.classList.add('stwid--editor-header-context-outlet');
  contextRow.append(positionControl, depthControl, outletControl);

  const firstHeaderButton = header.querySelector(':scope > .menu_button');
  if (firstHeaderButton) {
    header.insertBefore(contextRow, firstHeaderButton);
    return;
  }

  header.append(contextRow);
};

const moveMobileHeaderActions = (editDom) => {
  const header = editDom.querySelector(
    '.world_entry > .world_entry_form > .inline-drawer > .inline-drawer-header',
  );
  if (!header || header.querySelector('.stwid--editor-actions-row')) return;

  const actionButtons = Array.from(header.querySelectorAll(':scope > .menu_button'));
  if (!actionButtons.length) return;

  const actionsRow = document.createElement('div');
  actionsRow.classList.add('stwid--editor-actions-row');
  actionsRow.append(...actionButtons);
  header.append(actionsRow);
};

const moveMobileContentFlags = (editDom) => {
  const contentControl = editDom.querySelector(
    "[name='contentAndCharFilterBlock'] > .world_entry_form_control",
  );
  const contentMeta = contentControl?.querySelector('label > small > span');
  const flagsContainer = contentMeta?.querySelector(':scope > .flex-container:last-child');
  const contentTextarea = contentControl?.querySelector("textarea[name='content']");
  if (
    !contentControl ||
    !contentMeta ||
    !flagsContainer ||
    !contentTextarea ||
    contentControl.querySelector(`.${FLAGS_ROW_CLASS}`)
  )
    return;

  const flagsRow = document.createElement('div');
  flagsRow.classList.add(FLAGS_ROW_CLASS, 'stwid--editor-content-flags-section');
  flagsRow.append(...Array.from(flagsContainer.children));
  flagsContainer.remove();
  contentTextarea.insertAdjacentElement('afterend', flagsRow);
};

const annotateMobileContentSections = (editDom) => {
  const contentControl = editDom.querySelector(
    "[name='contentAndCharFilterBlock'] > .world_entry_form_control",
  );
  const contentHeaderRow = contentControl?.querySelector('label > small > span');
  const contentTextarea = contentControl?.querySelector("textarea[name='content']");
  if (!contentControl || !contentHeaderRow || !contentTextarea) return;

  contentHeaderRow.classList.add('stwid--editor-content-header-row');

  if (!contentControl.querySelector('.stwid--editor-content-body-section')) {
    const contentBodySection = document.createElement('div');
    contentBodySection.classList.add('stwid--editor-content-body-section');
    contentTextarea.insertAdjacentElement('beforebegin', contentBodySection);
    contentBodySection.append(contentTextarea);
  }

  contentControl
    .querySelector(`.${FLAGS_ROW_CLASS}`)
    ?.classList.add('stwid--editor-content-flags-section');
};

const ensureMobileContentSettingsSection = (editDom) => {
  const contentBlock = editDom.querySelector("[name='contentAndCharFilterBlock']");
  if (!contentBlock) return null;

  const existingSection = editDom.querySelector('.stwid--editor-content-settings-section');
  if (existingSection) return existingSection;

  const settingsSection = document.createElement('div');
  settingsSection.classList.add('stwid--editor-content-settings-section');
  contentBlock.insertAdjacentElement('afterend', settingsSection);
  return settingsSection;
};

const moveMobileRecursionControls = (editDom) => {
  const contentSettingsSection = ensureMobileContentSettingsSection(editDom);
  const overridesBlock = editDom.querySelector("[name='perEntryOverridesBlock']");
  const recursionLevelControl = overridesBlock?.querySelector(
    ":scope > .world_entry_form_control:has([name='delayUntilRecursionLevel'])",
  );
  const delayUntilRecursionToggle = findToggleByName(editDom, 'delay_until_recursion');
  if (
    !contentSettingsSection ||
    !recursionLevelControl ||
    !delayUntilRecursionToggle ||
    contentSettingsSection.querySelector('.stwid--editor-recursion-section')
  )
    return;

  const recursionSection = document.createElement('div');
  recursionSection.classList.add(
    'stwid--editor-recursion-section',
    'stwid--editorRecursionSettingsSection',
  );

  const recursionDelayRow = document.createElement('div');
  recursionDelayRow.classList.add('stwid--editor-recursion-delay-row');

  const recursionToggleRow = document.createElement('div');
  recursionToggleRow.classList.add('stwid--editor-recursion-toggle-row');
  recursionToggleRow.append(delayUntilRecursionToggle);

  recursionLevelControl.classList.add('stwid--editor-recursion-level-control');
  recursionDelayRow.append(recursionToggleRow, recursionLevelControl);
  recursionSection.append(recursionDelayRow);
  contentSettingsSection.append(recursionSection);
};

const moveMobileRecursionGuardControls = (editDom) => {
  const contentSettingsSection = ensureMobileContentSettingsSection(editDom);
  const recursionSection = contentSettingsSection?.querySelector('.stwid--editor-recursion-section');
  const excludeRecursionToggle = findToggleByName(editDom, 'excludeRecursion');
  const preventRecursionToggle = findToggleByName(editDom, 'preventRecursion');
  if (
    !recursionSection ||
    !excludeRecursionToggle ||
    !preventRecursionToggle ||
    recursionSection.querySelector('.stwid--editor-recursion-guards-row')
  )
    return;

  const guardsRow = document.createElement('div');
  guardsRow.classList.add('stwid--editor-recursion-guards-row');
  guardsRow.append(excludeRecursionToggle, preventRecursionToggle);
  recursionSection.prepend(guardsRow);
};

const moveMobileBudgetControl = (editDom) => {
  const contentSettingsSection = ensureMobileContentSettingsSection(editDom);
  const ignoreBudgetToggle = findToggleByName(editDom, 'ignoreBudget');
  if (
    !contentSettingsSection ||
    !ignoreBudgetToggle ||
    contentSettingsSection.querySelector('.stwid--editor-budget-row')
  )
    return;

  const budgetRow = document.createElement('div');
  budgetRow.classList.add('stwid--editor-budget-row');
  budgetRow.append(ignoreBudgetToggle);
  contentSettingsSection.prepend(budgetRow);
};

const cleanupMobileContentFlags = (editDom) => {
  const flagsRow = editDom.querySelector(`.${FLAGS_ROW_CLASS}`);
  if (!flagsRow) return;

  Array.from(flagsRow.children)
    .filter((child) => child instanceof HTMLElement && !child.querySelector('label'))
    .forEach((child) => child.remove());

  if (!flagsRow.querySelector('label')) {
    flagsRow.remove();
  }
};

const moveMobileRecursionMetaControls = (editDom) => {
  const overridesBlock = editDom.querySelector("[name='perEntryOverridesBlock']");
  if (!overridesBlock || overridesBlock.querySelector('.stwid--editor-recursion-meta-row')) return;

  const scanDepthControl = overridesBlock.querySelector(
    ":scope > .world_entry_form_control:has([name='scanDepth'])",
  );
  const caseSensitiveControl = overridesBlock.querySelector(
    ":scope > .world_entry_form_control:has([name='caseSensitive'])",
  );
  const wholeWordsControl = overridesBlock.querySelector(
    ":scope > .world_entry_form_control:has([name='matchWholeWords'])",
  );
  const automationIdControl = overridesBlock.querySelector(
    ":scope > .world_entry_form_control:has([name='automationId'])",
  );
  const recursionMetaControls = [scanDepthControl, caseSensitiveControl, wholeWordsControl].filter(
    Boolean,
  );
  if (!recursionMetaControls.length) return;

  const recursionMetaRow = document.createElement('div');
  recursionMetaRow.classList.add('stwid--editor-recursion-meta-row');
  recursionMetaRow.append(...recursionMetaControls);

  if (automationIdControl) {
    overridesBlock.insertBefore(recursionMetaRow, automationIdControl);
    return;
  }

  overridesBlock.append(recursionMetaRow);
};

const moveMobileGroupControls = (editDom) => {
  const groupRow = editDom.querySelector(GROUP_ROW_SELECTOR);
  const inclusionGroupControl = groupRow?.querySelector(':scope > :has([name="group"])');
  const groupWeightControl = groupRow?.querySelector(':scope > :has([name="groupWeight"])');
  const groupScoringControl = editDom.querySelector(
    "[name='perEntryOverridesBlock'] > .world_entry_form_control:has([name='useGroupScoring'])",
  );
  if (
    !groupRow ||
    !inclusionGroupControl ||
    !groupWeightControl ||
    !groupScoringControl ||
    groupRow.querySelector('.stwid--editor-group-section')
  )
    return;

  const groupSection = document.createElement('div');
  groupSection.classList.add('stwid--editor-group-section');

  const primaryRow = document.createElement('div');
  primaryRow.classList.add('stwid--editor-group-section-primary');
  primaryRow.append(inclusionGroupControl);

  const secondaryRow = document.createElement('div');
  secondaryRow.classList.add('stwid--editor-group-section-secondary');
  secondaryRow.append(groupWeightControl, groupScoringControl);

  groupSection.append(primaryRow, secondaryRow);
  groupRow.prepend(groupSection);
};

const moveMobileTimingControls = (editDom) => {
  const groupRow = editDom.querySelector(GROUP_ROW_SELECTOR);
  if (!groupRow || groupRow.querySelector('.stwid--editor-timing-row')) return;

  const stickyControl = groupRow.querySelector(":scope > :has([name='sticky'])");
  const cooldownControl = groupRow.querySelector(":scope > :has([name='cooldown'])");
  const delayControl = groupRow.querySelector(":scope > :has([name='delay'])");
  const timingControls = [stickyControl, cooldownControl, delayControl].filter(Boolean);
  if (!timingControls.length) return;

  const timingRow = document.createElement('div');
  timingRow.classList.add('stwid--editor-timing-row');
  timingRow.append(...timingControls);
  groupRow.append(timingRow);
};

const annotateMobileKeywordsAndFiltersSection = (editDom) => {
  const keywordsAndFiltersSection = editDom.querySelector("[name='keywordsAndLogicBlock']");
  keywordsAndFiltersSection?.classList.add('stwid--editor-keywords-and-filters-section');
};

const annotateMobileFilterSections = (editDom) => {
  const filtersRow = editDom.querySelector(
    ".inline-drawer-content > .world_entry_edit > .flex-container.wide100p.flexGap10:has([name='characterFilter'], [name='triggers'])",
  );
  const characterTagFilterSection = filtersRow?.querySelector(
    ":scope > :has([name='characterFilter'])",
  );
  const triggerFilterSection = filtersRow?.querySelector(":scope > :has([name='triggers'])");

  characterTagFilterSection?.classList.add('stwid--editor-character-tag-filter-section');
  triggerFilterSection?.classList.add('stwid--editor-trigger-filter-section');
};

const buildMobileEditorTitleBar = (
  headerContent,
  titleTextarea,
  headerControls,
  strategySelect,
  killSwitch,
) => {
  const topRow = document.createElement('div');
  topRow.classList.add('stwid--editor-title-row');

  const toggleSlot = document.createElement('div');
  toggleSlot.classList.add('stwid--editor-header-toggle-slot');
  toggleSlot.append(killSwitch);

  const titleControl = document.createElement('div');
  titleControl.classList.add('world_entry_form_control', 'stwid--editor-header-title-control');
  titleTextarea.rows = 2;
  titleControl.append(createMobileHeaderLabel('Title/Memo'), titleTextarea);

  topRow.append(toggleSlot, titleControl);

  const strategyControl = document.createElement('div');
  strategyControl.classList.add('world_entry_form_control', 'stwid--editor-header-strategy');
  strategyControl.append(createMobileHeaderLabel('Strategy'), strategySelect);

  headerControls.classList.add('stwid--editor-main-settings-row');
  headerControls.prepend(strategyControl);
  Array.from(headerControls.children)
    .filter(
      (child) =>
        child instanceof HTMLElement && child.classList.contains('world_entry_form_control'),
    )
    .forEach((child) => normalizeMobileHeaderControl(child));

  headerContent.replaceChildren(topRow, headerControls);
};

export const applyMobileHeaderLayout = (editDom) => {
  if (!shouldUseMobileEditorLayout()) return;

  const thinControls = editDom.querySelector('.world_entry_thin_controls');
  const headerContent = thinControls?.querySelector('.flex-container.alignitemscenter.wide100p');
  const titleAndStatus = editDom.querySelector('.WIEntryTitleAndStatus');
  const titleTextarea = titleAndStatus?.querySelector("textarea[name='comment']");
  const headerControls = editDom.querySelector('.WIEnteryHeaderControls');
  const strategySelect = titleAndStatus?.querySelector?.("select[name='entryStateSelector']");
  const killSwitch = thinControls?.querySelector('.killSwitch');
  if (
    !thinControls ||
    !headerContent ||
    !titleAndStatus ||
    !titleTextarea ||
    !headerControls ||
    !strategySelect ||
    !killSwitch
  )
    return;
  if (thinControls.querySelector('.stwid--editor-title-row')) return;

  titleAndStatus.remove();
  buildMobileEditorTitleBar(
    headerContent,
    titleTextarea,
    headerControls,
    strategySelect,
    killSwitch,
  );
  moveMobileContextualHeaderControls(editDom);
  moveMobileHeaderActions(editDom);
  moveMobileContentFlags(editDom);
  annotateMobileContentSections(editDom);
  moveMobileRecursionControls(editDom);
  moveMobileRecursionGuardControls(editDom);
  moveMobileBudgetControl(editDom);
  cleanupMobileContentFlags(editDom);
  moveMobileRecursionMetaControls(editDom);
  moveMobileGroupControls(editDom);
  moveMobileTimingControls(editDom);
  annotateMobileKeywordsAndFiltersSection(editDom);
  annotateMobileFilterSections(editDom);
};
