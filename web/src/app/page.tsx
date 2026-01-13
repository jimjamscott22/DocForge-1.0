type Step = {
  title: string;
  detail: string;
};

const steps: Step[] = [
  {
    title: "Configure Supabase",
    detail:
      "Copy .env.example to .env.local and add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  },
  {
    title: "Run database migrations",
    detail: "Apply supabase/schema.sql to your Supabase project to create tables, RLS, and policies.",
  },
  {
    title: "Start the app",
    detail: "npm run dev, then open http://localhost:3000. Health check lives at /api/health.",
  },
];

const supabaseStatus = [
  {
    label: "Supabase URL",
    configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  },
  {
    label: "Anon key",
    configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 antialiased">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-indigo-600">DocForge</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Technical doc hub scaffold
          </h1>
          <p className="text-base text-zinc-600 sm:text-lg">
            Next.js + Supabase starter with Tailwind. Configure Supabase, run the schema, and begin
            wiring auth, uploads, and search.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Environment</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Values are read at build time from .env.local.
            </p>
            <ul className="mt-4 space-y-2">
              {supabaseStatus.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <span className="text-sm font-medium text-zinc-700">{item.label}</span>
                  <span
                    className={`text-xs font-semibold ${
                      item.configured ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    {item.configured ? "configured" : "missing"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Health check</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Confirm the server is up at <code className="rounded bg-zinc-100 px-1">/api/health</code>.
            </p>
            <div className="mt-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              GET http://localhost:3000/api/health
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Next steps</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                <p className="text-xs font-semibold text-indigo-600">Step {index + 1}</p>
                <h3 className="mt-2 text-base font-semibold text-zinc-900">{step.title}</h3>
                <p className="mt-1 text-sm text-zinc-600">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
