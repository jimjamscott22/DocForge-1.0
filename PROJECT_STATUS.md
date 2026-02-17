# DocForge Project Status

**Last Updated**: 2026-02-17
**Status**: Fully Functional - Core features working, document management expanding

---

## Current Status

### What's Working
- **File Upload System**: Multi-file upload with real-time progress tracking and validation
- **Document Viewing**: Open documents via signed URLs (1-hour expiry)
- **Text File Preview**: In-app preview modal for `.txt` and `.md` files with styled monospace viewer
- **Document Deletion**: Delete documents from the vault with confirmation dialog, removes both storage file and database record
- **Search**: Case-insensitive document title search
- **Authentication**: OAuth via Google and GitHub through Supabase Auth
- **Database**: Supabase PostgreSQL with row-level security (RLS) policies
- **Storage**: Supabase Storage bucket ("DocForgeVault") with per-user file scoping
- **Error Handling**: Centralized error infrastructure with toast notifications, error boundaries, and structured error codes
- **Loading States**: Spinners, skeleton loaders, and upload progress indicators

### Recent Changes
- Added markdown rendering in preview modal using `react-markdown` + `remark-gfm` (headings, lists, code blocks, tables, etc.)
- Added bulk actions: checkbox selection, batch delete, and batch open for multiple documents
- Extracted document table into `DocumentTable` client component with selection state
- Added `POST /api/documents/bulk-delete` API endpoint (max 50 per request, ownership verified)
- Added document deletion (DELETE API endpoint + confirmation dialog UI)
- Added in-app text/markdown file preview modal with content API endpoint

---

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 16 (React 19) + TypeScript + TailwindCSS v4
- **Backend**: Next.js API routes (no separate server)
- **Database**: Supabase (PostgreSQL) with RLS
- **Storage**: Supabase Storage bucket "DocForgeVault"
- **Authentication**: Supabase Auth (Google & GitHub OAuth)

### Key Components

1. **Frontend** (`web/src/`)
   - `app/page.tsx` - Main dashboard with document list, search, upload sidebar
   - `components/UploadForm.tsx` - File upload with XHR progress tracking
   - `components/ViewDocumentButton.tsx` - Open document in new tab via signed URL
   - `components/DocumentTable.tsx` - Document list with checkbox selection and bulk actions
   - `components/DeleteDocumentButton.tsx` - Delete with confirmation dialog
   - `components/TextPreviewModal.tsx` - In-app text/markdown preview (renders `.md` with `react-markdown`)
   - `components/ToastProvider.tsx` - Toast notification system
   - `components/ErrorProvider.tsx` - Centralized error handling context
   - `components/ErrorBoundary.tsx` - React error boundary
   - `components/Spinner.tsx` - Loading spinner variants (sm/md/lg, overlay, inline)
   - `components/Skeleton.tsx` - Skeleton loader components
   - `components/AuthButtons.tsx` - OAuth sign-in/sign-out buttons
   - `components/ReferenceLinksSidebar.tsx` - Quick reference links

2. **API Routes** (`web/src/app/api/`)
   - `POST /api/upload` - Upload file to vault
   - `GET /api/documents/[id]/download` - Get signed download URL
   - `GET /api/documents/[id]/content` - Get text file content for in-app preview
   - `DELETE /api/documents/[id]` - Delete a document (storage + database)
   - `POST /api/documents/bulk-delete` - Batch delete up to 50 documents
   - `GET /api/health` - Health check

3. **Auth Routes** (`web/src/app/auth/`)
   - `GET /auth/callback` - OAuth callback handler
   - `POST /auth/signout` - Sign out and clear session

4. **Database Schema** (`supabase/schema.sql`)
   - `documents` table with RLS policies (owner + admin access)
   - `document_tags` and `tags` tables for categorization
   - Storage bucket RLS policies for per-user file access control

### File Storage
- Files stored in Supabase Storage bucket "DocForgeVault"
- Path format: `{user_id}/{timestamp}-{uuid}-{filename}`
- Maximum file size: 50 MB
- Allowed types: PDF, TXT, MD, DOC, DOCX, PNG, JPG, JPEG, GIF

---

## Configuration

### Environment Variables
- `.env.local` - Contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (gitignored)

### Important Files
- `.claude/settings.local.json` - Claude permissions configuration
- `.gitignore` - Ignores sensitive files and build artifacts
- `supabase/schema.sql` - Database schema, RLS policies, and storage bucket setup

---

## Potential Future Upgrades

### Short Term
- **Drag-and-drop upload**: Add a drop zone to the upload form for easier file uploading
- ~~**Markdown rendering**: Render `.md` files with formatted headings, lists, and code blocks in the preview modal~~ ✅ Done
- ~~**Bulk actions**: Select multiple documents for batch deletion or download~~ ✅ Done
- **Sort and filter**: Sort the document table by name, date, size, or file type; filter by type
- **Document tagging**: Use the existing `tags` / `document_tags` tables for organization and filtering

### Medium Term
- **Folder organization**: Nested folder structure for grouping documents
- **File versioning**: Track and restore previous versions of a document
- **PDF preview**: In-app PDF viewer instead of opening in a new tab
- **Image preview**: Thumbnail gallery and lightbox for uploaded images
- **Document sharing**: Generate public or time-limited share links for individual documents
- **Multi-user collaboration**: Share vaults or folders with other authenticated users

### Long Term
- **Full-text search**: Index document contents for searching within file text, not just titles
- **AI-powered features**: Document summarization, auto-tagging, content extraction
- **OCR**: Extract text from scanned documents and images
- **Third-party integrations**: Import from Google Drive, Dropbox, or OneDrive
- **Mobile / PWA**: Progressive web app or native mobile client for on-the-go access
- **Audit log**: Track document uploads, views, deletions, and shares for compliance
- **Alternative storage backends**: Option to use S3, Cloudflare R2, or DigitalOcean Spaces instead of or alongside Supabase Storage

---

## Known Issues

- None currently identified

---

## Quick Start

```bash
cd web
cp env.example .env.local   # Fill in Supabase URL and anon key
npm install
npm run dev                  # Starts on http://localhost:3000
```
