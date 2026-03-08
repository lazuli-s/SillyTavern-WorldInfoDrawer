

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
};


export const SORT_DIRECTION = {
    
    ASCENDING: 'ascending',
    
    DESCENDING: 'descending',
};








export const ENTRY_MANAGER_TOGGLE_COLUMNS = [
    { key: 'strategy',        label: 'Strategy' },
    { key: ENTRY_FIELD_KEYS.POSITION, label: 'Position' },
    { key: ENTRY_FIELD_KEYS.DEPTH,    label: 'Depth' },
    { key: 'outlet',          label: 'Outlet' },
    { key: 'group',           label: 'Inclusion Group' },
    { key: ENTRY_FIELD_KEYS.ORDER,         label: 'Order' },
    { key: ENTRY_FIELD_KEYS.STICKY,        label: 'Sticky' },
    { key: ENTRY_FIELD_KEYS.COOLDOWN,      label: 'Cooldown' },
    { key: ENTRY_FIELD_KEYS.DELAY,         label: 'Delay' },
    { key: ENTRY_FIELD_KEYS.AUTOMATION_ID, label: 'Automation ID' },
    { key: ENTRY_FIELD_KEYS.TRIGGER,       label: 'Trigger %' },
    { key: 'recursion',       label: 'Recursion' },
    { key: 'budget',          label: 'Budget' },
    { key: 'characterFilter', label: 'Character Filter' },
];


export const ENTRY_MANAGER_TABLE_COLUMNS = [
    { key: 'select',  label: EMPTY_TABLE_HEADER_LABEL },
    { key: 'drag',    label: EMPTY_TABLE_HEADER_LABEL },
    { key: 'enabled', label: EMPTY_TABLE_HEADER_LABEL },
    { key: 'entry',   label: 'Entry' },
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


export const ENTRY_MANAGER_RECURSION_OPTIONS = [
    { value: 'excludeRecursion',    label: 'Non-recursable' },
    { value: 'preventRecursion',    label: 'Prevent further recursion' },
    { value: 'delayUntilRecursion', label: 'Delay until recursion' },
];
