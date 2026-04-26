# DocForge Web

This is the Next.js application for DocForge.

---

## Quick Start

### Requirements

- Node.js 20+
- npm
- a Supabase project with OAuth providers configured

### Setup

1. Install dependencies

```bash
npm install
```

2. Copy `env.example` to `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Enable Google and/or GitHub in Supabase Auth and add:

- `http://localhost:3000/auth/callback`

4. Run `../supabase/schema.sql`

5. If needed for an older database, also run:

- `../supabase/search_folder_context_migration.sql`

6. Start the app

```bash
npm run dev
```

---

## What The App Includes

- OAuth sign-in and sign-out
- uploads to Supabase Storage
- full-text search
- folder tree with nested folders and drag/drop moves
- document previews for text, markdown, and PDF
- exports, analytics, and API key management
- `/api/v1/documents` endpoints for external integrations

---

## Important Paths

- `src/app/page.tsx` - dashboard shell and server-side document loading
- `src/components/DashboardClient.tsx` - folder, analytics, and API key panels
- `src/components/DocumentTable.tsx` - table actions and bulk actions
- `src/app/api/` - app routes for upload, folders, documents, analytics, keys, and health
- `src/lib/` - Supabase clients, API key auth, errors, and text extraction

---

## Public API Summary

Use an API key created in the UI and pass it as:

```text
Authorization: Bearer <your_api_key>
```

Routes:

- `GET /api/v1/documents`
- `GET /api/v1/documents/:id`
- `GET /api/v1/documents/:id/download`

---

## Validation

```bash
npm run lint
npm run build
```

---

## Docker

You can build and run the app as a production container.

Important:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by browser code, so they must be present at image build time
- `SUPABASE_SERVICE_ROLE_KEY` is used server-side and should also be provided to the container at runtime

### Build the image

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key \
  --build-arg SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  -t docforge-web \
  .
```

### Run the container

```bash
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  docforge-web
```

Then open `http://localhost:3000` in a browser.

### Notes

- Rebuild the image if either `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` changes
- If you use Supabase OAuth, add the deployed app URL and callback URL to your Supabase Auth settings, for example `http://localhost:3000/auth/callback`
