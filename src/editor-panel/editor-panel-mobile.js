export const MOBILE_EDITOR_MEDIA_QUERY = '(max-width: 1000px)';
const FLAGS_ROW_CLASS = 'stwid--editorContentFlagsRow';
const GROUP_ROW_SELECTOR =
  ".inline-drawer-content > .world_entry_edit > .flex-container.wide100p.flexGap10:has([name='group'])";
const EDITOR_HEADER_SELECTOR =
  '.world_entry > .world_entry_form > .inline-drawer > .inline-drawer-header';
const CONTENT_CONTROL_SELECTOR = "[name='contentAndCharFilterBlock'] > .world_entry_form_control";

/** The entry editor's header row: toggle, title box, Strategy, the header controls and the actions. */
const getEditorHeader = (editDom) => editDom.querySelector(EDITOR_HEADER_SELECTOR);

const findToggleByName = (editDom, name) =>
  editDom.querySelector(`.${FLAGS_ROW_CLASS} label:has(input[name='${name}'])`) ??
  editDom.querySelector(`label:has(input[name='${name}'])`);

const resolveMobileContentControls = (editDom) => {
  const contentControl = editDom.querySelector(CONTENT_CONTROL_SELECTOR);
  return {
    contentControl,
    contentMetaRow: contentControl?.querySelector('label > small > span'),
    contentTextarea: contentControl?.querySelector("textarea[name='content']"),
  };
};

const shouldUseMobileEditorLayout = () => {
  return window.matchMedia?.(MOBILE_EDITOR_MEDIA_QUERY)?.matches ?? false;
};

/** A header title's text without the host's trailing colon ("Position:" → "Position"). */
export const stripHeaderTitleColon = (text) => text.replace(/:\s*$/, '');

/** A header field title minted by this extension, at every width. */
export const createEditorHeaderLabel = (text) => {
  const label = document.createElement('small');
  label.classList.add('textAlignCenter', 'stwid--editor-header-label');
  label.textContent = stripHeaderTitleColon(text);
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

  const label = createEditorHeaderLabel(existingLabel.textContent ?? '');
  existingLabel.remove();
  control.prepend(label);
  return control;
};

const moveMobileContextualHeaderControls = (editDom) => {
  const header = getEditorHeader(editDom);
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

  // The actions are loose buttons on a first open, or already the titled Actions
  // field when the editor crosses into this layout from desktop.
  const firstHeaderAction = header.querySelector(
    ':scope > :is(.menu_button, .stwid--editor-actions)',
  );
  if (firstHeaderAction) {
    header.insertBefore(contextRow, firstHeaderAction);
    return;
  }

  header.append(contextRow);
};

/**
 * The row holding the header's move / duplicate / delete buttons, grouped once
 * at the end of the header and reused afterwards; `null` when the host renders
 * no buttons.
 */
export const ensureHeaderActionsRow = (editDom) => {
  const header = getEditorHeader(editDom);
  if (!header) return null;
  const existingRow = header.querySelector('.stwid--editor-actions-row');
  if (existingRow) return existingRow;

  const actionButtons = Array.from(header.querySelectorAll(':scope > .menu_button'));
  if (!actionButtons.length) return null;

  const actionsRow = document.createElement('div');
  actionsRow.classList.add('stwid--editor-actions-row');
  actionsRow.append(...actionButtons);
  header.append(actionsRow);
  return actionsRow;
};

const moveMobileContentFlags = (editDom) => {
  const { contentControl, contentMetaRow, contentTextarea } = resolveMobileContentControls(editDom);
  const flagsContainer = contentMetaRow?.querySelector(':scope > .flex-container:last-child');
  if (
    !contentControl ||
    !contentMetaRow ||
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
  const { contentControl, contentMetaRow, contentTextarea } = resolveMobileContentControls(editDom);
  if (!contentControl || !contentMetaRow || !contentTextarea) return;

  contentMetaRow.classList.add('stwid--editor-content-header-row');

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
  const recursionSection = contentSettingsSection?.querySelector(
    '.stwid--editor-recursion-section',
  );
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
  titleControl.append(createEditorHeaderLabel('Title'), titleTextarea);

  topRow.append(toggleSlot, titleControl);

  const strategyControl = document.createElement('div');
  strategyControl.classList.add('world_entry_form_control', 'stwid--editor-header-strategy');
  strategyControl.append(createEditorHeaderLabel('Strategy'), strategySelect);

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
  ensureHeaderActionsRow(editDom);
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
