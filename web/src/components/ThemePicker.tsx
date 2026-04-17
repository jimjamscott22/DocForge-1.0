"use client";

import { useEffect, useRef, useState } from "react";

type ThemeId = "forge" | "ocean" | "forest" | "royal" | "rose" | "mono";

type ThemeDef = {
  id: ThemeId;
  name: string;
  accent: string;
  surface: string;
};

const THEMES: ThemeDef[] = [
  { id: "forge", name: "Forge", accent: "#f97316", surface: "#1c1917" },
  { id: "ocean", name: "Ocean", accent: "#3b82f6", surface: "#0f172a" },
  { id: "forest", name: "Forest", accent: "#10b981", surface: "#18181b" },
  { id: "royal", name: "Royal", accent: "#a855f7", surface: "#1a1625" },
  { id: "rose", name: "Rose", accent: "#f43f5e", surface: "#1c1a1a" },
  { id: "mono", name: "Mono", accent: "#a3a3a3", surface: "#171717" },
];

const STORAGE_KEY = "docforge-theme";

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("forge");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setTheme(saved);
    } else {
      const current = document.documentElement.getAttribute("data-theme") as ThemeId | null;
      if (current && THEMES.some((t) => t.id === current)) setTheme(current);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const applyTheme = (id: ThemeId) => {
    setTheme(id);
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
    setOpen(false);
  };

  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div ref={ref} className="fixed left-4 top-4 z-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change theme"
        aria-expanded={open}
        className="focus-ring group flex items-center gap-2 rounded-full border border-stone-700/60 bg-stone-850/80 px-3 py-1.5 text-xs font-medium text-stone-200 shadow-lg backdrop-blur-md transition hover:border-forge-500/40"
      >
        <span
          className="h-3 w-3 rounded-full ring-2 ring-stone-900/60"
          style={{ background: active.accent }}
        />
        <span className="hidden sm:inline">{active.name}</span>
        <svg
          className={`h-3 w-3 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-stone-700/60 bg-stone-850/95 p-1.5 shadow-2xl backdrop-blur-md"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
            Theme
          </p>
          {THEMES.map((t) => {
            const isActive = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => applyTheme(t.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                  isActive
                    ? "bg-forge-500/15 text-stone-50"
                    : "text-stone-300 hover:bg-stone-750/60"
                }`}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-stone-900/60"
                  style={{ background: t.accent }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: t.surface }}
                  />
                </span>
                <span className="flex-1">{t.name}</span>
                {isActive && (
                  <svg className="h-3.5 w-3.5 text-forge-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
