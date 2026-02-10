// ── Order Helper render utilities ─────────────────────────────────────────────
// Shared helpers used across orderHelperRender.* slice files.
// These functions are self-contained: they depend only on browser globals
// (document, HTMLElement) and each other — no factory parameters needed.

// Property key used to attach a programmatic close function to each open menu
// element so closeOpenMultiselectDropdownMenus can close them uniformly.
export const MULTISELECT_DROPDOWN_CLOSE_HANDLER = 'stwidCloseMultiselectDropdownMenu';

export const setTooltip = (element, text, { ariaLabel = null } = {})=>{
    if (!element || !text) return;
    element.title = text;
    const label = ariaLabel ?? text.replace(/\s*---\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (label) {
        element.setAttribute('aria-label', label);
    }
};

export const setMultiselectDropdownOptionCheckboxState = (checkbox, isChecked)=>{
    if (!checkbox) return;
    checkbox.classList.toggle('fa-square-check', Boolean(isChecked));
    checkbox.classList.toggle('fa-square', !isChecked);
};

export const createMultiselectDropdownCheckbox = (checked = false)=>{
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.tabIndex = -1;
    input.classList.add('stwid--multiselectDropdownOptionInput');
    const checkbox = document.createElement('i');
    checkbox.classList.add('fa-solid', 'fa-fw', 'stwid--multiselectDropdownOptionCheckbox');
    const setChecked = (isChecked)=>{
        input.checked = Boolean(isChecked);
        setMultiselectDropdownOptionCheckboxState(checkbox, input.checked);
    };
    input.addEventListener('change', ()=>{
        setMultiselectDropdownOptionCheckboxState(checkbox, input.checked);
    });
    setChecked(checked);
    return {
        input,
        checkbox,
        setChecked,
    };
};

export const closeOpenMultiselectDropdownMenus = (excludeMenu = null)=>{
    for (const menu of document.querySelectorAll('.stwid--multiselectDropdownMenu.stwid--active')) {
        if (menu === excludeMenu) continue;
        const closeMenu = menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
        if (typeof closeMenu === 'function') {
            closeMenu();
            continue;
        }
        menu.classList.remove('stwid--active');
        const trigger = menu.parentElement?.querySelector('.stwid--multiselectDropdownButton');
        trigger?.setAttribute('aria-expanded', 'false');
    }
};

// Wires open/close/outside-click behavior for any multiselect dropdown menu.
// Registers a close function on the menu element so closeOpenMultiselectDropdownMenus
// can close it externally. Stops click propagation inside the menu so outside-click
// detection works correctly. Returns the closeMenu function for callers that need it
// (e.g. to close after a preset action).
export const wireMultiselectDropdown = (menu, menuButton, menuWrap)=>{
    const closeMenu = ()=>{
        if (!menu.classList.contains('stwid--active')) return;
        menu.classList.remove('stwid--active');
        document.removeEventListener('click', handleOutsideClick);
    };
    const openMenu = ()=>{
        if (menu.classList.contains('stwid--active')) return;
        closeOpenMultiselectDropdownMenus(menu);
        menu.classList.add('stwid--active');
        document.addEventListener('click', handleOutsideClick);
    };
    const handleOutsideClick = (event)=>{
        if (menuWrap.contains(event.target)) return;
        closeMenu();
    };
    menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER] = closeMenu;
    menu.addEventListener('click', (event)=>event.stopPropagation());
    menuButton.addEventListener('click', (event)=>{
        event.stopPropagation();
        if (menu.classList.contains('stwid--active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });
    return closeMenu;
};

export const formatCharacterFilter = (entry)=>{
    const filter = entry?.characterFilter;
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return [];
    const lines = [];
    if (Array.isArray(filter.names) && filter.names.length > 0) {
        lines.push(...filter.names.map((name)=>({
            icon: filter.isExclude ? 'fa-user-slash' : 'fa-user-plus',
            mode: filter.isExclude ? 'exclude' : 'include',
            label: name,
        })));
    }
    if (Array.isArray(filter.tags) && filter.tags.length > 0) {
        const tags = globalThis.SillyTavern?.getContext?.().tags ?? [];
        const tagNames = tags.length
            ? tags.filter((tag)=>filter.tags.includes(tag.id)).map((tag)=>tag.name)
            : filter.tags.map((tag)=>String(tag));
        if (tagNames.length > 0) {
            lines.push(...tagNames.map((tag)=>({
                icon: 'fa-tag',
                mode: filter.isExclude ? 'exclude' : 'include',
                label: tag,
            })));
        }
    }
    if (!lines.length) {
        return [];
    }
    return lines;
};
