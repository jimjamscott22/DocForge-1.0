# DocForge-1.0

DocForge is a full-stack document vault for developers and technical teams. It combines Supabase auth/storage, full-text search, folder organization, previews, analytics, and API-key access in a single Next.js app.

Contributor and agent guidance lives in [AGENTS.md](/home/jimjamscozz22/Desktop/GitHub/repo/DocForge-1.0/AGENTS.md). Read that first for repo conventions, environment setup details, and the current frontend direction.

---

## Current Feature Set

- Google and GitHub OAuth via Supabase Auth
- Upload to Supabase Storage with progress, size checks, and file-type validation
- Full-text search over titles and extracted text content
- Document table with sorting, filtering, bulk open, and bulk delete
- Nested folders with drag-and-drop moves and folder filtering
- Text/Markdown preview and in-app PDF preview
- Export helpers for PDF files and Markdown-compatible text files
- Analytics dashboard for views, previews, downloads, exports, and storage totals
- API key management plus `/api/v1/documents` endpoints for external access

---

## Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- Backend: Next.js App Router APIs
- Database/Auth/Storage: Supabase PostgreSQL, Auth, Storage, and RLS
- Search: PostgreSQL full-text search with extracted PDF/text content

---

## Project Layout

- `web/` - Next.js application
- `supabase/schema.sql` - base schema plus Phase 3 additions
- `supabase/versioning_migration.sql` - document version table and upload/restore RPCs
- `supabase/folder_migration.sql` - folder migration
- `supabase/analytics_migration.sql` - analytics migration
- `supabase/api_keys_migration.sql` - API key migration
- `supabase/search_folder_context_migration.sql` - search RPC update for `folder_id`

---

## Local Setup

1. Clone the repository and move into `web/`

```bash
git clone https://github.com/yourusername/DocForge-1.0.git
cd DocForge-1.0/web
```

2. Install dependencies

```bash
npm install
```

3. Copy `web/env.example` to `web/.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

4. In Supabase, enable Google and/or GitHub OAuth and add:

- `http://localhost:3000/auth/callback`

5. Run the SQL in `supabase/schema.sql`

6. If your database was created before document versioning was added, also run:

- `supabase/versioning_migration.sql`

7. If your database was created before the latest search update, also run:

- `supabase/search_folder_context_migration.sql`

8. Start the app

```bash
npm run dev
```

---

## Running with Docker Compose

If you prefer to run the application using Docker, a `docker-compose.yml` file is provided in the root directory.

Because Next.js embeds browser-facing environment variables (`NEXT_PUBLIC_*`) at build time, these variables must be provided as build arguments when constructing the image. Docker Compose reads them from the `.env` file in the root directory.

1. **Create a `.env` file** in the project root directory (same folder as `docker-compose.yml`) and define your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Build and start the container**:

   ```bash
   docker compose up --build
   ```

   *(Or `docker-compose up --build` if using Compose V1)*

3. **Access the application**:

   Once the build is complete and the container is running, access the web app at [http://localhost:3000](http://localhost:3000).

---

## Storage and Search Notes

- Files are stored in Supabase Storage bucket `DocForgeVault`
- Max upload size is 50 MB
- Supported upload types: PDF, TXT, MD, DOC, DOCX, PNG, JPG, JPEG, GIF
- Search uses PostgreSQL full-text search over `title` and extracted `content_text`
- Text extraction currently supports text/markdown and PDF content

---

## Public API

Base path: `/api/v1/documents`

Auth header:

```text
Authorization: Bearer <your_api_key>
```

Endpoints:

- `GET /api/v1/documents` - list document metadata
- `GET /api/v1/documents/:id` - fetch one document record
- `GET /api/v1/documents/:id/download` - get a signed download URL

Typical list response:

```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "API Spec",
      "storage_path": "user-id/file.pdf",
      "file_size_bytes": 12345,
      "created_at": "2026-03-09T00:00:00.000Z",
      "updated_at": "2026-03-09T00:00:00.000Z",
      "folder_id": "uuid-or-null"
    }
  ]
}
```

Common error responses:

```json
{ "error": "Missing or invalid Authorization header" }
```

```json
{ "error": "Invalid API key" }
```

```json
{ "error": "Document not found" }
```

---

## Next Priorities

- rate limiting for sensitive endpoints
- automated tests
- audit logging
- pagination/virtualization for large vaults
- versioning and sharing features
