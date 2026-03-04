"use client";

import { useMemo, useState } from "react";

type DocLink = {
  name: string;
  url: string;
  description: string;
  tags: string[];
};

type DocCategory = {
  id: string;
  label: string;
  links: DocLink[];
};

const docCategories: DocCategory[] = [
  {
    id: "aggregators",
    label: "Doc Hubs",
    links: [
      {
        name: "MDN Web Docs",
        url: "https://developer.mozilla.org",
        description: "Authoritative web platform documentation.",
        tags: ["web", "html", "css", "javascript"],
      },
      {
        name: "DevDocs",
        url: "https://devdocs.io",
        description: "Unified API docs with offline support.",
        tags: ["reference", "search", "multi-language"],
      },
      {
        name: "Dash (Kapeli)",
        url: "https://kapeli.com/dash",
        description: "Offline doc browser for fast local lookup.",
        tags: ["offline", "desktop", "productivity"],
      },
    ],
  },
  {
    id: "frontend",
    label: "Frontend",
    links: [
      {
        name: "React Docs",
        url: "https://react.dev",
        description: "Core guides, APIs, and design patterns.",
        tags: ["react", "ui", "components"],
      },
      {
        name: "Next.js Docs",
        url: "https://nextjs.org/docs",
        description: "App Router, data fetching, and deployment.",
        tags: ["nextjs", "routing", "fullstack"],
      },
      {
        name: "Tailwind CSS Docs",
        url: "https://tailwindcss.com/docs",
        description: "Utility classes, theming, and customization.",
        tags: ["tailwind", "css", "styling"],
      },
      {
        name: "TypeScript Handbook",
        url: "https://www.typescriptlang.org/docs/",
        description: "Type system features and best practices.",
        tags: ["typescript", "types", "language"],
      },
    ],
  },
  {
    id: "backend",
    label: "Backend & Data",
    links: [
      {
        name: "Node.js Docs",
        url: "https://nodejs.org/docs/latest/api/",
        description: "Runtime APIs, modules, and tooling.",
        tags: ["node", "backend", "runtime"],
      },
      {
        name: "Supabase Docs",
        url: "https://supabase.com/docs",
        description: "Auth, storage, Postgres, and edge functions.",
        tags: ["supabase", "database", "auth"],
      },
      {
        name: "PostgreSQL Docs",
        url: "https://www.postgresql.org/docs/",
        description: "SQL reference and production guides.",
        tags: ["postgres", "sql", "database"],
      },
      {
        name: "GitHub Docs",
        url: "https://docs.github.com",
        description: "Actions, repos, and collaboration workflows.",
        tags: ["github", "ci", "workflow"],
      },
    ],
  },
  {
    id: "learning",
    label: "Learning",
    links: [
      {
        name: "Stack Overflow",
        url: "https://stackoverflow.com",
        description: "Practical solutions from developer Q&A.",
        tags: ["community", "questions", "troubleshooting"],
      },
      {
        name: "freeCodeCamp",
        url: "https://www.freecodecamp.org/news/",
        description: "Tutorials and deep-dive engineering posts.",
        tags: ["tutorials", "beginner", "practice"],
      },
      {
        name: "Roadmap.sh",
        url: "https://roadmap.sh",
        description: "Learning paths for languages and roles.",
        tags: ["career", "roadmap", "learning"],
      },
    ],
  },
];

const allLinkCount = docCategories.reduce((total, category) => total + category.links.length, 0);

export default function ReferenceLinksSidebar() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const displayedCategories = useMemo(() => {
    if (activeCategory === "all") {
      return docCategories;
    }

    return docCategories.filter((category) => category.id === activeCategory);
  }, [activeCategory]);

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
            Doc Discovery
          </h3>
        </div>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-stone-400">
        Browse curated references by category and keep your research workflow inside DocForge.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={`rounded-full border px-2.5 py-1 text-xs transition ${
            activeCategory === "all"
              ? "border-forge-500/60 bg-forge-500/20 text-forge-300"
              : "border-stone-700/70 bg-stone-900/70 text-stone-400 hover:border-stone-600 hover:text-stone-200"
          }`}
        >
          All ({allLinkCount})
        </button>
        {docCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategory(category.id)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              activeCategory === category.id
                ? "border-forge-500/60 bg-forge-500/20 text-forge-300"
                : "border-stone-700/70 bg-stone-900/70 text-stone-400 hover:border-stone-600 hover:text-stone-200"
            }`}
          >
            {category.label} ({category.links.length})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {displayedCategories.map((section) => (
          <div key={section.id} className="rounded-lg border border-stone-700/50 bg-stone-900/40 p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              {section.label}
            </h4>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-md border border-transparent px-2 py-2 transition hover:border-stone-700/70 hover:bg-stone-800/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-stone-200 group-hover:text-forge-300">
                        {link.name}
                      </span>
                      <svg
                        className="h-3 w-3 shrink-0 text-stone-600 transition group-hover:text-forge-400"
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
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">
                      {link.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {link.tags.map((tag) => (
                        <span
                          key={`${link.url}-${tag}`}
                          className="rounded-full border border-stone-700/80 bg-stone-900/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-stone-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
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
