# DocForge

DocForge is a full-stack document vault for developers and technical teams. It combines Supabase authentication and storage with document organization, search, previews, version history, analytics, exports, and API access in a single Next.js application.

## Features

- Google and GitHub OAuth through Supabase Auth
- Validated uploads to Supabase Storage with progress and a 50 MB size limit
- Web-page imports from public HTTP and HTTPS URLs
- PostgreSQL full-text search over document titles and extracted content
- Nested folders, drag-and-drop moves, sorting, filtering, bulk open, and bulk delete
- Text, Markdown, and in-app PDF previews
- Document version history with restoration
- PDF and Markdown-compatible exports
- Analytics for views, previews, downloads, exports, and storage usage
- API-key management and read-only `/api/v1/documents` endpoints
- Responsive desktop and mobile document views

## Technology

| Area | Technology |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Data | Supabase PostgreSQL with row-level security |
| Authentication | Supabase Auth with Google and GitHub OAuth |
| Storage | Supabase Storage with signed URLs |
| Search | PostgreSQL full-text search |
| Deployment | Node.js standalone build and Docker Compose |

## Repository Layout

```text
DocForge-1.0/
|-- web/                 Next.js application, tests, and container build
|-- supabase/            Consolidated schema and incremental SQL migrations
|-- docs/                Project status, refactoring notes, and plans
|-- docker-compose.yml   Production-style local container setup
|-- start_dev.sh         Unix development launcher
`-- start_dev.ps1        PowerShell development launcher
```

Contributor and coding-agent conventions are documented in [AGENTS.md](AGENTS.md). Most application work happens inside `web/`.

## Prerequisites

- Git
- Node.js 22 and npm recommended, matching the container image
- A Supabase project
- Docker with Compose v2, optional

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/jimjamscott22/DocForge-1.0.git
cd DocForge-1.0/web
npm ci
```

### 2. Configure the environment

Create the local environment file from the tracked example:

```bash
cp env.example .env.local
```

Set these values in `web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it in browser code or commit it to the repository. Environment files are ignored by Git.

Restart the development server after changing environment values.

### 3. Initialize the database

For a new Supabase project, run the complete [`supabase/schema.sql`](supabase/schema.sql) file in the Supabase SQL editor. It includes the base schema, row-level security policies, storage configuration, document versioning, folders, analytics, API keys, and the current search function.

Do not run the individual migration files after `schema.sql` on a fresh database.

For an existing DocForge database, back it up and apply only the migrations that have not already been deployed. Use this order when upgrading from an older base schema:

1. [`supabase/folder_migration.sql`](supabase/folder_migration.sql)
2. [`supabase/analytics_migration.sql`](supabase/analytics_migration.sql)
3. [`supabase/api_keys_migration.sql`](supabase/api_keys_migration.sql)
4. [`supabase/versioning_migration.sql`](supabase/versioning_migration.sql)
5. [`supabase/search_folder_context_migration.sql`](supabase/search_folder_context_migration.sql)

The search-folder migration expects folder support to exist first. Keep deployed environments synchronized with the migration files in this repository.

### 4. Configure OAuth

Enable Google, GitHub, or both under Supabase Auth providers. Add this local callback URL to the allowed redirect URLs:

```text
http://localhost:3000/auth/callback
```

For deployments, also allow the equivalent callback under the deployed application origin.

### 5. Start DocForge

From `web/`:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The health endpoint is available at [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Development Commands

Run these commands from `web/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run lint` | Run ESLint across the application |
| `npm run test` | Run the TypeScript unit tests |
| `npm run build` | Create a production build and run Next.js checks |
| `npm run start` | Serve an existing production build |

Before submitting application changes, run:

```bash
npm run lint
npm run test
npm run build
```

## Docker Compose

Run Docker Compose from the repository root. Browser-facing `NEXT_PUBLIC_*` values are embedded during `next build`, so changing either value requires rebuilding the image.

### Use `web/.env.local`

This keeps local development and Docker on the same environment source:

```bash
docker compose --env-file web/.env.local up --build
```

### Use a repository-root `.env`

Copy the configured file, then start Compose:

```bash
cp web/.env.local .env
docker compose up --build
```

PowerShell equivalent:

```powershell
Copy-Item web/.env.local .env
docker compose up --build
```

Both `.env` and `web/.env.local` are ignored by Git. The public Supabase values must be available while the image builds; the service-role key must remain secret and be available to the running server.

### Docker troubleshooting

- If OAuth works with `npm run dev` but fails in Docker, verify which environment file Compose loaded and rebuild the image.
- Make sure the Supabase redirect list contains the callback URL for the exact browser origin you are using.
- If Compose cannot connect to the Docker API, start Docker Desktop or the Docker daemon.
- Check container readiness with `curl http://localhost:3000/api/health`.

## Storage and Content Processing

- Storage bucket: `DocForgeVault`
- Maximum upload size: 50 MB
- Supported uploads: PDF, TXT, MD, DOC, DOCX, PNG, JPG, JPEG, and GIF
- Extracted upload content: plain text, Markdown, and PDF text
- Imported content: text extracted from public HTML pages
- Downloads: one-hour signed Supabase Storage URLs

## Public API

Create an API key in the DocForge dashboard. The raw key is displayed once, so store it securely.

All public API routes use the base path `/api/v1/documents` and require a bearer token:

```text
Authorization: Bearer <your_api_key>
```

### List documents

```bash
export DOCFORGE_API_KEY="your_api_key"

curl --fail-with-body \
  -H "Authorization: Bearer ${DOCFORGE_API_KEY}" \
  http://localhost:3000/api/v1/documents
```

Successful response:

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
      "folder_id": null
    }
  ]
}
```

### Endpoints

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/api/v1/documents` | Documents owned by the API-key user |
| `GET` | `/api/v1/documents/:id` | One owned document record |
| `GET` | `/api/v1/documents/:id/download` | A one-hour signed download URL and title |

The API currently returns all matching document metadata and does not paginate list responses.

### Errors

Errors include a stable `code` and a user-facing message:

```json
{
  "error": "Invalid API key",
  "code": "AUTH_REQUIRED"
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| `200` | Request succeeded |
| `401` | Authorization header or API key is missing, invalid, or revoked |
| `404` | The requested document does not exist or is not owned by the key's user |
| `500` | DocForge could not complete the request |

## Roadmap

- Rate limiting for uploads, API-key creation, and public API routes
- Transactional handling for multi-step destructive folder operations
- Audit logging for key, delete, move, and export activity
- Expanded unit coverage plus integration and end-to-end tests
- Improved dialog accessibility and keyboard-friendly drag-and-drop workflows
- Pagination or virtualization for large document vaults
- Share links, tagging UI, image gallery improvements, and OCR

## Project Documentation

- [Contributor and agent guidance](AGENTS.md)
- [Project status](docs/PROJECT_STATUS.md)
- [Refactoring notes](docs/REFACTORING.md)
- [Web application guide](web/README.md)

## License

DocForge is available under the [MIT License](LICENSE).
