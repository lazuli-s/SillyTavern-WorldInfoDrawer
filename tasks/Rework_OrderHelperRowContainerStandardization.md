# Rework: Order Helper Row Container Standardization

## Goal

Standardize the UI of the **Visibility Row** and **Bulk Edit Row** in the Order Helper by:

1. Applying the bordered container pattern to the Visibility Row's controls (4 containers: Keywords, Columns, Sort, Filter)
2. Renaming `stwid--bulkEdit*` container classes to generic `stwid--control*` names so both rows share the same container vocabulary
3. Cleaning up obsolete CSS rules made redundant by the new structure

---

## Visual Target

### Visibility Row — Before (flat layout)

```
[👁️] [Column Visibility ▼]  |  Sort: [▼]  |  [🔍]        [active filter chips →]
                              (vertical dividers)
```

### Visibility Row — After (bordered containers)

```
┌─ Keywords ─┐  ┌─ Columns ──────────┐  ┌─ Sort ──┐  ┌─ Filter ─┐
│    [👁️]    │  │  [Select Cols ▼]   │  │  [▼]    │  │   [🔍]   │
└────────────┘  └────────────────────┘  └─────────┘  └──────────┘
                                                [active filter chips →]
```

The Bulk Edit Row visually **stays the same** — only the CSS class names change underneath.

---

## Files to Modify

| File | Changes |
|------|---------|
| `style.css` | Class renames, gap standardization, remove 6 obsolete rules |
| `src/orderHelperRender.actionBar.js` | Class renames, restructure `buildVisibilityRow` |

---

## Step-by-Step Plan

---

### STEP 1 — Rename CSS classes in `style.css` (replace_all)

Three class renames, applied globally across the file:

| Old name | New name | Occurrences in CSS |
|---|---|---|
| `stwid--bulkEditContainer` | `stwid--controlContainer` | 4× |
| `stwid--bulkEditLabel` | `stwid--controlLabel` | 1× |
| `stwid--bulkEditLabelHint` | `stwid--controlLabelHint` | 1× |

**After rename, the key CSS rules become:**

```css
/* Was stwid--bulkEditContainer */
.stwid--orderHelper .stwid--controlContainer { ... }

/* Was stwid--bulkEditLabel */
.stwid--orderHelper .stwid--controlLabel { ... }

/* Was stwid--bulkEditLabelHint */
i.fa-solid.fa-fw.fa-circle-question.stwid--controlLabelHint { ... }

/* Was data-field="outlet" scoped rule */
.stwid--orderHelper .stwid--controlContainer[data-field="outlet"] .stwid--input { ... }

/* Was killSwitch color overrides */
.stwid--orderHelper .stwid--controlContainer .killSwitch.fa-toggle-on { ... }
.stwid--orderHelper .stwid--controlContainer .killSwitch.fa-toggle-off { ... }

/* Was isDisabled rule */
.stwid--orderHelper .stwid--controlContainer.stwid--isDisabled { ... }
```

---

### STEP 2 — Rename CSS classes in `src/orderHelperRender.actionBar.js` (replace_all)

Same three renames, applied globally across the JS file:

| Old name | New name | Occurrences in JS |
|---|---|---|
| `stwid--bulkEditContainer` | `stwid--controlContainer` | 12× |
| `stwid--bulkEditLabel` | `stwid--controlLabel` | 12× |
| `stwid--bulkEditLabelHint` | `stwid--controlLabelHint` | 12× |

No logic changes — pure string replacement.

---

### STEP 3 — Standardize row gap in `style.css`

**Current state:**
```css
/* Shared base (line 1061-1071) */
.stwid--orderHelper .stwid--visibilityRow,
.stwid--orderHelper .stwid--bulkEditRow {
  gap: 1.25em;   /* ← too wide for container-style layout */
  ...
}

/* Bulk edit override (line 1163-1168) */
.stwid--orderHelper .stwid--bulkEditRow {
  gap: 0.75em;   /* ← overrides the shared base */
  ...
}
```

**Target state:** Both rows use `0.75em`. The override becomes unnecessary.

**Changes:**
1. In the shared base block (line 1066): change `gap: 1.25em` → `gap: 0.75em`
2. In `.stwid--bulkEditRow` block (line 1166): remove the `gap: 0.75em` line (no longer an override, now redundant)

---

### STEP 4 — Remove obsolete CSS rules from `style.css`

These rules describe elements that will no longer exist after the visibility row restructuring.

#### 4a. Remove `.stwid--visibilityRow .stwid--actionsDivider` (lines 1078–1083)
The vertical divider elements are replaced by container borders.
```css
/* REMOVE THIS BLOCK */
.stwid--orderHelper .stwid--visibilityRow .stwid--actionsDivider {
  align-self: stretch;
  width: 1px;
  background-color: var(--SmartThemeBorderColor);
  opacity: 0.5;
}
```

