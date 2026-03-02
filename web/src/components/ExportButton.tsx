"use client";

import { useState, useRef, useEffect } from "react";
import { useToast } from "./ToastProvider";

type ExportButtonProps = {
  documentId: string;
  storagePath: string;
  documentTitle: string;
};

export default function ExportButton({
  documentId,
  storagePath,
  documentTitle,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  const ext = storagePath.split(".").pop()?.toLowerCase() ?? "";
  const isPdf = ext === "pdf";
  const isText = ["txt", "md"].includes(ext);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleExportPdf = async () => {
    setOpen(false);
    setLoadingType("pdf");
    try {
      const res = await fetch(`/api/documents/${documentId}/export/pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        if (res.status === 501) {
          showError("PDF export is not yet supported for this file type");
        } else {
          showError(data?.error ?? "Failed to export PDF");
        }
        return;
      }
      const data = await res.json() as { url?: string };
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
        showSuccess(`Exporting ${documentTitle} as PDF`);
      }
    } catch {
      showError("A network error occurred");
    } finally {
      setLoadingType(null);
    }
  };

  const handleExportMarkdown = async () => {
    setOpen(false);
    setLoadingType("md");
    try {
      const res = await fetch(`/api/documents/${documentId}/export/markdown`);
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        showError(data?.error ?? "Failed to export Markdown");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documentTitle.endsWith(".md") ? documentTitle : `${documentTitle}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess(`Exported ${documentTitle} as Markdown`);
    } catch {
      showError("A network error occurred");
    } finally {
      setLoadingType(null);
    }
  };

  if (!isPdf && !isText) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loadingType !== null}
        className="focus-ring inline-flex items-center gap-1 rounded-md border border-stone-700/50 bg-stone-800 px-2.5 py-1.5 text-xs font-semibold text-stone-300 transition hover:border-forge-500/40 hover:text-forge-300 disabled:opacity-70"
        title="Export"
      >
        {loadingType ? (
          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-stone-700/50 bg-stone-850 py-1 shadow-xl">
          {(isPdf || isText) && (
            <button
              onClick={handleExportPdf}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-300 transition hover:bg-stone-800 hover:text-forge-300"
            >
              <span className="inline-flex items-center justify-center rounded bg-red-400/10 px-1 py-0.5 font-mono text-[9px] font-bold text-red-400">PDF</span>
              Export as PDF
            </button>
          )}
          {isText && (
            <button
              onClick={handleExportMarkdown}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-300 transition hover:bg-stone-800 hover:text-forge-300"
            >
              <span className="inline-flex items-center justify-center rounded bg-emerald-400/10 px-1 py-0.5 font-mono text-[9px] font-bold text-emerald-400">MD</span>
              Export as Markdown
            </button>
          )}
        </div>
      )}
    </div>
  );
}
