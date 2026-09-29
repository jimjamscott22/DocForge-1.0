# DocForge — Refactoring & Optimization Tracker

Working document for refactors identified during the full-app review (2026-06-17).
Status legend: ⬜ todo · 🔄 in progress · ✅ done · ⏭️ deferred

This is the source of truth for implementation status. ✅ means implemented in
the repository and locally verified; hosted database deployment is tracked
separately and is not implied by that mark.

---

## High impact

### 1. Duplicated auth + ownership boilerplate across API routes — ✅
Every session route repeats the same ~12-line block: build server client → `getUser()` →
`if (!user) return errorResponse(...)`. 16 routes call `getUser()` inline; 5 repeat the
"You must be signed in" message; 5 repeat the `created_by !== user.id` ownership check.
- **Plan:** `requireUser(supabase)` helper that returns the user or throws an `AppError`.
  Optionally a `withRouteErrorHandling` wrapper to collapse the repeated top-level try/catch.
- **Files:** all of `src/app/api/**/route.ts` (session routes).

### 2. Two parallel auth mechanisms / inconsistent error envelopes — ✅
`/api/v1/*` routes use `authenticateApiKey` and return bare `{ error }` JSON, while session
routes use the structured `errorResponse`/`AppError` system. Normalize v1 onto the same envelope.
- **Files:** `src/app/api/v1/**`, `src/lib/apiKeyAuth.ts`.

### 3. No pagination — all documents fetched + sorted + filtered in memory — ✅
`getData` in `page.tsx` fetched every document, then sorted and filtered by file type in JS.
- There was no `content_type` column on `documents` (only on `document_versions`), and the
  file-type filter was always extension-based (`storage_path` parsing in `fileType.ts`), not
  MIME-based — so filtering went into SQL via `storage_path ILIKE` matching the same extension
  groups `classify()` uses, not a `content_type` column.
- The search branch goes through the `search_documents` RPC, which hard-coded `LIMIT 50` with
  no sort/filter/offset params. Extended its signature (`p_sort`, `p_file_type`, `p_limit`,
  `p_offset`, plus a `total_count` window column) — see `supabase/search_pagination_migration.sql`
  for existing databases and the updated definition in `schema.sql` for fresh installs.
- **Files:** `src/app/page.tsx`, `src/lib/documentQuery.ts` (new), `src/lib/fileType.ts`
  (extension groups extracted so JS and SQL classification share one source of truth),
  `src/components/DashboardClient.tsx` (renders the new `paginationControls`),
  `supabase/schema.sql`, `supabase/search_pagination_migration.sql` (new).
