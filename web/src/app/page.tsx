import { createSupabaseServerClient } from "@/lib/supabaseClient";
import AuthButtons from "@/components/AuthButtons";
import UploadForm from "@/components/UploadForm";

export const dynamic = "force-dynamic";

type DocumentRow = {
  id: string;
  title: string;
  storage_path: string;
  file_size_bytes: number | null;
  created_at: string;
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const formatBytes = (bytes: number | null) => {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
};

async function getData(search: string) {
  const supabase = createSupabaseServerClient();
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

  return { session, documents };
}

export default async function Home({ searchParams }: PageProps) {
  const search = typeof searchParams?.q === "string" ? searchParams.q : "";
  const { session, documents } = await getData(search);

  const isAuthed = Boolean(session);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 antialiased">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-indigo-600">DocForge</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Manage and search your docs
            </h1>
            <p className="mt-2 text-base text-zinc-600 sm:text-lg">
              Sign in with Supabase, upload files to local storage, and browse your personal
              library.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-sm text-zinc-700">
              {session?.user?.email ? (
                <>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Signed in</p>
                  <p className="font-semibold text-zinc-900">{session.user.email}</p>
                </>
              ) : (
                <p className="font-medium text-zinc-700">Not signed in</p>
              )}
            </div>
            <AuthButtons isAuthenticated={isAuthed} />
          </div>
        </header>

        {!isAuthed ? (
          <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">Get started</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Use Google or GitHub to sign in. Supabase will redirect back here and persist your
                session with secure cookies.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                <li>Copy <code>.env.example</code> to <code>.env.local</code>.</li>
                <li>Set Supabase URL and anon key. Add OAuth redirect: <code>/auth/callback</code>.</li>
                <li>Run <code>npm install</code> then <code>npm run dev</code> from <code>web</code>.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">Why sign in?</p>
              <ul className="space-y-2 text-zinc-700">
                <li>Personalized document list scoped to your Supabase user.</li>
                <li>Uploads tied to your account with RLS.</li>
                <li>Local file storage for fast dev iteration.</li>
              </ul>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="lg:col-span-1">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Upload document</h2>
                    <p className="text-sm text-zinc-600">
                      PDFs, images, or text files up to 10MB.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <UploadForm />
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
                <p className="font-semibold text-zinc-900">Storage</p>
                <p className="mt-1">
                  Files are saved to <code>/public/uploads</code> for local development. Each entry is
                  also tracked in Supabase for listing and search.
                </p>
              </div>
            </section>

            <section className="lg:col-span-2">
              <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Your documents</h2>
                    <p className="text-sm text-zinc-600">Search by title and open directly.</p>
                  </div>
                  <form className="flex gap-2" method="get">
                    <input
                      type="text"
                      name="q"
                      defaultValue={search}
                      placeholder="Search by title"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-64"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      Search
                    </button>
                  </form>
                </div>

                {documents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
                    No documents yet. Upload your first file to get started.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-zinc-200 shadow-sm">
                    <table className="min-w-full divide-y divide-zinc-200 text-sm">
                      <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                        <tr>
                          <th className="px-4 py-3">Title</th>
                          <th className="px-4 py-3">Size</th>
                          <th className="px-4 py-3">Created</th>
                          <th className="px-4 py-3">Open</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 bg-white">
                        {documents.map((doc) => (
                          <tr key={doc.id} className="hover:bg-zinc-50">
                            <td className="px-4 py-3 font-medium text-zinc-900">{doc.title}</td>
                            <td className="px-4 py-3 text-zinc-600">{formatBytes(doc.file_size_bytes)}</td>
                            <td className="px-4 py-3 text-zinc-600">
                              {new Intl.DateTimeFormat("en", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(doc.created_at))}
                            </td>
                            <td className="px-4 py-3">
                              <a
                                href={`/${doc.storage_path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              >
                                View
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
