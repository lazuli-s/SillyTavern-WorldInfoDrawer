# New Feature: Bulk Edit Containers — Probability, Sticky, Cooldown, Delay

## Summary

Two changes to the Order Helper bulk edit row:

1. **Toggle theme color** — Apply custom theme color to the `fa-toggle-off` state of the `killSwitch` button in the active-state container.
2. **New bulk edit containers** — Add four new containers after the existing "Order" container: Probability, Sticky, Cooldown, Delay. Each has a compact number input, an apply button, and a `?` label hint.

## Files Changed

- `src/orderHelperRender.actionBar.js` — Add four container builders + apply handlers
- `style.css` — Add `.killSwitch.fa-toggle-off` rule

## Implementation Plan

### 1. CSS: toggle-off color
Add a CSS rule next to the existing `fa-toggle-on` rule:
```css
.stwid--orderHelper .stwid--bulkEditContainer .killSwitch.fa-toggle-off {
  color: var(--SmartThemeDangerColor, var(--SmartThemeQuoteColor));
}
```

### 2. JS: Four new containers after Order

Each container follows the same pattern as the existing Depth container:

| Container   | Cache field            | Row input name         | Label hint tooltip                                                                  |
|-------------|------------------------|------------------------|-------------------------------------------------------------------------------------|
| Probability | `selective_probability`| `selective_probability`| Trigger probability (0–100%). Sets how likely this entry fires when keywords match. |
| Sticky      | `sticky`               | `sticky`               | Sticky turns — keeps the entry active for N turns after it triggers.                |
| Cooldown    | `cooldown`             | `cooldown`             | Cooldown turns — prevents re-triggering for N turns after activation.               |
| Delay       | `delay`                | `delay`                | Delay turns — entry will not activate until N messages have passed.                 |

Apply logic for each:
1. Read and trim the input value.
2. Parse as integer; validate non-negative (probability also ≤ 100).
3. Iterate `dom.order.tbody.children`, skip filtered/unselected rows.
4. Update `cache[bookName].entries[uid].<field>`.
5. Update the row input DOM (`tr.querySelector('[name="<field>"]')`).
6. `saveWorldInfo` for each affected book.

Persistence: localStorage key per field (`stwid--bulk-probability-value`, etc.)
