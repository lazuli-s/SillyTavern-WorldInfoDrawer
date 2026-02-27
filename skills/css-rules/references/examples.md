# CSS Rules — Rule Examples

Before/after CSS snippets for every rule ID.

---

## NAME — Naming

### NAME-01: Extension classes must use the `.stwid--` prefix

```css
/* FAIL — no prefix, will collide with ST or other extensions */
.entry-list {
  display: flex;
}

/* FAIL — single hyphen prefix */
.stwid-entry-list {
  display: flex;
}

/* PASS */
.stwid--entry-list {
  display: flex;
}
```

### NAME-02: Hyphen-separated names; `__` separator for component family members

```css
/* FAIL — camelCase in new code */
.stwid--folderHeader {
  font-weight: bold;
}

/* PASS — standalone class, hyphens only */
.stwid--folder-header {
  font-weight: bold;
}
```

```css
/* FAIL — camelCase component family (old pattern) */
.stwid--listDropdownMenu { }
.stwid--listDropdownItem { }

/* PASS — component name hyphenated, elements separated by __ */
.stwid--list-dropdown { }
.stwid--list-dropdown__menu { }
.stwid--list-dropdown__item { }
```

> Existing names like `stwid--multiselectDropdownWrap` are a known deviation. Do not flag them,
> but do not add new camelCase names — even when extending that family.

### NAME-03: Names describe what an element is or does, not how it looks

```css
/* FAIL — describes appearance */
.stwid--red-text {
  color: red;
}

/* FAIL — meaningless abbreviation */
.stwid--x1 {
  color: red;
}

/* PASS — describes the element's role */
.stwid--validation-error {
  color: red;
}
```

### NAME-04: Keep names as short as clarity allows

```css
/* FAIL — unnecessarily long */
.stwid--navigation-sidebar-container {
  display: flex;
}

/* PASS — context makes the abbreviation obvious */
.stwid--nav {
  display: flex;
}
```

### NAME-05: Never create new `#` ID selectors for extension elements

```css
/* FAIL — extension-created ID */
#stwid-entry-detail {
  padding: 8px;
}

/* PASS — class selector */
.stwid--entry-detail {
  padding: 8px;
}
```

> ST's own IDs like `#WorldInfo` and `#wi-holder` are allowed for scoping.

---

## FMT — Formatting

### FMT-01: Single quotes in attribute selectors and string values; no quotes in url()

```css
/* FAIL — double quotes in attribute selector */
input[type="text"] {
  border: none;
}

/* FAIL — quotes inside url() */
.stwid--icon {
  background: url('icon.png');
}

/* PASS */
input[type='text'] {
  border: none;
}

.stwid--icon {
  background: url(icon.png);
}
```

### FMT-02: Indent block content to reflect hierarchy

```css
/* FAIL — no indentation */
.stwid--books {
display: flex;
flex-direction: column;
}

/* PASS */
.stwid--books {
  display: flex;
  flex-direction: column;
}
```

### FMT-03: Group sections with a numbered section comment

```css
/* FAIL — no section comment */
.stwid--drawer {
  display: flex;
}

.stwid--list {
  width: 30%;
}

/* PASS */
/* 1) Drawer */
.stwid--drawer {
  display: flex;
}

/* 2) List Panel */
.stwid--list {
  width: 30%;
}
```

### FMT-04: Nest rules when a parent selector appears as a prefix in more than 3 blocks

```css
/* FAIL — parent prefix repeated 4 times as separate blocks */
.stwid--books thead th {
  font-weight: bold;
}

.stwid--books tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.stwid--books td {
  padding: 4px 8px;
}

.stwid--books .stwid--book-name {
  flex: 1;
}

/* PASS — nested inside parent */
.stwid--books {
  thead th {
    font-weight: bold;
  }

  tr:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  td {
    padding: 4px 8px;
  }

  .stwid--book-name {
    flex: 1;
  }
}
```

---

## PROP — Properties

### PROP-01: Use shorthand properties

```css
/* FAIL — four separate padding declarations */
.stwid--entry-row {
  padding-top: 4px;
  padding-right: 8px;
  padding-bottom: 4px;
  padding-left: 8px;
}

/* PASS — shorthand */
.stwid--entry-row {
  padding: 4px 8px;
}
```

### PROP-02: Use 3-character hex where the color allows it

```css
/* FAIL — 6-character hex that can be shortened */
.stwid--badge {
  background: #ffcc00;
  color: #ffffff;
}

/* PASS — 3-character shorthand */
.stwid--badge {
  background: #fc0;
  color: #fff;
}
```

> Only shorten when all three pairs are doubles (e.g. `#ffcc00` → `#fc0`).
> `#1a2b3c` cannot be shortened and stays as-is.

---

## DGR — Danger

### DGR-01: `!important` must have an override comment

```css
/* FAIL — bare !important, no explanation */
.stwid--modal {
  z-index: 9999 !important;
}

/* PASS — explains why the override is necessary */
.stwid--modal {
  z-index: 9999 !important; /* override: ST sets z-index:9998 on #sheld */
}
```

### DGR-02: No browser hacks or user-agent workarounds

```css
/* FAIL — IE7 star hack */
.stwid--toolbar {
  *display: inline;
}

/* FAIL — webkit-only property with no standard fallback considered */
.stwid--scroll-area {
  -webkit-overflow-scrolling: touch;
}

/* PASS — standard property, no browser hack */
.stwid--scroll-area {
  overflow-y: auto;
}
```

### DGR-03: Never qualify class selectors with an element type

```css
/* FAIL — element type prefix is redundant */
div.stwid--panel {
  padding: 8px;
}

span.stwid--entry-title {
  font-weight: bold;
}

/* PASS */
.stwid--panel {
  padding: 8px;
}

.stwid--entry-title {
  font-weight: bold;
}
```

> Exception: when ST's specificity genuinely requires the element type to win the cascade.

### DGR-04: Keep selectors shallow (max 3 levels deep)

```css
/* FAIL — 4 levels deep */
#WorldInfo .stwid--list .stwid--entry-row .stwid--entry-title {
  font-size: 0.9em;
}

/* PASS — scoped with 2 levels */
#WorldInfo .stwid--entry-title {
  font-size: 0.9em;
}
```
