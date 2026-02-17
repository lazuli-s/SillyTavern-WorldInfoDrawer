# CODE REVIEW FINDINGS: `src/Settings.js`

## F01: `useBookSorts` validation can silently override persisted false when stored as non-boolean
- Location:
  `src/Settings.js` — `Settings.constructor()`

  Anchor:
  ```js
  if (typeof this.useBookSorts !== 'boolean') {
      this.useBookSorts = true;
  }
  ```

- What the issue is  
  The constructor treats any non-boolean persisted value as invalid and forcibly sets `useBookSorts = true`. If settings ever get serialized/deserialized through a path that turns booleans into strings (e.g., `"false"`), or a legacy version stored `0/1`, the user’s intended disabled state will be overwritten on load.

- Why it matters  
  This is a data-integrity issue: a user can toggle “use per-book sorts” off, but after a reload it can turn back on without the user changing it, leading to confusing behavior and “it won’t stay off” reports.

- Severity: Medium

- Fix risk: Low  
  (Localized to settings hydration/normalization.)

- Confidence: Medium  
  (Depends on whether any settings persistence path can yield non-boolean types in practice.)

- Repro idea:
  1. In DevTools console, set `extension_settings.worldInfoDrawer = { useBookSorts: "false" }`.
  2. Reload the page / reinitialize the extension.
  3. Observe `Settings.instance.useBookSorts` becomes `true`.

- Suggested direction  
  Normalize `useBookSorts` using a tolerant boolean parser (e.g., accept `true/false`, `"true"/"false"`, `1/0`) rather than forcing unknown values to `true`.

- Proposed fix  
  Replace the `typeof !== 'boolean'` guard with explicit parsing/normalization; keep default as `true` only when the value is truly missing/unknown.

- Immplementation Checklist:
  [ ] Identify how SillyTavern persists `extension_settings` and whether it guarantees boolean round-tripping  
  [ ] Implement a small normalization function for `useBookSorts` that accepts string/number representations  
  [ ] Add a unit test covering `"false"` and `0` inputs (if feasible in this repo’s test setup)  
  [ ] Verify default remains `true` when the field is absent

- Why it’s safe to implement  
  It preserves the same intended behavior (default true) while preventing unexpected overrides of an explicit “false” value. No UI flows need to change.

---

## F02: `Object.assign` hydrates arbitrary keys into the Settings instance
- Location:
  `src/Settings.js` — `Settings.constructor()`

  Anchor:
  ```js
  Object.assign(this, extension_settings.worldInfoDrawer ?? {});
  ```

- What the issue is  
  `Object.assign` copies *all* enumerable properties from `extension_settings.worldInfoDrawer` into the `Settings` instance, not just the known fields (`sortLogic`, `sortDirection`, `useBookSorts`). If another module (or a legacy version) stores extra keys under `worldInfoDrawer`, they will become instance properties and may be persisted again via `extension_settings`.

- Why it matters  
  This increases coupling and can create hard-to-debug persistence issues:
  - Unexpected keys can be carried forward forever.
  - If a future key name collides with a method or planned field, it can break behavior.
  - It can unintentionally bloat saved settings payload.

- Severity: Low

- Fix risk: Low

- Confidence: High  
  (Behavior is deterministic from the `Object.assign` usage.)

- Repro idea:
  1. Set `extension_settings.worldInfoDrawer = { sortLogic: "title", unexpectedKey: { huge: "object" } }`.
  2. Initialize `Settings.instance`.
  3. Confirm `Settings.instance.unexpectedKey` exists and will be retained in memory.

- Suggested direction  
  Hydrate only known keys (explicit picks) and ignore unknown keys by default.

- Proposed fix  
  Replace `Object.assign` with explicit assignment of whitelisted fields, or destructure the input and assign only recognized settings.

- Immplementation Checklist:
  [ ] Define an allowlist of known settings keys  
  [ ] Replace `Object.assign` with allowlist-based hydration  
  [ ] Confirm `toJSON()` still produces exactly the intended persisted schema  
  [ ] Smoke test settings load/save after toggling sort options

- Why it’s safe to implement  
  The extension only relies on the three declared settings fields. Ignoring unknown keys should not change intended behavior, only reduce risk from stale/foreign data.

---

## F03: Overwriting `extension_settings.worldInfoDrawer` with a class instance relies on `toJSON` behavior
- Location:
  `src/Settings.js` — `Settings.constructor()` and `Settings.toJSON()`

  Anchor:
  ```js
  extension_settings.worldInfoDrawer = this;
  ```

- What the issue is  
  The module stores the `Settings` class instance directly into `extension_settings.worldInfoDrawer`. This is convenient, but it depends on the upstream settings serialization path honoring `toJSON()` consistently. If a future SillyTavern change deep-clones settings differently (or enumerates keys directly), the presence of methods/non-data properties could cause unexpected persistence or serialization errors.

- Why it matters  
  This is an integration fragility risk across upstream changes. When it breaks, settings save/load can fail in ways that affect the entire app’s settings persistence (since `saveSettingsDebounced()` is global).

- Severity: Medium  
  (Impact could be broad if serialization breaks.)

- Fix risk: Medium  
  (Changing the object shape stored in `extension_settings` can affect other extension code that expects `Settings.instance` identity to match `extension_settings.worldInfoDrawer`.)

- Confidence: Medium  
  (Relies on assumptions about SillyTavern’s internal serialization strategy over time.)

- Repro idea:
  - Add a temporary monkey patch to mimic a serializer that shallow-copies enumerable properties (ignoring `toJSON`), then trigger `saveSettingsDebounced()` and inspect what gets stored.

- Suggested direction  
  Consider keeping `extension_settings.worldInfoDrawer` as a plain JSON object and have `Settings.instance` wrap it, or ensure only data properties are enumerable and stable.

- Proposed fix  
  Either:
  - Keep current pattern but harden it (ensure only the three data fields are enumerable and no extra fields are added), or
  - Switch to a plain-object storage contract and update callers to read through the singleton.

- Immplementation Checklist:
  [ ] Confirm how SillyTavern persists `extension_settings` (does it use `JSON.stringify`?)  
  [ ] Audit the Settings instance for any additional enumerable props that could appear over time  
  [ ] If changing storage shape, search usages of `extension_settings.worldInfoDrawer` and ensure compatibility  
  [ ] Verify settings save/load across a full reload

- Why it’s safe to implement  
  If implemented as “hardening” (limit enumerables / allowlist hydration), behavior remains the same: users’ settings persist and the singleton remains the access point.