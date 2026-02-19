import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import AuthButtons from "@/components/AuthButtons";
import UploadForm from "@/components/UploadForm";
import DocumentTable from "@/components/DocumentTable";
import ReferenceLinksSidebar from "@/components/ReferenceLinksSidebar";

export const dynamic = "force-dynamic";

type DocumentRow = {
  id: string;
  title: string;
  storage_path: string;
  file_size_bytes: number | null;
  created_at: string;
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function getData(search: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Failed to read session", sessionError);
  }

  if (!session) {
    return { session: null, documents: [] as DocumentRow[] };
  }

  let query = supabase
    .from("documents")
    .select("id,title,storage_path,file_size_bytes,created_at")
    .eq("created_by", session.user.id)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data: documents = [], error } = await query;

  if (error) {
    console.error("Failed to load documents", error);
  }

  return { session, documents: documents || [] };
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = typeof params?.q === "string" ? params.q : "";
  const { session, documents } = await getData(search);

  const isAuthed = Boolean(session);

  return (
    <main className="noise-bg relative min-h-screen bg-stone-900 text-stone-200 antialiased">
      <div className="glow-top relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 sm:px-8">

        {/* ── Header ── */}
        <header
          className="animate-fade-up flex flex-col justify-between gap-6 sm:flex-row sm:items-end"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* Anvil / forge icon */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forge-500/15 ring-1 ring-forge-500/25">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-forge-400">
                  <path d="M3 17h18v2H3v-2zm2-4h14l-2-6H7L5 13zm1-8h12v2H6V5z" fill="currentColor" />
                </svg>
              </div>
              <p className="font-sans text-sm font-semibold tracking-wide text-forge-400 uppercase">
                DocForge
              </p>
            </div>
            <h1 className="font-display text-4xl tracking-tight text-stone-50 sm:text-5xl">
              Your document vault
            </h1>
            <p className="max-w-lg text-base text-stone-400">
              Upload, organize, and access your documents from anywhere.
              Secured with row-level policies on Supabase.
            </p>
          </div>

          {/* Auth card */}
          <div
            className="animate-fade-up shrink-0 rounded-xl border border-stone-700/50 bg-stone-850/80 px-5 py-4 shadow-lg backdrop-blur-sm"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="mb-3 text-sm text-stone-400">
              {session?.user?.email ? (
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                    Signed in as
                  </p>
                  <p className="font-medium text-stone-200">{session.user.email}</p>
                </div>
              ) : (
                <p className="font-medium text-stone-300">Sign in to get started</p>
              )}
            </div>
            <AuthButtons isAuthenticated={isAuthed} />
          </div>
        </header>

        {/* ── Divider ── */}
        <div className="h-px bg-gradient-to-r from-transparent via-stone-700/60 to-transparent" />

        {!isAuthed ? (
          /* ── Unauthenticated state ── */
          <section
            className="animate-fade-up grid gap-6 sm:grid-cols-2"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="card-glow rounded-xl border border-stone-700/50 bg-stone-850/60 p-8 backdrop-blur-sm">
              <h2 className="font-display text-2xl text-stone-50">Get started</h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                Use Google or GitHub to sign in. Supabase handles authentication
                and redirects back here with a secure cookie session.
              </p>
              <ol className="mt-6 space-y-3 text-sm text-stone-300">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forge-500/15 text-xs font-bold text-forge-400">1</span>
                  <span>Copy <code className="rounded bg-stone-750 px-1.5 py-0.5 font-mono text-xs text-forge-300">.env.example</code> to <code className="rounded bg-stone-750 px-1.5 py-0.5 font-mono text-xs text-forge-300">.env.local</code></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forge-500/15 text-xs font-bold text-forge-400">2</span>
                  <span>Set your Supabase URL, anon key, and OAuth redirect to <code className="rounded bg-stone-750 px-1.5 py-0.5 font-mono text-xs text-forge-300">/auth/callback</code></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forge-500/15 text-xs font-bold text-forge-400">3</span>
                  <span>Run <code className="rounded bg-stone-750 px-1.5 py-0.5 font-mono text-xs text-forge-300">npm install && npm run dev</code></span>
                </li>
              </ol>
            </div>

            <div className="card-glow flex flex-col justify-center rounded-xl border border-stone-700/50 bg-stone-850/60 p-8 backdrop-blur-sm">
              <h3 className="font-display text-xl text-stone-50">Why sign in?</h3>
              <ul className="mt-5 space-y-4 text-sm text-stone-400">
                <li className="flex gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-forge-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Documents scoped to your account with RLS security</span>
                </li>
                <li className="flex gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-forge-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <span>Cloud storage accessible from any device</span>
                </li>
                <li className="flex gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-forge-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search and browse your personal library</span>
                </li>
              </ul>
            </div>
          </section>
        ) : (
          /* ── Authenticated dashboard ── */
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

            {/* Upload sidebar */}
            <section
              className="animate-fade-up lg:col-span-1"
              style={{ animationDelay: "0.15s" }}
            >
              <div className="card-glow rounded-xl border border-stone-700/50 bg-stone-850/60 p-6 backdrop-blur-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forge-500/15">
                    <svg className="h-4 w-4 text-forge-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-display text-lg text-stone-50">Upload</h2>
                    <p className="text-xs text-stone-500">PDF, images, text &middot; up to 50 MB</p>
                  </div>
                </div>
                <UploadForm />
              </div>

              <div
                className="animate-fade-up mt-4 rounded-xl border border-stone-700/50 bg-stone-850/40 p-5 backdrop-blur-sm"
                style={{ animationDelay: "0.25s" }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-stone-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Storage info
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">
                  Files are stored in Supabase Storage with row-level security.
                  Each document is tracked in the database for listing and search.
                </p>
              </div>

              <div
                className="animate-fade-up mt-4"
                style={{ animationDelay: "0.3s" }}
              >
                <ReferenceLinksSidebar />
              </div>
            </section>

            {/* Documents list */}
            <section
              className="animate-fade-up lg:col-span-2"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="card-glow rounded-xl border border-stone-700/50 bg-stone-850/60 p-6 backdrop-blur-sm">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forge-500/15">
                      <svg className="h-4 w-4 text-forge-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="font-display text-lg text-stone-50">Documents</h2>
                      <p className="text-xs text-stone-500">
                        {documents.length} file{documents.length !== 1 ? "s" : ""} in your vault
                      </p>
                    </div>
                  </div>
                  <form className="flex gap-2" method="get">
                    <div className="relative">
                      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        name="q"
                        defaultValue={search}
                        placeholder="Search documents..."
                        className="focus-ring w-full rounded-lg border border-stone-700/50 bg-stone-900/80 py-2 pl-9 pr-3 text-sm text-stone-200 placeholder-stone-500 transition focus:border-forge-500/40 focus:outline-none sm:w-56"
                      />
                    </div>
                    <button
                      type="submit"
                      className="focus-ring rounded-lg bg-forge-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-forge-500"
                    >
                      Search
                    </button>
                  </form>
                </div>

                <DocumentTable documents={documents} />
              </div>
            </section>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="animate-fade-up mt-4 text-center text-xs text-stone-600" style={{ animationDelay: "0.3s" }}>
          DocForge &middot; Built with Next.js &amp; Supabase
        </footer>
      </div>
    </main>
  );
}
