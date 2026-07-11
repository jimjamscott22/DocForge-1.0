import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import AuthButtons from "@/components/AuthButtons";
import UploadSection from "@/components/UploadSection";
import DashboardClient from "@/components/DashboardClient";
import ReferenceLinksSidebar from "@/components/ReferenceLinksSidebar";
import { getFileTypeFromPath, type FileFilterOption } from "@/lib/fileType";
import { AnvilIcon, CloudIcon, InfoCircleIcon, SearchIcon, ShieldCheckIcon } from "@/components/icons";
import { sortDocuments, type SortOption } from "@/lib/sortDocuments";

export const dynamic = "force-dynamic";

type DocumentRow = {
  id: string;
  title: string;
  storage_path: string;
  file_size_bytes: number | null;
  created_at: string;
  folder_id?: string | null;
};

type FolderRow = {
  id: string;
  name: string;
  parent_id: string | null;
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type EnvironmentOption = "production" | "staging" | "development";

const formatDocumentCount = (count: number) => `${count} document${count === 1 ? "" : "s"}`;

async function getData(search: string, sort: SortOption, fileType: FileFilterOption) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && userError.name !== "AuthSessionMissingError") {
    console.error("Failed to read user", userError);
  }

  if (!user) {
    return { user: null, documents: [] as DocumentRow[], folders: [] as FolderRow[] };
  }

  const { data: folders, error: foldersError } = await supabase
    .from("folders")
    .select("id,name,parent_id")
    .eq("user_id", user.id)
    .order("name");

  if (foldersError) {
    console.error("Failed to load folders", foldersError);
  }

  const { data: documents, error } = search
    ? await supabase.rpc("search_documents", {
        search_query: search,
        user_id: user.id,
      })
    : await supabase
        .from("documents")
        .select("id,title,storage_path,file_size_bytes,created_at,folder_id")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

  if (error) {
    console.error(search ? "Failed to search documents" : "Failed to load documents", error);
  }

  const filtered: DocumentRow[] = (documents || []).filter((doc: DocumentRow) => {
    if (fileType === "all") return true;
    return getFileTypeFromPath(doc.storage_path) === fileType;
  });

  return { user, documents: sortDocuments<DocumentRow>(filtered, sort), folders: folders ?? [] };
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = typeof params?.q === "string" ? params.q : "";
  const sortParam = typeof params?.sort === "string" ? params.sort : "date_desc";
  const fileTypeParam = typeof params?.type === "string" ? params.type : "all";
  const envParam = typeof params?.env === "string" ? params.env : "production";

  const sort: SortOption = ["date_desc", "date_asc", "name_asc", "name_desc", "size_desc", "size_asc"].includes(sortParam)
    ? (sortParam as SortOption)
    : "date_desc";
  const fileType: FileFilterOption = ["all", "pdf", "img", "txt", "doc", "other"].includes(fileTypeParam)
    ? (fileTypeParam as FileFilterOption)
    : "all";
  const environment: EnvironmentOption = ["production", "staging", "development"].includes(envParam)
    ? (envParam as EnvironmentOption)
    : "production";

  const { user, documents, folders } = await getData(search, sort, fileType);

  const isAuthed = Boolean(user);
  const totalStorageBytes = documents.reduce((total, document) => total + (document.file_size_bytes ?? 0), 0);
  const totalStorageMb = totalStorageBytes > 0 ? `${(totalStorageBytes / (1024 * 1024)).toFixed(1)} MB stored` : "No storage used yet";
  const statusChips = [
    `Environment: ${environment}`,
    search ? `Query: ${search}` : "All documents",
    fileType === "all" ? "All file types" : `Filtered: ${fileType.toUpperCase()}`,
    totalStorageMb,
  ];
  const workspaceControls = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-forge-400">
            Library controls
          </p>
          <p className="mt-1 text-sm text-stone-400">
            Search, filter, and sort {formatDocumentCount(documents.length)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-stone-700/60 bg-stone-950/50 px-3 py-1.5 text-xs font-medium text-stone-300"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
      <form className="grid gap-3 xl:grid-cols-[minmax(14rem,1fr)_minmax(8rem,auto)_minmax(8rem,auto)_minmax(8rem,auto)_auto]" method="get">
        <div className="relative min-w-0">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search titles and indexed content..."
            className="focus-ring w-full rounded-lg border border-stone-700/50 bg-stone-900/80 py-3 pl-9 pr-3 text-sm text-stone-200 placeholder-stone-500 transition focus:border-forge-500/40 focus:outline-none"
          />
        </div>
        <select
          name="sort"
          defaultValue={sort}
          className="focus-ring rounded-lg border border-stone-700/50 bg-stone-900/80 px-3 py-3 text-sm text-stone-200 transition focus:border-forge-500/40 focus:outline-none"
          aria-label="Sort documents"
        >
          <option value="date_desc">Newest</option>
          <option value="date_asc">Oldest</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
          <option value="size_desc">Size (Largest)</option>
          <option value="size_asc">Size (Smallest)</option>
        </select>
        <select
          name="type"
          defaultValue={fileType}
          className="focus-ring rounded-lg border border-stone-700/50 bg-stone-900/80 px-3 py-3 text-sm text-stone-200 transition focus:border-forge-500/40 focus:outline-none"
          aria-label="Filter by file type"
        >
          <option value="all">All types</option>
          <option value="pdf">PDF</option>
          <option value="img">Images</option>
          <option value="txt">Text / Markdown</option>
          <option value="doc">Word Docs</option>
          <option value="other">Other</option>
        </select>
        <select
          name="env"
          defaultValue={environment}
          className="focus-ring rounded-lg border border-stone-700/50 bg-stone-900/80 px-3 py-3 text-sm text-stone-200 transition focus:border-forge-500/40 focus:outline-none"
          aria-label="Switch environment"
        >
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="development">Development</option>
        </select>
        <button
          type="submit"
          className="focus-ring rounded-lg bg-forge-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-forge-500 min-w-0 justify-self-end"
        >
          Search
        </button>
      </form>
    </div>
  );

  return (
    <main className="noise-bg relative min-h-screen bg-stone-900 text-stone-200 antialiased">
      <div className={`glow-top relative z-10 mx-auto flex max-w-6xl flex-col px-6 py-10 sm:px-8 ${isAuthed ? "gap-6" : "gap-10"}`}>

        {/* ── Header ── */}
        <header
          className={`animate-fade-up flex flex-col justify-between gap-6 sm:flex-row ${isAuthed ? "sm:items-center" : "sm:items-end"}`}
        >
          <div className={isAuthed ? "space-y-1.5" : "space-y-3"}>
            <div className="flex items-center gap-3">
              {/* Anvil / forge icon */}
              <div className={`${isAuthed ? "h-11 w-11 rounded-xl" : "h-10 w-10 rounded-lg"} flex items-center justify-center bg-forge-500/15 ring-1 ring-forge-500/25`}>
                <AnvilIcon className="text-forge-400" />
              </div>
              <div>
                <p className={isAuthed ? "font-display text-4xl leading-none tracking-tight text-stone-50 sm:text-5xl" : "font-sans text-sm font-semibold uppercase tracking-wide text-forge-400"}>
                  DocForge
                </p>
                {isAuthed && (
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-forge-400">
                    Document vault
                  </p>
                )}
              </div>
            </div>
            {!isAuthed && (
              <>
                <h1 className="font-display text-4xl tracking-tight text-stone-50 sm:text-5xl">
                  Your document vault
                </h1>
                <p className="max-w-lg text-base text-stone-400">
                  Upload, organize, and access your documents from anywhere.
                  Secured with row-level policies on Supabase.
                </p>
              </>
            )}
          </div>

          {/* Auth card */}
          <div
            className={`animate-fade-up shrink-0 rounded-xl border border-stone-700/50 bg-stone-850/80 shadow-lg backdrop-blur-sm ${isAuthed ? "px-4 py-3" : "px-5 py-4"}`}
            style={{ animationDelay: "0.1s" }}
          >
            <div className="mb-3 text-sm text-stone-400">
              {user?.email ? (
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                    Signed in as
                  </p>
                  <p className="font-medium text-stone-200">{user.email}</p>
                </div>
              ) : (
                <p className="font-medium text-stone-300">Sign in to get started</p>
              )}
            </div>
            <AuthButtons isAuthenticated={isAuthed} />
          </div>
        </header>

        {/* ── Divider ── */}
        <div className={isAuthed ? "h-px bg-gradient-to-r from-forge-500/30 via-stone-700/60 to-transparent" : "h-px bg-gradient-to-r from-transparent via-stone-700/60 to-transparent"} />

        {!isAuthed ? (
          <>
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
                  <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-forge-400" />
                  <span>Documents scoped to your account with RLS security</span>
                </li>
                <li className="flex gap-3">
                  <CloudIcon className="mt-0.5 h-4 w-4 shrink-0 text-forge-400" />
                  <span>Cloud storage accessible from any device</span>
                </li>
                <li className="flex gap-3">
                  <SearchIcon className="mt-0.5 h-4 w-4 shrink-0 text-forge-400" />
                  <span>Search and browse your personal library</span>
                </li>
              </ul>
            </div>
          </section>
        
          <section className="animate-fade-up" style={{ animationDelay: "0.25s" }}>
            <ReferenceLinksSidebar />
          </section>
          </>
        ) : (
          /* ── Authenticated dashboard ── */
          <div className="flex flex-col gap-8">
            {/* Folder tree + documents grid */}
            <DashboardClient
              documents={documents}
              initialFolders={folders}
              workspaceControls={workspaceControls}
              uploadSlot={<UploadSection />}
            />

            {/* Reference Links Section */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <section className="animate-fade-up lg:col-span-1" style={{ animationDelay: "0.25s" }}>
                <div className="card-glow rounded-xl border border-stone-700/50 bg-stone-850/60 p-6 backdrop-blur-sm lg:sticky lg:top-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-forge-500/15 ring-1 ring-forge-500/20">
                    <InfoCircleIcon className="h-5 w-5 text-forge-400" />
                  </div>
                  <h2 className="font-display text-xl text-stone-50">Reference Rail</h2>
                  <p className="mt-3 text-sm leading-relaxed text-stone-400">
                    External documentation links for common frontend, backend, and research tasks.
                  </p>
                  <p className="mt-4 text-xs font-medium text-stone-500">
                    Opens in a new tab
                  </p>
                </div>
              </section>
              <section className="animate-fade-up lg:col-span-2" style={{ animationDelay: "0.3s" }}>
                <div className="card-glow rounded-xl border border-stone-700/50 bg-stone-850/60 p-6 backdrop-blur-sm">
                  <ReferenceLinksSidebar />
                </div>
              </section>
            </div>
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
