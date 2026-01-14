This is the Next.js frontend for **DocForge**, a document management platform built with Next.js 16, Supabase, and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- A Supabase account and project ([supabase.com](https://supabase.com))
- Google and/or GitHub OAuth apps configured

### Setup Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   
   Copy `env.example` to `.env.local` and fill in your Supabase credentials:
   
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Enable OAuth providers**
   
   In your Supabase dashboard:
   - Go to **Authentication → Providers**
   - Enable **Google** and **GitHub**
   - Add the redirect URL: `http://localhost:3000/auth/callback`

4. **Run database migrations**
   
   Execute `supabase/schema.sql` in your Supabase SQL Editor to create:
   - `profiles` table with role-based access
   - `documents` table with RLS policies
   - `categories` and `tags` tables (for future phases)
   - Full-text search indexes

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000) and sign in with Google or GitHub.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── health/          # Health check endpoint
│   │   └── upload/          # File upload API (saves to local disk)
│   ├── auth/
│   │   ├── callback/        # OAuth callback handler
│   │   └── signout/         # Sign-out route
│   ├── layout.tsx           # Root layout with fonts
│   ├── page.tsx             # Main page (dashboard, upload, document list)
│   └── globals.css          # Tailwind styles
├── components/
│   ├── AuthButtons.tsx      # Sign in/out buttons (Google/GitHub)
│   └── UploadForm.tsx       # File upload form with validation
└── lib/
    └── supabaseClient.ts    # Supabase browser + server clients
```

## 🔐 Authentication

This app uses **Supabase OAuth** with Google and GitHub providers.

- **Sign in**: Click "Sign in with Google" or "Sign in with GitHub"
- **Callback**: OAuth redirects to `/auth/callback` which exchanges code for session
- **Session**: Stored in secure HTTP-only cookies via `@supabase/ssr`
- **Sign out**: POST to `/auth/signout` clears the session

## 📤 File Upload

Files are uploaded to `public/uploads/` for local development:

- **Max size**: 10MB
- **Allowed types**: PDF, TXT, MD, DOC, DOCX, PNG, JPG, JPEG, GIF
- **Storage**: Local disk (replace with Supabase Storage or S3 for production)
- **Metadata**: Saved to Supabase `documents` table with user ID, title, path, and size

## 🔍 Search & Viewing

- **Search**: Filter documents by title using the search bar (case-insensitive)
- **List**: Shows all documents for the authenticated user
- **View**: Click "View" to open the file in a new tab
- **RLS**: Row-level security ensures users only see their own documents

## 🛠️ Development

This project uses:

- **Next.js 16** with App Router
- **React 19** with Server Components
- **Supabase** for auth, database, and RLS
- **Tailwind CSS v4** for styling
- **TypeScript** for type safety

You can start editing pages by modifying files in `src/app/`. The page auto-updates as you edit.

## 🚨 Important: Local Storage Caveats

**Phase 1 MVP uses local file storage for rapid development.**

### Local Storage Behavior

- Files are saved to `public/uploads/` on your local machine
- The `public` folder is served statically by Next.js
- Files persist between restarts but are **not checked into Git** (`.gitignore` includes `public/uploads/`)

### Production Considerations

For production, **replace local storage** with:

1. **Supabase Storage** (recommended for Supabase users)
   - Create a bucket in Supabase Dashboard
   - Update `api/upload/route.ts` to use `supabase.storage.from('documents').upload()`
   - Update RLS policies for the bucket

2. **AWS S3 / GCS / Azure Blob**
   - Use respective SDK to upload files
   - Store signed URLs in the `storage_path` column
   - Consider CDN for faster delivery

3. **Vercel Blob Storage**
   - Simple integration with Vercel deployments
   - Use `@vercel/blob` package

### Migration Path

```typescript
// Current (Phase 1 - Local)
const fullPath = path.join(process.cwd(), "public", "uploads", filename);
await fs.writeFile(fullPath, buffer);

// Future (Production - Supabase Storage)
const { data, error } = await supabase.storage
  .from('documents')
  .upload(`${userId}/${filename}`, file);
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🚀 Deploy on Vercel

Before deploying to production:

1. Replace local file storage with Supabase Storage or S3
2. Add production OAuth redirect URLs in Supabase
3. Set environment variables in Vercel dashboard
4. Deploy via [Vercel Platform](https://vercel.com/new)

Check out [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
