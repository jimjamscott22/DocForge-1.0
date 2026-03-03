# DocForge Project Status

**Last Updated**: 2026-03-02  
**Status**: Phase 3 feature set is mostly complete; production hardening is still needed.

---

## Review Scope

This status update is based on a direct review of:

- `web/src/app` routes and pages
- `web/src/components` UI behavior
- `web/src/lib` auth/error/search helpers
- `supabase/schema.sql` and migration files
- Current docs and setup files

Verification checks run during review:

- `npm run build` -> passes
- `npm run lint` -> fails (2 errors, 2 warnings)

---

## Verified Complete

### Core app capabilities

- Authentication via Supabase OAuth (Google/GitHub)
- Secure upload to Supabase Storage with size/type validation and progress
- Searchable document metadata with full-text search support (`content_text` + `search_vector`)
- Document open/download via signed URLs
- Text and Markdown in-app preview
- PDF in-app preview modal
- Single delete and bulk delete
- Bulk open, sort, and file-type filtering

### Folder organization (confirmed complete)

- Nested folders with create, rename, delete
- Drag-and-drop document-to-folder movement
- Move-to-folder modal support
- Folder-aware dashboard filtering
- Database support in schema and migration files (`folders`, `documents.folder_id`, indexes, RLS)

### Phase 3 additions present

- Export tools:
  - PDF export endpoint for native PDF files
  - Markdown export endpoint for text/markdown files
- Analytics dashboard with totals, activity charts, and top-document logic
- API key management UI (create/list/revoke with one-time key reveal)
- Public API route set under `/api/v1/documents`

---

## Corrections From This Review

The following items were either overstated previously or need follow-up before calling the app fully production-ready.

1. API key auth path needs hardening for true external use
   - `authenticateApiKey()` uses the standard server client (`web/src/lib/apiKeyAuth.ts`), which depends on request auth context and RLS.
   - For non-browser/external clients, this can block key lookup unless handled with a dedicated server-side client pattern.

2. Analytics "view" metric is not currently emitted
   - Dashboard queries `event_type = 'view'`, but current routes only log `download`, `preview`, and `export`.
   - Result: "Views" and "Top viewed" can stay empty/inaccurate.

3. Search results lose folder context
   - `search_documents` return shape does not include `folder_id`.
   - When searching, folder-aware UI logic cannot fully preserve placement context.

4. Move modal only renders two folder depths
   - Tree supports nesting, but `MoveDocumentModal` currently presents root + first child level only.
   - Deeply nested folders are harder to target from the modal.

5. Lint health is not clean
   - Current lint run reports:
     - link usage issue in `web/src/app/error.tsx`
     - callback ordering/dependency issue in `web/src/components/ToastProvider.tsx`
     - unused import warning in `web/src/components/ErrorBoundary.tsx`

---

## Remaining Improvements (Prioritized)

### P0 - Reliability and security

- Finalize API key auth architecture for external clients (server-only key verification flow)
- Add route-level rate limiting for upload, key creation, and public API endpoints
- Wrap multi-step destructive folder operations in transactional DB logic (or RPC) for consistency
- Add audit logging for sensitive actions (key create/revoke, delete, move)

### P1 - Product quality

- Add automated tests:
  - unit tests for lib and route validation
  - integration tests for API routes and RLS assumptions
  - e2e tests for auth/upload/folder/document workflows
- Support fully recursive folder selection in move modal
- Add pagination/virtualization for large document sets
- Improve accessibility around dialog focus management and drag-and-drop keyboard alternatives

### P1 - Documentation accuracy

- Update root `README.md` to match actual implementation status
- Update `web/README.md` (still describes old local-file-storage behavior)
- Add concise API docs for `/api/v1` (auth format, response shapes, error codes)

### P2 - Feature expansion

- Document versioning and rollback
- Tagging UI using existing `tags` and `document_tags` schema
- Public/time-limited share links
- Image gallery/lightbox preview and richer media metadata
- Optional OCR pipeline for image/PDF text extraction

---

## Known Issues

- Lint currently fails (see Corrections section).
- Analytics "view" events are not currently emitted.
- Search mode does not include folder context in returned rows.
- API key external-client flow needs hardening/verification.

---

## Current Assessment

DocForge has moved beyond MVP and includes substantial Phase 3 functionality, including folder organization, exports, analytics UI, and API key management. Folder organization is complete in core behavior. The remaining work is mostly production hardening, correctness polish, and test/documentation maturity rather than missing baseline features.
