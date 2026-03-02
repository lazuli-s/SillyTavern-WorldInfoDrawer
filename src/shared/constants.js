

export const SORT = {
    
    TITLE: 'title',
    
    POSITION: 'position',
    
    DEPTH: 'depth',
    
    ORDER: 'order',
    
    UID: 'uid',
    
    TRIGGER: 'trigger',
    
    LENGTH: 'length',
    
    CUSTOM: 'custom',
    
    ALPHABETICAL: 'alphabetical',
    
    PROMPT: 'prompt',
};


export const SORT_DIRECTION = {
    
    ASCENDING: 'ascending',
    
    DESCENDING: 'descending',
};








export const ORDER_HELPER_TOGGLE_COLUMNS = [
    { key: 'strategy',        label: 'Strategy' },
    { key: 'position',        label: 'Position' },
    { key: 'depth',           label: 'Depth' },
    { key: 'outlet',          label: 'Outlet' },
    { key: 'group',           label: 'Inclusion Group' },
    { key: 'order',           label: 'Order' },
    { key: 'sticky',          label: 'Sticky' },
    { key: 'cooldown',        label: 'Cooldown' },
    { key: 'delay',           label: 'Delay' },
    { key: 'automationId',    label: 'Automation ID' },
    { key: 'trigger',         label: 'Trigger %' },
    { key: 'recursion',       label: 'Recursion' },
    { key: 'budget',          label: 'Budget' },
    { key: 'characterFilter', label: 'Character Filter' },
];


export const ORDER_HELPER_TABLE_COLUMNS = [
    { key: 'select',  label: '' },
    { key: 'drag',    label: '' },
    { key: 'enabled', label: '' },
    { key: 'entry',   label: 'Entry' },
    ...ORDER_HELPER_TOGGLE_COLUMNS,
];


export const ORDER_HELPER_NUMBER_COLUMN_KEYS = new Set([
    'depth',
    'order',
    'sticky',
    'cooldown',
    'delay',
    'automationId',
    'trigger',
]);


export const ORDER_HELPER_RECURSION_OPTIONS = [
    { value: 'excludeRecursion',    label: 'Non-recursable' },
    { value: 'preventRecursion',    label: 'Prevent further recursion' },
    { value: 'delayUntilRecursion', label: 'Delay until recursion' },
];