#### 4b. Remove `.stwid--visibilityRow .stwid--inputWrap` (lines 1086–1092)
The `sortWrap` label element using this class is replaced by a `stwid--controlContainer`.
```css
/* REMOVE THIS BLOCK */
.stwid--orderHelper .stwid--visibilityRow .stwid--inputWrap {
  display: flex;
  align-items: center;
  gap: 0.5em;
  color: var(--SmartThemeEmColor);
  font-size: smaller;
}
```
> ⚠️ Do NOT remove `.stwid--bulkEditRow .stwid--inputWrap` (lines 1240–1250) — it is still used by the Order container's start/step/direction inputs in the bulk edit row.

#### 4c. Remove `.stwid--columnVisibility` block (lines 1094–1101)
The `columnVisibilityWrap` div is removed; only the inner `menuWrap` is kept.
```css
/* REMOVE THIS BLOCK */
.stwid--orderHelper .stwid--visibilityRow .stwid--columnVisibility {
  display: flex;
  align-items: center;
  gap: 0.5em;
  color: var(--SmartThemeEmColor);
  font-size: smaller;
  position: relative;
}
```

#### 4d. Remove `.stwid--columnVisibilityLabel` scoped block (lines 1103–1107)
The label wrapper inside columnVisibility is removed.
```css
/* REMOVE THIS BLOCK */
.stwid--orderHelper .stwid--visibilityRow .stwid--columnVisibility .stwid--columnVisibilityLabel {
  display: flex;
  align-items: center;
  gap: 0.35em;
}
```

#### 4e. Remove `.stwid--columnVisibilityText` block (lines 1109–1111)
The "Column\nVisibility:" label text element is removed.
```css
/* REMOVE THIS BLOCK */
.stwid--orderHelper .stwid--visibilityRow .stwid--columnVisibility .stwid--columnVisibilityText {
  line-height: 1.1;
}
```

#### 4f. Remove `.stwid--columnVisibilityLabel` global rule (lines 1278–1281)
A second, broader selector for the same now-removed element.
```css
/* REMOVE THIS BLOCK */
.stwid--orderHelper .stwid--columnVisibilityLabel {
  padding: 2px 4px;
  border-radius: var(--stwid-radius-s);
}
```

---

### STEP 5 — Restructure `buildVisibilityRow` in `src/orderHelperRender.actionBar.js`

This is the main JS change. The goal is to wrap each control in a `stwid--controlContainer` div with a `stwid--controlLabel` span.

---

#### 5a. Remove `addDivider` function and both call sites

**Current code (lines 235–267):**
```js
const addDivider = ()=>{
    const divider = document.createElement('div');
    divider.classList.add('stwid--actionsDivider');
    row.append(divider);
};
addDivider();   // after columnVisibilityWrap (line 240)

// ... sortWrap ...

addDivider();   // after sortWrap (line 267)
```

**Remove:**
- The `addDivider` function definition (5 lines)
- Both `addDivider()` calls

---

#### 5b. Wrap `keyToggle` in a "Keywords" container

**Current code (lines 106–123):**
```js
const keyToggle = document.createElement('div');
// ... build keyToggle ...
row.append(keyToggle);
```

**New code:** Build keyToggle the same way, but instead of appending directly to `row`, wrap it:
```js
const keyToggle = document.createElement('div');
// ... build keyToggle (unchanged) ...

const keywordsContainer = document.createElement('div');
keywordsContainer.classList.add('stwid--controlContainer');
keywordsContainer.dataset.field = 'keywords';
const keywordsLabel = document.createElement('span');
keywordsLabel.classList.add('stwid--controlLabel');
keywordsLabel.textContent = 'Keywords';
keywordsContainer.append(keywordsLabel, keyToggle);
row.append(keywordsContainer);
```

---

#### 5c. Replace `columnVisibilityWrap` structure with a "Columns" container

**Current code (lines 127–232):**
```js
const columnVisibilityWrap = document.createElement('div');
columnVisibilityWrap.classList.add('stwid--columnVisibility');
  // labelWrap (stwid--columnVisibilityLabel)
  //   labelText (stwid--columnVisibilityText) → "Column\nVisibility:"
  // menuWrap (stwid--multiselectDropdownWrap)
  //   menuButton ...
  //   menu ...
row.append(columnVisibilityWrap);
```

**Changes:**
- Remove `columnVisibilityWrap` div entirely (no longer a `stwid--columnVisibility`)
- Remove `labelWrap` and `labelText` entirely — the floating `stwid--controlLabel` replaces them
- Keep `menuWrap` and everything inside it **unchanged**
- Wrap `menuWrap` in a new `stwid--controlContainer`:

