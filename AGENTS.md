# AGENTS.md

Guidance for coding agents working in this repository.

## Overview

DocForge is a document vault application built with:

- Next.js 16 App Router frontend in `web/`
- React 19 + TypeScript
- Tailwind CSS v4
- Supabase for Auth, Postgres, and Storage

Primary workflow:

1. User authenticates with Supabase OAuth
2. Server components load session and document data
3. Client components handle document management, folders, previews, analytics, and API keys
4. Uploads go through API routes and persist into Supabase Storage + database tables

## Working Directory

Most app work happens in:

- [web](/home/jimjamscozz22/Desktop/GitHub/repo/DocForge-1.0/web)

Run frontend commands from `web/`:

```bash
npm run dev
npm run build
npm run lint
npm run test
```

## Environment Setup

The frontend reads environment variables from:

- [web/.env.local](/home/jimjamscozz22/Desktop/GitHub/repo/DocForge-1.0/web/.env.local)

Required keys:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` must be the standard Supabase project URL like `https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be the public anon key
- `DATABASE_URL` can use the Supabase session pooler or transaction pooler if IPv4 connectivity is needed
- If env values change while the dev server is running, restart `npm run dev`

Do not rely on repo-root `.env` files for the Next app.

## Architecture Notes

Important files:

- [CLAUDE.md](/home/jimjamscozz22/Desktop/GitHub/repo/DocForge-1.0/CLAUDE.md)
- [web/src/app/page.tsx](/home/jimjamscozz22/Desktop/GitHub/repo/DocForge-1.0/web/src/app/page.tsx)
- [web/src/components/DashboardClient.tsx](/home/jimjamscozz22/Desktop/GitHub/repo/DocForge-1.0/web/src/components/DashboardClient.tsx)
- [web/src/components/DocumentTable.tsx](/home/jimjamscozz22/Desktop/GitHub/repo/DocForge-1.0/web/src/components/DocumentTable.tsx)
- [web/src/components/FolderTree.tsx](/home/jimjamscozz22/Desktop/GitHub/repo/DocForge-1.0/web/src/components/FolderTree.tsx)
- [web/src/lib/supabaseServerClient.ts](/home/jimjamscozz22/Desktop/GitHub/repo/DocForge-1.0/web/src/lib/supabaseServerClient.ts)

Server/client split:

- `src/app/page.tsx` is a server component
- `DashboardClient` owns interactive dashboard state
- Supabase browser and server clients are split across `src/lib/`

## Frontend Direction

The current UI direction is a restrained, forge-toned product workspace rather than a marketing-heavy dashboard.

Recent upgrades:

- Authenticated dashboard now has a clearer workspace control header with search, sort, type filters, and status chips
- Sidebar gained better hierarchy with sticky behavior and simplified metrics
- Documents area has a stronger operational header and cleaner utility copy
- `DocumentTable` now supports a mobile card layout instead of forcing the desktop table on small screens
- `ReferenceLinksSidebar` was redesigned into a flatter rail-plus-list layout with less card nesting
- Global styling now includes a stronger ambient background treatment while preserving the dark forge theme

When editing the UI:

- Prefer utility-first product copy over marketing copy inside authenticated surfaces
- Avoid adding more nested cards unless the card itself is the interaction
- Keep information density readable and calm
- Preserve the existing typography and forge/orange accent system unless there is a strong reason to change it
- Maintain responsive behavior for both mobile and desktop

## Validation

Before finishing frontend work, run:

```bash
cd web
npm run lint
```

If relevant, also run:

```bash
npm run build
npm run test
```

## Editing Rules

- Do not revert unrelated user changes
- Check `git status` before and after substantial edits
- Prefer small, targeted changes over broad rewrites unless explicitly requested
- Keep secrets out of committed documentation and source files
