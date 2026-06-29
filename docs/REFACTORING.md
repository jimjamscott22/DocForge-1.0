# DocForge — Refactoring & Optimization Tracker

Working document for refactors identified during the full-app review (2026-06-17).
Status legend: ⬜ todo · 🔄 in progress · ✅ done · ⏭️ deferred

---

## High impact

### 1. Duplicated auth + ownership boilerplate across API routes — ✅
Every session route repeats the same ~12-line block: build server client → `getUser()` →
`if (!user) return errorResponse(...)`. 16 routes call `getUser()` inline; 5 repeat the
"You must be signed in" message; 5 repeat the `created_by !== user.id` ownership check.
- **Plan:** `requireUser(supabase)` helper that returns the user or throws an `AppError`.
  Optionally a `withRouteErrorHandling` wrapper to collapse the repeated top-level try/catch.
- **Files:** all of `src/app/api/**/route.ts` (session routes).

### 2. Two parallel auth mechanisms / inconsistent error envelopes — ⬜
`/api/v1/*` routes use `authenticateApiKey` and return bare `{ error }` JSON, while session
routes use the structured `errorResponse`/`AppError` system. Normalize v1 onto the same envelope.
- **Files:** `src/app/api/v1/**`, `src/lib/apiKeyAuth.ts`.

### 3. No pagination — all documents fetched + sorted + filtered in memory — ⬜
`getData` in `page.tsx` fetches every document, then sorts and filters by file type in JS.
- **Plan:** push `.order()` into the query for sort options; filter file type in SQL via the
  existing `content_type` column; add `LIMIT`/`OFFSET` pagination.
- Note: `const { data: documents = [], error }` default never fires (Supabase returns `null`,
  not `undefined`, on error) — the later `(documents || [])` is what guards it.
- **Files:** `src/app/page.tsx`.

---

## Medium impact

### 4. Duplicated formatting helpers (`formatBytes`) — 🔄
Defined 3× (`documentTableTypes.tsx`, `AnalyticsDashboard.tsx`, `VersionHistoryModal.tsx`)
plus a 4th variant `formatFileSize` in `UploadForm.tsx`.
- **Plan:** consolidate into `src/lib/format.ts`.

### 5. File-type / extension logic open-coded in 8 files — 🔄
`path.split(".").pop()` and file-type mapping repeated across `page.tsx`, `DocumentTableCore.tsx`,
`ExportButton.tsx`, and several routes.
- **Plan:** `src/lib/fileType.ts` with `getFileExtension`, `getFileTypeFromPath`, `getFileIcon`.

### 6. `BUCKET_NAME` redeclared in 9 files — 🔄
`const BUCKET_NAME = "DocForgeVault"` copy-pasted across routes.
- **Plan:** `src/lib/storage.ts` exporting `BUCKET_NAME`.

### 7. `DocumentTableCore` renders the action toolbar twice — ⬜
Mobile-card and desktop-table branches each render Preview/Export/View/History/Delete (~25 dup lines).
- **Plan:** extract `<DocumentActions doc onVersionHistory />`.

### 8. `getData`'s two branches duplicate the filter+sort tail — ⬜
Search branch and no-search branch end with identical `filter → sortDocuments`.
- **Plan:** collapse to one tail after the branch selects the source query.

### 9. `last_used_at` write on every API-key request — ⬜
`apiKeyAuth.ts` issues an `UPDATE` on every authenticated v1 request (write amplification).
- **Plan:** throttle — only update if `last_used_at` is older than ~1 min.

---

## Lower impact / polish

### 10. No `middleware.ts` for Supabase session refresh — ⬜
Recommended `@supabase/ssr` pattern refreshes the auth cookie on navigation; without it sessions
can silently expire mid-use.

### 11. Repeated inline SVGs — ⬜
Chevrons, search, anvil etc. duplicated throughout `page.tsx` / `DashboardClient.tsx`.
- **Plan:** extract an `icons.tsx` set.

### 12. `DashboardClient` re-fetches `/api/folders` on mount — ⬜
`page.tsx` (server) could pass folders down as props instead of a client round-trip (small N+1).

### 13. `pdf-parse` lazy `require()` → `await import()` — ⬜
ESM consistency in `textExtractor.ts`.

### 14. Thin test coverage — 🔄
Only `uploadMime.test.ts`. Pure functions (`extractTextFromHtml`, `sortDocuments`,
`isBlockedHostname`, `formatBytes`, file-type helpers) are easily testable.
- **Plan:** add tests alongside each extracted helper; widen the `test` npm script to all `*.test.ts`.

---

## Changelog

- _2026-06-17_ — Review completed; tracker created. Starting with the safe pure-refactor slice:
  #6 (storage), #4 (format), #5 (fileType), #1 (requireUser), #14 (tests).
- _2026-06-21_ — Completed #1 for session API routes: all non-v1 routes now use
  `requireUser`, repeated document ownership checks use `assertOwned`, route auth errors are
  handled through `handleRouteError`, and `routeAuth` has focused tests.
