# Document Row Elevation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each document row in the desktop document listing (`DocumentTableCore.tsx`) read as a distinct, elevated card instead of a flat divided table line.

**Architecture:** Replace the native `<table>` markup in the desktop branch of `DocumentTableCore.tsx` with a CSS Grid layout using explicit ARIA table roles (`role="table"/"rowgroup"/"row"/"columnheader"/"cell"`), so it remains as accessible as a real table while each row becomes an independently styleable box (rounded corners, border, shadow, hover lift). Column alignment across rows is achieved with CSS Grid `subgrid` rather than hardcoded pixel widths, so columns still auto-size to content exactly like the native table did. A new theme-aware CSS class (`.row-glow`) drives the resting shadow and hover lift/glow, using the existing `--accent-rgb` custom property so the effect matches whichever of the app's themes is active.

**Tech Stack:** Next.js 16 / React 19 / TypeScript, Tailwind CSS v4 (`grid-cols-subgrid`, arbitrary `grid-cols-[...]` values), plain CSS in `web/src/app/globals.css` for the theme-aware glow.

## Global Constraints

- Desktop only: this change applies to the `hidden ... md:block` (→ `hidden ... md:grid`) branch of `DocumentTableCore.tsx`. The `md:hidden` mobile `<article>` cards are unchanged.
- Any new glow/shadow color must use `rgba(var(--accent-rgb), <alpha>)`, matching the existing convention in `globals.css:196-197`, so it adapts to all themes (forge/ocean/forest/royal/rose/mono) — never hardcode an accent color.
- Markup must preserve ARIA table semantics (`role="table"`, `role="rowgroup"`, `role="row"`, `role="columnheader"`, `role="cell"`) since a `<table>` is being replaced with `<div>`s.
- No changes to interaction logic: checkbox selection (`onToggleSelect`/`onToggleSelectAll`), drag-and-drop (`draggable`/`onDragStart`), or the action buttons (`DocumentActions`). This is a markup/CSS-only change.
- No new automated tests are being added (the project's only test file, `uploadMime.test.ts`, is unrelated). Verification is `npm run lint`, `npm run build`, and manual browser checks per the project's UI-change convention (CLAUDE.md: "start the dev server and use the feature in a browser before reporting the task as complete").

---

### Task 1: Elevated desktop document rows

**Files:**
- Modify: `web/src/app/globals.css` (add a new `.row-glow` rule after the existing `.table-row-hover` block at lines 279-285; `.table-row-hover` itself is left untouched)
- Modify: `web/src/components/DocumentTableCore.tsx:138-203` (desktop table branch)

**Interfaces:**
- Consumes: `DocumentRow`, `FileTypeIcon`, `formatBytes`, `formatDate`, `getFileIcon` from `./documentTableTypes` (unchanged imports); `getFileExtension` from `@/lib/fileType` (unchanged); `DocumentActions` (local component in the same file, unchanged); `selectedIds: Set<string>`, `allSelected: boolean`, `onToggleSelect`, `onToggleSelectAll`, `onVersionHistory` props (unchanged).
- Produces: no new exports. The `.row-glow` CSS class is a new, file-local-by-convention utility class (declared in `globals.css`, applied only in `DocumentTableCore.tsx`) — no other file needs to reference it for this task, but note its name for future consistency.

- [ ] **Step 1: Add the theme-aware `.row-glow` rule to `globals.css`**

In `web/src/app/globals.css`, immediately after the existing `.table-row-hover` block (currently lines 279-285), add:

```css
/* Elevation glow for document rows */
.row-glow {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.row-glow:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px -6px rgba(var(--accent-rgb), 0.3), 0 1px 2px rgba(0, 0, 0, 0.4);
}
```

Leave the existing `.table-row-hover` rule as-is — per the approved spec's non-goals, fixing/removing the other hardcoded-orange effects (`.table-row-hover`, `.card-glow`, `.progress-glow`) is explicitly out of scope for this task, even though `.table-row-hover` stops being referenced once Step 3 rewrites `DocumentTableCore.tsx`. Don't delete it here.

- [ ] **Step 2: Confirm the CSS change compiles**

Run: `cd web && npm run build`
Expected: build succeeds with no CSS/type errors (this also compiles the still-unchanged `DocumentTableCore.tsx` at this point, so it's just confirming Step 1 didn't break anything).

- [ ] **Step 3: Rewrite the desktop table branch in `DocumentTableCore.tsx`**

Replace the entire block from the `{/* Desktop table */}` comment through its closing `</div>` (originally lines 138-203) with:

```tsx
      {/* Desktop table */}
      <div
        role="table"
        aria-label="Documents"
        className="hidden grid-cols-[2.5rem_minmax(0,1fr)_auto_auto_auto_auto] gap-y-2 text-sm md:grid"
      >
        <div role="rowgroup" className="contents">
          <div
            role="row"
            className="col-span-full grid grid-cols-subgrid items-center rounded-lg border border-stone-700/40 bg-stone-900/60"
          >
            <div role="columnheader" className="px-3 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="h-3.5 w-3.5 cursor-pointer rounded border-stone-600 accent-forge-500"
                aria-label="Select all documents"
              />
            </div>
            <div role="columnheader" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500">
              Title
            </div>
            <div role="columnheader" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500">
              Type
            </div>
            <div role="columnheader" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500">
              Size
            </div>
            <div role="columnheader" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500">
              Added
            </div>
            <div role="columnheader" className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-stone-500" />
          </div>
        </div>

        <div role="rowgroup" className="contents">
          {documents.map((doc) => (
            <div
              key={doc.id}
              role="row"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", doc.id)}
              className={`row-glow col-span-full grid grid-cols-subgrid items-center rounded-lg border border-l-4 border-stone-700/40 ${
                selectedIds.has(doc.id)
                  ? "border-l-forge-500/80 bg-forge-500/[0.06]"
                  : "border-l-transparent bg-stone-900/40"
              }`}
            >
              <div role="cell" className="px-3 py-3.5">
                <input
                  type="checkbox"
                  checked={selectedIds.has(doc.id)}
                  onChange={() => onToggleSelect(doc.id)}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-stone-600 accent-forge-500"
                  aria-label={`Select ${doc.title}`}
                />
              </div>
              <div role="cell" className="px-4 py-3.5 font-semibold text-stone-100">
                {doc.title}
              </div>
              <div role="cell" className="px-4 py-3.5">
                <FileTypeIcon type={getFileIcon(doc.storage_path)} extension={getFileExtension(doc.storage_path)} />
              </div>
              <div role="cell" className="px-4 py-3.5 font-mono text-xs text-stone-400">
                {formatBytes(doc.file_size_bytes)}
              </div>
              <div role="cell" className="px-4 py-3.5 text-stone-400">
                {formatDate(doc.created_at)}
              </div>
              <div role="cell" className="px-4 py-3.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <DocumentActions doc={doc} onVersionHistory={onVersionHistory} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
```

Notes on this markup, for whoever reviews it:
- The grid's 6 column tracks are `2.5rem` (checkbox) `minmax(0,1fr)` (title, flexible) `auto` (type) `auto` (size) `auto` (added) `auto` (actions). Because the entire desktop branch only renders at `md:` and above (the outer `hidden ... md:grid`), the old per-cell `hidden sm:table-cell` / `hidden md:table-cell` responsive toggles on the Type/Added columns are dead weight — those columns were already unconditionally visible whenever the table itself was visible — so they're dropped rather than translated.
- `role="rowgroup"` wrappers use `className="contents"` (`display: contents`) so the row `div`s become direct grid items of the outer grid (required for `grid-cols-subgrid` to inherit the parent's column tracks), while the ARIA rowgroup/row/table nesting is preserved in the DOM for assistive tech.
- The selected-state left accent bar uses Tailwind's side-specific border utilities (`border-l-4` overriding the general `border` on top of `border-stone-700/40`) with the theme-aware `forge-500` alias (`border-l-forge-500/80`) — no new CSS needed for this part, since `forge-500` is already wired to the active theme's `--accent-500` via the `@theme inline` block. Only the shadow/glow needed a new raw-CSS class (`.row-glow`) because Tailwind's opacity-modified arbitrary shadow syntax would be unreadably long inline.
- `border-l-4` reserves the same 4px on every row regardless of selection state (`border-l-transparent` vs `border-l-forge-500/80`), so toggling selection never shifts layout.

- [ ] **Step 4: Lint**

Run: `cd web && npm run lint`
Expected: no errors. If `jsx-a11y` warnings surface about the ARIA roles, fix by adjusting the specific role/attribute flagged (e.g. adding a missing `aria-*` prop) — do not suppress the rule.

- [ ] **Step 5: Type-check and build**

Run: `cd web && npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 6: Manual browser verification**

Run: `cd web && npm run dev`, then open `http://localhost:3000` with a populated document list and check, at a desktop viewport width (≥768px):
- Rows are visually separated: rounded corners, visible border, resting shadow, with a gap between rows (no more single-hairline dividers).
- Hovering a row lifts it slightly and shows a soft glow; switch themes via the theme selector (top-left dropdown, e.g. Forge → Ocean → Mono) and confirm the glow color follows the active theme's accent color rather than staying orange.
- Selecting a row (checkbox) shows the left accent bar plus the faint tint, and remains clearly distinguishable when multiple rows are selected at once; "select all" still selects/deselects every row.
- Dragging a row (`draggable`) still allows a drop onto a folder in the sidebar (drag-and-drop behavior unchanged).
- Preview / Export / Open / History / Delete buttons in the Actions column still render per-row and function (open a preview, trigger a download, etc.).
- Resize below 768px: the mobile card view renders exactly as before (unaffected by this change).
- Empty-vault state (no documents) still renders its existing empty-state block unaffected (that branch wasn't touched).

- [ ] **Step 7: Commit**

```bash
git add web/src/app/globals.css web/src/components/DocumentTableCore.tsx
git commit -m "$(cat <<'EOF'
style: give desktop document rows card-like elevation

Rows now render as individually bordered, shadowed, rounded boxes with
a hover lift/glow instead of flat table-divider lines, so each
document reads as a distinct unit. Uses CSS grid + subgrid (in place
of a native <table>, preserved as an ARIA table) so columns still
auto-align to content without hardcoded widths. The new hover glow
(.row-glow) is theme-aware (uses --accent-rgb), unlike the older
hardcoded-orange effects in globals.css, which are left as-is.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
