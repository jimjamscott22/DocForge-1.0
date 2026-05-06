"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";
import { useErrorHandler } from "./ErrorProvider";
import { parseApiError } from "@/lib/errors";
import { Spinner } from "./Spinner";

type Status = "idle" | "importing" | "success" | "error";

export default function ImportUrlForm() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { handleError } = useErrorHandler();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const isImporting = status === "importing";

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("Please enter a URL.");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError("Please enter a valid URL (e.g. https://docs.example.com/guide).");
      return;
    }

    try {
      setStatus("importing");
      setError(null);

      const res = await fetch("/api/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl, title: title.trim() || undefined }),
      });

      if (res.ok) {
        setStatus("success");
        showSuccess("Page imported as a document!");
        setUrl("");
        setTitle("");
        router.refresh();
        setTimeout(() => setStatus("idle"), 3000);
        return;
      }

      const appError = await parseApiError(res);
      setStatus("error");
      setError(appError.userMessage);
      showError(appError.userMessage);
      handleError(appError, "ImportUrlForm");
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Import failed";
      setError(msg);
      showError(msg);
      handleError(err, "ImportUrlForm");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          className="block text-xs font-semibold uppercase tracking-widest text-stone-500"
          htmlFor="import-url"
        >
          URL
        </label>
        <input
          required
          id="import-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.example.com/guide"
          disabled={isImporting}
          className="focus-ring w-full rounded-lg border border-stone-700/50 bg-stone-900/80 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 transition focus:border-forge-500/40 focus:outline-none disabled:opacity-50"
        />
        <p className="text-xs text-stone-600">
          Paste a public URL — the page text is extracted and stored as a searchable document
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          className="block text-xs font-semibold uppercase tracking-widest text-stone-500"
          htmlFor="import-title"
        >
          Title <span className="normal-case text-stone-600">(optional)</span>
        </label>
        <input
          id="import-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. React Hooks Reference"
          disabled={isImporting}
          className="focus-ring w-full rounded-lg border border-stone-700/50 bg-stone-900/80 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 transition focus:border-forge-500/40 focus:outline-none disabled:opacity-50"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isImporting}
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-forge-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-forge-500 disabled:opacity-70"
        >
          {isImporting ? (
            <>
              <Spinner size="sm" />
              Importing…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Import
            </>
          )}
        </button>

        {status === "success" && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Imported
          </span>
        )}

        {error && (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
