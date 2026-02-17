"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";

export default function DeleteDocumentButton({
  documentId,
  documentTitle,
}: {
  documentId: string;
  documentTitle: string;
}) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (showConfirm) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [showConfirm]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.error || "Failed to delete document";
        showError(message);
        return;
      }

      showSuccess("Document deleted successfully");
      setShowConfirm(false);
      router.refresh();
    } catch {
      showError("A network error occurred while deleting");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-stone-700/50 bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-400 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-70"
        title="Delete document"
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
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Delete
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setShowConfirm(false)}
        className="fixed inset-0 z-50 m-auto w-full max-w-sm rounded-xl border border-stone-700/50 bg-stone-850 p-0 text-stone-200 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-stone-100">
            Delete document
          </h3>
          <p className="mt-2 text-sm text-stone-400">
            Are you sure you want to delete{" "}
            <span className="font-medium text-stone-200">
              {documentTitle}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={deleting}
              className="focus-ring rounded-lg border border-stone-700/50 bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-300 transition hover:bg-stone-750 disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-70"
            >
              {deleting ? (
                <>
                  <svg
                    className="h-3.5 w-3.5 animate-spin"
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
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