- Caveat: per-page/folder document counts and storage totals (the header chips and the folder
  rail's "N root · M MB" line) are now computed from just the current page's documents, since
  the full set is no longer fetched — they read as page-scoped rather than vault-wide totals.
  Left as-is since fixing it needs a separate lightweight aggregate query, out of scope here.

### 15. Folder-aware pagination — ✅
- Folder selection is URL state (`folder=<uuid>`), restored on reload/back/forward.
- Switching folders preserves search, sort, type, and environment, and resets to page one.
- List queries and `search_documents` apply folder filtering before counting and paging.
- Pagination links and the search form preserve the selected folder.
- Stable ID tie-breaking avoids unstable page boundaries for equal sort values.
- Stale/out-of-range pages recover to the last available page; database errors surface
  through the page error boundary rather than masquerading as an empty vault.
- Regression coverage: multi-page folders, folder-scoped search, all-documents mode,
  empty/shrunken results, errors, and navigation URL preservation.
- Browser verification with an isolated mock backend: switching folders from page two,
  20/5-row pages, search preservation, reload/back/forward, and selected-folder deletion.
  Desktop (1440×1000) and mobile (390×844) rendered without runtime/console errors.
- **Deployment:** existing databases require `search_pagination_migration.sql`, then
  `folder_aware_pagination_migration.sql`, after RPC auth hardening. Hosted application
  and database smoke testing remains pending; no live migrations were applied here.

### 16. Atomic, ownership-safe folder deletion — ✅
- The delete route calls one `delete_folder` RPC; document moves, child-folder
  reparenting, and deletion commit together or roll back together.
- Database identity comes from `auth.uid()`; missing/foreign-owned folders return 404.
- User folder rows lock in deterministic order. Foreign-owner references are rejected
  before mutation so legacy cross-owner references cannot be followed by cascade.
- Unauthenticated callers and the `anon` role cannot execute deletion.
- Database regression coverage verifies an injected failure after both updates,
  ownership rejection, execution grants, missing folders, child/grandchild preservation,
  and root-folder deletion. Tests run in embedded PostgreSQL with Supabase auth/storage
  stubs against both fresh schema and the existing-database migration sequence.
- **Deployment:** apply `safe_folder_deletion_migration.sql` to existing databases.
  Hosted deployment and concurrent-request smoke testing remain pending.

### 17. Migration instructions and completion status — ✅
- README upgrade instructions include pagination, folder-aware search, and safe deletion
  in dependency order; fresh installs use only `schema.sql`.
- Historical search migrations must precede the new folder-aware migration to avoid
  recreating obsolete overloads. Upgrade and repeated application were locally tested.
- The README links to this tracker instead of the missing `PROJECT_STATUS.md`.
- Database regression suite: `supabase/tests/folder_workflows.sql`. Against a disposable
  Supabase test database, run the command below. It requires a privileged test connection and rolls
  back its fixtures and injected trigger. Never run test fixtures against production.

```bash
psql "$DOCFORGE_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/folder_workflows.sql
```

## Remaining work from the 2026-09-28 review

- ⬜ Vault-wide storage totals and folder counts (currently page-scoped).
- ⬜ PDF conversion for text/Markdown; the UI currently offers an unsupported action.
- ⬜ Existing lint findings: React effect/state issues and version-history dependencies.
- ⬜ Rate limiting for uploads, API-key creation, and public API routes.
- ⬜ Audit logging for key, deletion, move, and export activity.
- ⬜ Public API pagination.
- ⬜ Broader integration/end-to-end coverage and keyboard/touch folder accessibility.
- ⬜ Share links, tagging UI, OCR/Word text extraction, and gallery improvements.

---

## Medium impact

### 4. Duplicated formatting helpers (`formatBytes`) — ✅
Defined 3× (`documentTableTypes.tsx`, `AnalyticsDashboard.tsx`, `VersionHistoryModal.tsx`)
plus a 4th variant `formatFileSize` in `UploadForm.tsx`.
- **Plan:** consolidate into `src/lib/format.ts`.

### 5. File-type / extension logic open-coded in 8 files — ✅
`path.split(".").pop()` and file-type mapping repeated across `page.tsx`, `DocumentTableCore.tsx`,
`ExportButton.tsx`, and several routes.
- **Plan:** `src/lib/fileType.ts` with `getFileExtension`, `getFileTypeFromPath`, `getFileIcon`.

### 6. `BUCKET_NAME` redeclared in 9 files — ✅
`const BUCKET_NAME = "DocForgeVault"` copy-pasted across routes.
- **Plan:** `src/lib/storage.ts` exporting `BUCKET_NAME`.

### 7. `DocumentTableCore` renders the action toolbar twice — ✅
Mobile-card and desktop-table branches each render Preview/Export/View/History/Delete (~25 dup lines).
- **Plan:** extract `<DocumentActions doc onVersionHistory />`.

### 8. `getData`'s two branches duplicate the filter+sort tail — ✅
Search branch and no-search branch end with identical `filter → sortDocuments`.
- **Plan:** collapse to one tail after the branch selects the source query.

### 9. `last_used_at` write on every API-key request — ✅
`apiKeyAuth.ts` issues an `UPDATE` on every authenticated v1 request (write amplification).
- **Plan:** throttle — only update if `last_used_at` is older than ~1 min.

---

## Lower impact / polish

### 10. No `middleware.ts` for Supabase session refresh — ✅
Recommended `@supabase/ssr` pattern refreshes the auth cookie on navigation; without it sessions
can silently expire mid-use.
- Implemented as `src/proxy.ts` (Next.js 16 renamed the `middleware.ts` file convention to
  `proxy.ts` / `export function proxy`; `middleware.ts` still works but is deprecated).

### 11. Repeated inline SVGs — ✅
Chevrons, search, anvil etc. duplicated throughout `page.tsx` / `DashboardClient.tsx`.
- **Plan:** extract an `icons.tsx` set.

### 12. `DashboardClient` re-fetches `/api/folders` on mount — ✅
`page.tsx` (server) could pass folders down as props instead of a client round-trip (small N+1).

### 13. `pdf-parse` lazy `require()` → `await import()` — ✅
ESM consistency in `textExtractor.ts`.

### 14. Thin test coverage — ✅
Only `uploadMime.test.ts`. Pure functions (`extractTextFromHtml`, `sortDocuments`,
`isBlockedHostname`, `formatBytes`, file-type helpers) are easily testable.
- **Plan:** add tests alongside each extracted helper; widen the `test` npm script to all `*.test.ts`.
- `sortDocuments` extracted to `src/lib/sortDocuments.ts`, `isBlockedHostname` extracted to
  `src/lib/urlSafety.ts`, both now unit-tested alongside `extractTextFromHtml`.
  With the folder pagination regressions, the current suite has 65 tests across 8 files.

---

## Changelog

- _2026-09-28_ — Completed #15–17 in the repository: folder-aware pagination,
  atomic folder deletion, and migration/status documentation. Added TypeScript
  regressions and a rollback-only PostgreSQL suite; fresh and upgrade definitions
  verified locally. Hosted migrations and authenticated live smoke tests pending.
- _2026-06-17_ — Review completed; tracker created. Starting with the safe pure-refactor slice:
  #6 (storage), #4 (format), #5 (fileType), #1 (requireUser), #14 (tests).
- _2026-06-21_ — Completed #1 for session API routes: all non-v1 routes now use
  `requireUser`, repeated document ownership checks use `assertOwned`, route auth errors are
  handled through `handleRouteError`, and `routeAuth` has focused tests.
- _2026-06-29_ — Completed #4, #5, #6: all remaining inline `BUCKET_NAME`, `formatBytes`/`formatFileSize`,
  and `.split(".").pop()` extension patterns migrated to shared lib helpers. Also fixed
  `getFileExtension` to return `""` for paths with no extension. Added tests for `format.ts`
  and `fileType.ts` (partial progress on #14 — 28 tests across 4 files).
- _2026-07-07_ — Completed #2, #7, #8, #9, #10, #11, #12, #13, #14. `authenticateApiKey` now
  throws `AuthError` instead of returning a bespoke result union, so all three v1 routes share the
  session routes' `errorResponse`/`handleRouteError` envelope. `getData` collapsed to one
  filter+sort tail; `last_used_at` writes throttled to once per 60s; `pdf-parse` loaded via
  `await import()` (added `src/types/pdf-parse.d.ts` ambient declaration). Extracted
  `<DocumentActions>` to dedupe the mobile/desktop toolbars, a shared `src/components/icons.tsx`
  to dedupe inline SVGs, and `src/lib/sortDocuments.ts` / `src/lib/urlSafety.ts` so those helpers
  are unit-tested (56 tests across 8 files). `page.tsx` now fetches folders server-side and passes
  them to `DashboardClient` as `initialFolders`, which only re-fetches after a mutation signal.
  Added `src/proxy.ts` for Supabase session-cookie refresh — Next.js 16 renamed the
  `middleware.ts` convention to `proxy.ts`/`export function proxy`, so this repo uses the new name
  directly rather than the deprecated one.
  #3 (pagination) deliberately left for a future pass — it requires a `search_documents` SQL
  migration the user has to run by hand in the Supabase SQL editor, so it wasn't bundled with
  these zero-migration refactors.
