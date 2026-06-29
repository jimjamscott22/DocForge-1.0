# DocForge Project Status

**Last Updated**: 2026-03-09  
**Status**: Phase 3 is implemented and the recent hardening/documentation pass is complete.

---

## Review Scope

This status reflects a direct review of:

- `web/src/app` routes and pages
- `web/src/components` UI behavior
- `web/src/lib` auth/error/search helpers
- `supabase/schema.sql` and migration files
- project documentation and setup files

Verification checks:

- `npm run lint` -> passes
- `npm run build` -> passes

---

## Verified Complete

### Core functionality

- Supabase OAuth authentication with Google and GitHub
- Secure upload to Supabase Storage with validation and progress feedback
- Full-text search over titles and extracted text content
- Signed URL open/download flow
- Text, Markdown, and PDF preview support
- Single delete and bulk delete
- Bulk open, sort, and file-type filtering

### Folder organization

- Nested folders with create, rename, and delete
- Drag-and-drop document moves in the folder tree
- Move-to-folder modal with recursive folder depth support
- Folder-aware dashboard filtering
- Database support in schema/migrations with RLS

### Phase 3 additions

- Export tools for PDF and Markdown-compatible content
- Analytics dashboard with totals, charts, and top-viewed documents
- API key management UI with one-time raw key display
- Public REST API under `/api/v1/documents`

---

## Recently Fixed

- API key auth now uses a dedicated server-side admin client, making external API-key access reliable
- Analytics `view` events are now emitted when users open documents; PDF previews emit `preview`
- Search results now include `folder_id`, restoring folder context during search
- Move modal now supports deeply nested folders, not just two levels
- Lint issues in the error page and shared UI helpers were resolved

---

## Remaining Improvements

### P0 - Reliability and security

- Add route-level rate limiting for uploads, key creation, and public API endpoints
- Wrap multi-step destructive folder operations in transactional DB logic or RPCs
- Add audit logging for key creation/revocation, deletes, moves, and exports

### P1 - Product quality

- Add unit, integration, and end-to-end tests
- Improve dialog accessibility and keyboard support for drag-and-drop workflows
- Add pagination or virtualization for very large document libraries

### P1 - Documentation and operations

- Keep Supabase migrations in sync with deployed environments
- Document deployment and migration order more explicitly
- Add example API clients or curl snippets for common `/api/v1` workflows

### P2 - Feature expansion

- Document versioning and rollback
- Tagging UI using existing `tags` and `document_tags` tables
- Share links for individual documents
- Image gallery/lightbox improvements
- OCR for scanned PDFs and images

---

## Known Issues

- No blocking issues identified in the current reviewed codebase
- `supabase/search_folder_context_migration.sql` must be applied in environments that were created before the search-folder update

---

## Current Assessment

DocForge is now a solid Phase 3 document vault with folder organization, previews, exports, analytics, and external API access. The highest-value remaining work is operational hardening, testing, and selective feature expansion rather than core workflow completion.