```js
// Build menuWrap as before (no changes to dropdown logic) ...

const columnsContainer = document.createElement('div');
columnsContainer.classList.add('stwid--controlContainer');
columnsContainer.dataset.field = 'columns';
const columnsLabel = document.createElement('span');
columnsLabel.classList.add('stwid--controlLabel');
columnsLabel.textContent = 'Columns';
columnsContainer.append(columnsLabel, menuWrap);
row.append(columnsContainer);
```

---

#### 5d. Replace `sortWrap` label with a "Sort" container

**Current code (lines 243–265):**
```js
const sortWrap = document.createElement('label');
sortWrap.classList.add('stwid--inputWrap');
setTooltip(sortWrap, 'Sort rows in the table');
sortWrap.append('Sort: ');
const sortSel = document.createElement('select');
// ... configure sortSel ...
sortWrap.append(sortSel);
row.append(sortWrap);
```

**Changes:**
- Remove the `label.stwid--inputWrap` wrapper and the `'Sort: '` text node entirely
- Keep `sortSel` and everything inside it **unchanged** (same event listeners, same DOM ref `dom.order.sortSelect`)
- Wrap `sortSel` in a new `stwid--controlContainer`:

```js
const sortSel = document.createElement('select');
// ... configure sortSel (unchanged) ...

const sortContainer = document.createElement('div');
sortContainer.classList.add('stwid--controlContainer');
sortContainer.dataset.field = 'sort';
const sortLabel = document.createElement('span');
sortLabel.classList.add('stwid--controlLabel');
sortLabel.textContent = 'Sort';
sortContainer.append(sortLabel, sortSel);
row.append(sortContainer);
```

---

#### 5e. Wrap `filterToggle` in a "Filter" container

**Current code (lines 270–282):**
```js
const filterToggle = document.createElement('div');
// ... build filterToggle ...
row.append(filterToggle);
```

**New code:** Build filterToggle the same way, then wrap it:
```js
const filterToggle = document.createElement('div');
// ... build filterToggle (unchanged) ...

const filterContainer = document.createElement('div');
filterContainer.classList.add('stwid--controlContainer');
filterContainer.dataset.field = 'filter';
const filterLabel = document.createElement('span');
filterLabel.classList.add('stwid--controlLabel');
filterLabel.textContent = 'Filter';
filterContainer.append(filterLabel, filterToggle);
row.append(filterContainer);
```

---

#### 5f. `visibilityInfo` — no changes

The right-aligned filter chip area (`div.stwid--visibilityInfo`) is appended **after all containers** and stays structurally unchanged.

---

## CSS Rules Untouched (keep as-is)

| Rule | Why keep |
|------|---------|
| `.stwid--visibilityRow` (flex-wrap, padding) | Still valid wrapper for row |
| `.stwid--visibilityInfo` | Filter chip area — unchanged |
| `.stwid--visibilityCount` | Used by bulk edit select container |
| `.stwid--activeFilters` | Filter chip area — unchanged |
| `.stwid--filterChip`, `.stwid--chipRemove` | Filter chip area — unchanged |
| `.stwid--bulkEditRow .stwid--inputWrap` → renamed `.stwid--controlRow .stwid--inputWrap` | Still used by Order container inputs |
| All `stwid--RowTitle`, `stwid--rowContentWrap`, collapse rules | Unchanged, apply to both rows |

> ⚠️ Note: After Step 1 renames `stwid--bulkEditRow` → the selector `.stwid--bulkEditRow .stwid--inputWrap` becomes `.stwid--bulkEditRow .stwid--inputWrap` still (the _row_ class name is NOT renamed, only the _container_ classes). So this rule remains valid.

---

## Verification Checklist

- [ ] Visibility row shows 4 bordered containers: Keywords, Columns, Sort, Filter
- [ ] Each container has a floating label sitting on the border (same as bulk edit containers)
- [ ] No vertical dividers visible in the visibility row
- [ ] Bulk edit row containers look visually identical to before (same appearance, new class names)
- [ ] Both rows have matching gap spacing between containers
- [ ] Sort select still functions (change triggers sort)
- [ ] Column visibility dropdown still opens/closes and toggles columns
- [ ] Key toggle (eye icon) still shows/hides keyword column
- [ ] Filter toggle still opens/closes the filter panel
- [ ] Active filter chips still appear in the right-aligned area
- [ ] Collapse/expand still works on both rows (chevron animates, content hides)
- [ ] No JavaScript errors in console
- [ ] No visual regressions in the bulk edit row
