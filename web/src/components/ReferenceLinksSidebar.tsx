"use client";

export default function ReferenceLinksSidebar() {
  const referenceLinks = [
    {
      category: "Documentation Sites",
      links: [
        { name: "MDN Web Docs", url: "https://developer.mozilla.org" },
        { name: "DevDocs", url: "https://devdocs.io" },
        { name: "Stack Overflow", url: "https://stackoverflow.com" },
      ],
    },
    {
      category: "Language & Framework Docs",
      links: [
        { name: "TypeScript Docs", url: "https://www.typescriptlang.org/docs" },
        { name: "React Docs", url: "https://react.dev" },
        { name: "Next.js Docs", url: "https://nextjs.org/docs" },
        { name: "Tailwind CSS Docs", url: "https://tailwindcss.com/docs" },
        { name: "Node.js Docs", url: "https://nodejs.org/docs" },
      ],
    },
    {
      category: "Doc Viewers & Tools",
      links: [
        { name: "Supabase Docs", url: "https://supabase.com/docs" },
        { name: "GitHub Docs", url: "https://docs.github.com" },
        { name: "PDF.js Viewer", url: "https://mozilla.github.io/pdf.js/web/viewer.html" },
      ],
    },
  ];

  return (
    <div className="rounded-xl border border-stone-700/50 bg-stone-850/40 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-forge-500/15">
          <svg
            className="h-3.5 w-3.5 text-forge-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Reference Links
          </h3>
        </div>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-stone-400">
        Quick access to docs &amp; tools
      </p>

      <div className="space-y-4">
        {referenceLinks.map((section) => (
          <div key={section.category}>
            <h4 className="mb-2 text-xs font-semibold text-stone-500">
              {section.category}
            </h4>
            <ul className="space-y-1.5">
              {section.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md px-2 py-1.5 text-xs text-stone-300 transition hover:bg-stone-800/60 hover:text-forge-400"
                  >
                    <span>{link.name}</span>
                    <svg
                      className="h-3 w-3 text-stone-600 transition group-hover:text-forge-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
