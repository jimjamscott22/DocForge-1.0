# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `web/` directory:

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint check
npm run test     # Run tests (minimal — only uploadMime.test.ts)
npm start        # Start production server
```

## Environment Setup

Copy `web/env.example` to `web/.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Server-side only, never exposed to client
```

Database: run all migrations from `supabase/schema.sql` in Supabase SQL editor. If database predates the latest search update, also run `supabase/search_folder_context_migration.sql`.

## Architecture

**DocForge** is a document vault — Next.js 16 (App Router) frontend + Supabase (PostgreSQL, Auth, Storage) backend.

### Key Patterns

**Server vs. Client split:** `src/app/page.tsx` is a server component that fetches session/data and passes it down to `DashboardClient` (the interactive shell). All state and user interactions live in `DashboardClient` and its children.

**Two Supabase clients:**
- `src/lib/supabaseServerClient.ts` — for API routes and server components; reads cookies via `@supabase/ssr`
- `src/lib/supabaseClient.ts` — browser client for client components

**API routes** live in `src/app/api/` and use the server client. Public/external access goes through `src/app/api/v1/` (API key auth via SHA-256 hash comparison in `src/lib/apiAuth.ts`).

**RLS enforced at DB level:** Every Supabase query is scoped to the authenticated user via Row-Level Security policies. The service role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS — only use it server-side when intentionally needed.

### Data Flow

1. OAuth (Google/GitHub) → `src/app/auth/callback/route.ts` sets session cookie
2. `page.tsx` reads session server-side, fetches documents/folders, renders `DashboardClient`
3. File uploads hit `src/app/api/upload/route.ts`: validates type/size → extracts text (`src/lib/textExtractor.ts`) → saves to Supabase Storage + DB
4. Full-text search uses a PostgreSQL `search_vector` generated column on the documents table, queried via `search_documents` RPC
5. Analytics events are fire-and-forget (`void` pattern) via `POST /api/analytics`

### Component Tree

```
layout.tsx — ToastProvider + ErrorProvider
└── page.tsx (server)
    └── DashboardClient (client)
        ├── FolderTree (drag/drop folder sidebar)
        ├── DocumentTable (search, bulk ops, previews)
        ├── AnalyticsDashboard
        └── ApiKeyManager
```

### Database Schema

9 tables: `profiles`, `categories`, `tags`, `documents`, `document_tags`, `folders`, `document_analytics`, `api_keys`. The `documents` table has a generated `search_vector` tsvector column indexed for full-text search. All user data is scoped by `created_by` (user UUID).

## Tech Stack

- Next.js 16, React 19, TypeScript 5, Tailwind CSS v4
- Supabase (PostgreSQL + Auth + Storage)
- `pdf-parse` for PDF text extraction
- `react-markdown` + `remark-gfm` for content preview
- ESLint 9, tsx for test execution
