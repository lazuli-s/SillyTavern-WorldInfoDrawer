// Builds the "dropdown sync" option lists for filters whose values are derived
// from loaded entries rather than a fixed enum (outlet, automationId, group).
// Pure logic, no SillyTavern host import — kept host-free on purpose so it can
// be loaded directly in tests (see entry-manager.js for why this was split out).

// A NUL-prefixed sentinel, so it can never collide with a real book name. Written
// as an escape rather than a raw NUL byte, which would make this file unreadable
// to grep and undiffable in git.
export const DYNAMIC_OPTION_DEFAULT_KEY = '\u0000default';

export function buildDynamicOptions(entries, getValueFn, noneValue) {
  const values = new Set();
  for (const entry of entries) {
    const result = getValueFn(entry.data);
    if (Array.isArray(result)) {
      for (const optionValue of result) values.add(optionValue);
    } else {
      values.add(result);
    }
  }
  const labels = [...values].filter((optionValue) => optionValue !== noneValue);
  labels.sort((a, b) => a.localeCompare(b));
  return [
    { value: noneValue, label: '(none)' },
    ...labels.map((label) => ({ value: label, label })),
  ];
}

export const createDynamicOptionAccessors = ({ getEntries, getValueForEntry, noneValue }) => {
  // Tick-scoped memo: within one user action (a render, or a bulk apply that
  // calls sync*Filters), the same option list is requested many times over an
  // unchanged entry set. Cache it for the current synchronous burst, then drop
  // it on the next microtask so it can never serve values from a mutated (post-
  // edit) entry state. This deliberately avoids a persistent cache, which would
  // need invalidation at every entry-mutation site (spread across other modules)
  // and go stale on any missed one.
  let memo = null;
  const scheduleMemoClear = () => {
    memo = new Map();
    queueMicrotask(() => {
      memo = null;
    });
  };
  const getOptions = (book) => {
    const key = book ?? DYNAMIC_OPTION_DEFAULT_KEY;
    if (memo?.has(key)) return memo.get(key);
    const options = buildDynamicOptions(getEntries(book), getValueForEntry, noneValue);
    if (!memo) scheduleMemoClear();
    memo.set(key, options);
    return options;
  };
  const getValues = (book) => getOptions(book).map((option) => option.value);
  return { getOptions, getValues };
};
