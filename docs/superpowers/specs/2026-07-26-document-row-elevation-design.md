# Document row elevation — desktop table

## Problem

The desktop document listing (`DocumentTableCore.tsx`) renders a native `<table>` where rows are separated only by a 1px `divide-y` hairline (`divide-stone-700/30`). Combined with a dark background and tight padding, individual documents blend together — there's no strong visual anchor per row. Hover/selected states are subtle background tints (`table-row-hover`, `bg-forge-500/[0.06]`) that don't do much to separate one row from its neighbors.

Additionally, the existing hover/glow effects in `globals.css` (`table-row-hover`, `card-glow`, `progress-glow`) hardcode forge-orange (`rgba(249, 115, 22, ...)`) instead of using the `--accent-rgb` custom property that already varies per theme (Forge/Ocean/Forest/Royal/Rose, see `:root[data-theme="..."]` blocks). Any new glow effect should be theme-aware from the start.

## Goal

Make each document row visually pop as a distinct unit — card-like elevation — on the desktop table view only. Mobile cards (`<article>` in the `md:hidden` block) are out of scope and stay exactly as they are.

## Approach

**Native `<tr>` elements cannot reliably take `border-radius` or `box-shadow`** across browsers when inside a `<table>` — this rules out achieving genuine per-row elevation with the current markup. The desktop listing will be restructured from a native `<table>` to a CSS Grid layout using ARIA table roles, so it remains as accessible as a real table to screen readers while each row becomes a normal box that can be styled with radius/shadow/spacing.

### 1. Structure

Replace:
```
<table><thead>...<tbody>...
```
with a grid-based structure:
```
<div role="table">
  <div role="rowgroup"><div role="row"> ...role="columnheader" cells... </div></div>
  <div role="rowgroup">
    <div role="row"> ...role="cell" cells... </div>
    ...
  </div>
</div>
```
Each `role="row"` uses `display: grid` with a fixed `grid-template-columns` matching today's column layout:
- checkbox column: `w-10` fixed width
- Title: flexible (`minmax(0, 1fr)`)
- Type: fixed width, hidden below `sm`
- Size: fixed width
- Added: fixed width, hidden below `md`
- Actions: fixed width, right-aligned

Column widths/breakpoints must visually match the current table exactly (same `hidden sm:table-cell` / `md:table-cell` behavior translated to grid equivalents, e.g. `hidden sm:grid` isn't valid — use `sm:[display:grid]` via conditional class or keep cells always in the grid flow and toggle `hidden sm:flex`/`sm:block` per cell while grid-template-columns stays constant. Implementation detail decided during coding, not a design constraint.)

The outer header row keeps its current sticky-ish styling (`bg-stone-900/60`, uppercase tracked labels) unchanged.

### 2. Row visual treatment

Each data row (`role="row"` in the body):
- `rounded-lg` corners
- `border border-stone-700/40` (matches current outer container border weight)
- Vertical gap between rows (replacing `divide-y`) — approx `gap-2` between rows via the rowgroup being a flex/grid column with spacing, or margin-bottom per row
- Resting shadow: subtle, low-opacity (e.g. `shadow-sm` equivalent, dark-mode appropriate — not the current borderless flat look)
- Hover: replace flat background tint with a lift effect — small `translateY(-1px)` plus a soft glow using `var(--accent-rgb)` at low alpha (parallel to `card-glow` but reusable for rows), transition on `box-shadow`/`transform`/`border-color`, consistent with existing `transition` conventions in the codebase (150–300ms ease)
- No change to row height/padding beyond what's needed to accommodate the border/radius (keep `py-3.5` cell padding as-is)

### 3. Selected state

Replace the current `bg-forge-500/[0.06]` wash with:
- A left accent bar: 3–4px solid `var(--accent-rgb)`-based color flush against the row's left edge (implemented via `border-left` on the row, sized so it doesn't shift other content — compensate with equivalent reduction in left padding, or overlay via `box-shadow: inset`)
- Keep a faint background tint (existing `bg-forge-500/[0.06]` equivalent) in addition to the bar, so the state reads clearly even for users who rely on color+shape together, not color alone

### 4. Theme-aware glow

Add a new CSS rule (in `globals.css`, near the existing `.table-row-hover` / `.card-glow` rules) for the new row hover/elevation effect that uses `var(--accent-rgb)` rather than a hardcoded orange, so it matches whichever theme is active. Existing `.table-row-hover`, `.card-glow`, and `.progress-glow` hardcoded-orange rules are left untouched (out of scope — only the new row styling needs to be theme-aware; fixing the pre-existing rules is a separate, unrelated cleanup).

### 5. Title emphasis

Bump the Title cell from `font-medium text-stone-100` (inheriting table's `text-sm`) to `font-semibold` with a modest size bump (e.g. `text-[13.5px]` or `text-sm` kept but weight increased — final value decided during implementation to keep alignment clean with the header row), so the title remains the clear visual anchor within each elevated row.

## Non-goals

- Mobile card styling (`md:hidden` block) — unchanged.
- Fixing the pre-existing hardcoded-orange glow in `.table-row-hover` / `.card-glow` / `.progress-glow` used elsewhere in the app.
- Changing table content, columns, sorting, or interaction behavior (drag-to-folder, checkbox selection logic, row actions) — purely visual.
- Changing the "Results" summary bar above the table, or the empty-state block.

## Testing

This is a pure styling/markup change with no new logic to unit test. Verification is visual/manual:
- `npm run dev`, view the dashboard with a populated document list at desktop width (`md` and above)
- Confirm rows are visually separated with rounded corners, border, and resting shadow
- Confirm hover lifts/glows the row using the active theme's accent color (test by switching themes via the theme selector visible in the header)
- Confirm selected rows show the left accent bar and remain distinguishable when multiple rows are selected
- Confirm checkbox, drag-and-drop (`draggable`/`onDragStart`), and row actions (Preview/Export/Open/History/Delete) still function identically
- Run `npm run lint` to catch markup/accessibility issues (ARIA role usage)
- Confirm no visual regression on the mobile (`md:hidden`) card view
