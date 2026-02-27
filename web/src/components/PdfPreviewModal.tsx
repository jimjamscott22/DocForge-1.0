"use client";

import { useState, useRef, useEffect } from "react";

interface PdfPreviewModalProps {
  documentId: string;
  documentTitle: string;
}

export default function PdfPreviewModal({
  documentId,
  documentTitle,
}: PdfPreviewModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    setIframeReady(false);
    setError(null);
    setSignedUrl(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to load PDF");
        return;
      }
      const { url } = await res.json();
      setSignedUrl(url);
    } catch {
      setError("A network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSignedUrl(null);
    setIframeReady(false);
    setError(null);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-stone-700/50 bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:border-forge-500/40 hover:text-forge-300 disabled:opacity-70"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        Preview
      </button>

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        className="fixed inset-0 z-50 m-auto h-[90vh] w-full max-w-5xl rounded-xl border border-stone-700/50 bg-stone-900 p-0 text-stone-200 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-700/40 px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex items-center justify-center rounded bg-red-400/10 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-red-400">
              PDF
            </span>
            <h3 className="truncate text-sm font-semibold text-stone-100">
              {documentTitle}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-stone-200"
            aria-label="Close preview"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content area */}
        <div className="relative h-[calc(90vh-3.5rem)]">
          {(loading || (signedUrl !== null && !iframeReady)) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-stone-400">
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading PDF...
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {signedUrl && !error && (
            <iframe
              src={signedUrl}
              className={`h-full w-full rounded-b-xl transition-opacity duration-300 ${iframeReady ? "opacity-100" : "opacity-0"}`}
              title={documentTitle}
              onLoad={() => setIframeReady(true)}
              allow="fullscreen"
            />
          )}
        </div>
      </dialog>
    </>
  );
}
