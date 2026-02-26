# ST Extension JS Patterns Reference

Concrete good/bad code examples for each rule. Use these when illustrating a violation or generating corrected code.

---

## Security

### SEC-01 — No secrets in extensionSettings

Extension settings are accessible to all other extensions and are stored in **plain text**. Never put API keys, tokens, or passwords there.

```js
// BAD
extensionSettings[MODULE_NAME].apiKey = 'secret_key_123';
extensionSettings[MODULE_NAME].password = userEnteredPassword;

// GOOD — there is no secure client-side secret storage.
// If secrets are needed, use a server plugin instead:
// https://docs.sillytavern.app/for-contributors/server-plugins/
```

---

### SEC-02 — Sanitize user inputs with DOMPurify

Always validate type first, then sanitize with DOMPurify before inserting into the DOM or using in API calls.

```js
// BAD — raw user input injected into DOM
element.innerHTML = userInput;

// ALSO BAD — skipping type check
const { DOMPurify } = SillyTavern.libs;
element.innerHTML = DOMPurify.sanitize(userInput); // still risky if userInput isn't a string

// GOOD
if (typeof userInput !== 'string') {
    toastr.error('Invalid input type');
    return;
}
const { DOMPurify } = SillyTavern.libs;
const cleanInput = DOMPurify.sanitize(userInput);
element.innerHTML = cleanInput;
```

---

### SEC-03 — No eval() or Function() constructors

These execute arbitrary code and pose a serious security risk. Use explicit, data-driven alternatives.

```js
// BAD
eval(userCode);
const fn = new Function('a', 'b', 'return a + b');

// GOOD — use explicit lookup tables or switch statements instead
const handlers = {
    greet: (name) => `Hello, ${name}`,
    farewell: (name) => `Goodbye, ${name}`,
};
const result = handlers[actionName]?.(arg);
```

---

## Performance

### PERF-01 — Use localforage for large data, not extensionSettings

`extensionSettings` is loaded into memory on startup and **saved to the server on every change**. Large data causes network overhead and memory pressure.

```js
// BAD — megabytes of data in extensionSettings
extensionSettings[MODULE_NAME].largeDataset = { /* megabytes of data */ };

// GOOD — use localforage (IndexedDB abstraction) for large data
const { localforage } = SillyTavern.libs;
await localforage.setItem(`${MODULE_NAME}_data`, largeData);
const data = await localforage.getItem(`${MODULE_NAME}_data`);

// ALSO GOOD — use localStorage for small, non-sensitive data
localStorage.setItem(`${MODULE_NAME}_pref`, JSON.stringify(smallData));
const pref = JSON.parse(localStorage.getItem(`${MODULE_NAME}_pref`) ?? 'null');
```

---

### PERF-02 — Clean up event listeners

Failing to remove listeners causes memory leaks and phantom handlers that fire after the component is gone.

```js
// BAD — listener added, never removed
const { eventSource, event_types } = SillyTavern.getContext();
eventSource.on(event_types.MESSAGE_RECEIVED, handleMessage);

// GOOD — keep a reference and clean up
const { eventSource, event_types } = SillyTavern.getContext();
eventSource.on(event_types.MESSAGE_RECEIVED, handleMessage);

function cleanup() {
    eventSource.removeListener(event_types.MESSAGE_RECEIVED, handleMessage);
    document.getElementById('myElement')?.removeEventListener('click', handleClick);
}

// Call cleanup() when the feature is torn down or the extension is disabled.
```

---

### PERF-03 — Don't block the UI thread

Heavy synchronous loops freeze the browser. Use async/await for I/O and yield in CPU-heavy loops.

```js
// BAD — synchronous heavy computation
function processAllEntries(entries) {
    for (const entry of entries) {
        expensiveOperation(entry); // blocks UI for entire loop
    }
}

// GOOD — yield to the browser every 1000 iterations
async function processAllEntries(entries) {
    for (let i = 0; i < entries.length; i++) {
        expensiveOperation(entries[i]);
        if (i % 1000 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0)); // yield to UI
        }
    }
}

// GOOD — async I/O
async function loadData() {
    const response = await fetch('/api/data');
    return response.json();
}
```

---

## API Compatibility

### COMPAT-01 — Prefer getContext() over direct ST imports

Direct imports from ST source files (`script.js`, `extensions.js`, etc.) may break when SillyTavern is updated. The context API is the stable, documented surface.

```js
// AVOID — brittle direct imports
import { chat, characters } from '../../../../script.js';
import { saveSettingsDebounced } from '../../../../script.js';

// GOOD — stable context API
const { chat, characters, saveSettingsDebounced } = SillyTavern.getContext();
```

**Exception:** Some functions are only available via direct import (e.g., `generateQuietPrompt`). In those cases, prefer importing from the most specific module and document the reason.

---

### COMPAT-02 — Use a unique, descriptive MODULE_NAME

The `MODULE_NAME` constant is the key used in `extensionSettings`. A generic name will collide with another extension's settings, corrupting both.

```js
// BAD — too generic
const MODULE_NAME = 'settings';
const MODULE_NAME = 'data';
const MODULE_NAME = 'extension';

// GOOD — specific and unique
const MODULE_NAME = 'worldinfo_drawer';
const MODULE_NAME = 'my_extension_v2';
```

---

### COMPAT-03 — Always initialize settings with defaults and backfill

New keys added in updates must be backfilled for users who already have saved settings. Use `lodash.merge` or manual key iteration.

```js
// BAD — no defaults, no backfill
function loadSettings() {
    return extensionSettings[MODULE_NAME] ?? {};
}

// GOOD — frozen defaults + lodash.merge backfill
const defaultSettings = Object.freeze({
    enabled: false,
    option1: 'default',
    option2: 5,
});

function loadSettings() {
    extensionSettings[MODULE_NAME] = SillyTavern.libs.lodash.merge(
        structuredClone(defaultSettings),
        extensionSettings[MODULE_NAME],
    );
    return extensionSettings[MODULE_NAME];
}

// ALSO GOOD — manual key iteration (if lodash not desired)
function loadSettings() {
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(extensionSettings[MODULE_NAME], key)) {
            extensionSettings[MODULE_NAME][key] = defaultSettings[key];
        }
    }
    return extensionSettings[MODULE_NAME];
}
```

---

### COMPAT-04 — Use structuredClone() when mutating interceptor chat data

The `chat` array passed to prompt interceptors is **mutable and live**. Direct mutation changes the real chat history. Use `structuredClone()` for ephemeral modifications.

```js
// BAD — mutates the live chat history
globalThis.myInterceptor = async function(chat, contextSize, abort, type) {
    chat[chat.length - 1].mes += '\n[Appended by extension]'; // permanent side-effect!
};

// GOOD — clone the message before modifying
globalThis.myInterceptor = async function(chat, contextSize, abort, type) {
    const lastMessage = structuredClone(chat[chat.length - 1]);
    lastMessage.mes += '\n[Appended by extension]';
    chat[chat.length - 1] = lastMessage; // still modifies array, but original object preserved
};

// GOOD — inserting an ephemeral system note (safe, adds to array without mutating existing objects)
globalThis.myInterceptor = async function(chat, contextSize, abort, type) {
    const systemNote = {
        is_user: false,
        name: 'System',
        send_date: Date.now(),
        mes: 'Injected context note',
    };
    chat.splice(chat.length - 1, 0, systemNote);
};
```
