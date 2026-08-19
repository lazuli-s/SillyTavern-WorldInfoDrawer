const ENTRY_FIELD_KEYS = Object.freeze({
  POSITION: 'position',
  DEPTH: 'depth',
  ORDER: 'order',
  TRIGGER: 'trigger',
  STICKY: 'sticky',
  COOLDOWN: 'cooldown',
  DELAY: 'delay',
  AUTOMATION_ID: 'automationId',
});

const EMPTY_TABLE_HEADER_LABEL = '';

export const SORT = {
  TITLE: 'title',

  POSITION: ENTRY_FIELD_KEYS.POSITION,

  DEPTH: ENTRY_FIELD_KEYS.DEPTH,

  ORDER: ENTRY_FIELD_KEYS.ORDER,

  UID: 'uid',

  TRIGGER: ENTRY_FIELD_KEYS.TRIGGER,

  LENGTH: 'length',

  CUSTOM: 'custom',

  ALPHABETICAL: 'alphabetical',

  PROMPT: 'prompt',

  // Ticket 07 — sorts by how many characters + tags the entry's filter stores.
  // Shares the column's persisted key so both name the same thing.
  CHARACTER_FILTER: 'characterFilter',
};

export const SORT_DIRECTION = {
  ASCENDING: 'ascending',

  DESCENDING: 'descending',
};

// R7 — the AND semantics and the group-chat caveat are not discoverable anywhere else.
export const CHARACTER_FILTER_COLUMN_TOOLTIP =
  'Characters and tags are two separate conditions and BOTH must pass. ' +
  'Filtering to character Alice and tag Villain fires only when Alice is active AND Alice carries that tag. ' +
  '--- The tag condition does not apply in group chats.';

export const ENTRY_MANAGER_TOGGLE_COLUMNS = [
  { key: 'strategy', label: 'Strategy' },
  { key: ENTRY_FIELD_KEYS.POSITION, label: 'Position' },
  { key: ENTRY_FIELD_KEYS.DEPTH, label: 'Depth' },
  { key: 'outlet', label: 'Outlet' },
  { key: 'group', label: 'Inclusion Group' },
  { key: ENTRY_FIELD_KEYS.ORDER, label: 'Order' },
  { key: ENTRY_FIELD_KEYS.STICKY, label: 'Sticky' },
  { key: ENTRY_FIELD_KEYS.COOLDOWN, label: 'Cooldown' },
  { key: ENTRY_FIELD_KEYS.DELAY, label: 'Delay' },
  { key: ENTRY_FIELD_KEYS.AUTOMATION_ID, label: 'Automation ID' },
  { key: ENTRY_FIELD_KEYS.TRIGGER, label: 'Trigger %' },
  { key: 'recursion', label: 'Recursion' },
  { key: 'budget', label: 'Budget' },
  // The key stays `characterFilter`: it is persisted in each user's column-visibility
  // settings, so renaming it would reset everyone's toggles (R1).
  {
    key: 'characterFilter',
    label: 'Filter to Characters or Tags',
    tooltip: CHARACTER_FILTER_COLUMN_TOOLTIP,
  },
];

export const ENTRY_MANAGER_TABLE_COLUMNS = [
  { key: 'select', label: EMPTY_TABLE_HEADER_LABEL },
  { key: 'drag', label: EMPTY_TABLE_HEADER_LABEL },
  { key: 'enabled', label: EMPTY_TABLE_HEADER_LABEL },
  { key: 'entry', label: 'Entry' },
  ...ENTRY_MANAGER_TOGGLE_COLUMNS,
];

export const ENTRY_MANAGER_NUMBER_COLUMN_KEYS = new Set([
  ENTRY_FIELD_KEYS.DEPTH,
  ENTRY_FIELD_KEYS.ORDER,
  ENTRY_FIELD_KEYS.STICKY,
  ENTRY_FIELD_KEYS.COOLDOWN,
  ENTRY_FIELD_KEYS.DELAY,
  ENTRY_FIELD_KEYS.AUTOMATION_ID,
  ENTRY_FIELD_KEYS.TRIGGER,
]);

/**
 * R21 — the two values the character/tag column's has/hasn't filter offers.
 * Beside `ENTRY_MANAGER_RECURSION_OPTIONS` because it is the same kind of thing:
 * a small fixed option list for a filter menu, with no dynamic values behind it.
 */
export const CHARACTER_FILTER_PRESENCE_HAS = 'has';
export const CHARACTER_FILTER_PRESENCE_HASNT = 'hasnt';

export const CHARACTER_FILTER_PRESENCE_OPTIONS = Object.freeze([
  Object.freeze({ value: CHARACTER_FILTER_PRESENCE_HAS, label: 'Has a filter' }),
  Object.freeze({ value: CHARACTER_FILTER_PRESENCE_HASNT, label: 'No filter' }),
]);

export const CHARACTER_FILTER_PRESENCE_VALUES = Object.freeze(
  CHARACTER_FILTER_PRESENCE_OPTIONS.map((option) => option.value),
);

export const ENTRY_MANAGER_RECURSION_OPTIONS = [
  { value: 'excludeRecursion', label: 'Non-recursable' },
  { value: 'preventRecursion', label: 'Prevent further recursion' },
  { value: 'delayUntilRecursion', label: 'Delay until recursion' },
];
