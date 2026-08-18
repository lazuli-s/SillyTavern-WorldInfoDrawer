// Leaf scaffolding shared by the book-menu orchestrator and its action
// implementations: generic keyboard support + the menu-item DOM factory.
// Kept dependency-free so both book-list.book-menu.js and
// book-list.book-menu.actions.js can import it without creating a cycle.

export const addKeyboardClickSupport = (target) => {
  target.tabIndex = 0;
  target.addEventListener('keydown', (evt) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      target.click();
    }
  });
};

export const createBookMenuActionItem = ({
  itemClass,
  iconClass,
  labelText,
  onClick,
  enableKeyboard = true,
  attributes = {},
}) => {
  const item = document.createElement('div');
  item.classList.add('stwid--list-dropdown__item', 'stwid--menu-item', itemClass);
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null) {
      item.setAttribute(key, value);
    }
  }
  if (enableKeyboard) {
    addKeyboardClickSupport(item);
  }
  item.addEventListener('click', onClick);

  const itemIcon = document.createElement('i');
  itemIcon.classList.add('stwid--icon', 'fa-solid', 'fa-fw', iconClass);
  item.append(itemIcon);

  const menuLabel = document.createElement('span');
  menuLabel.classList.add('stwid--label');
  menuLabel.textContent = labelText;
  item.append(menuLabel);

  return item;
};
