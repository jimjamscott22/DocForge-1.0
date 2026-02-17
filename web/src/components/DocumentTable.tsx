"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";
import ViewDocumentButton from "./ViewDocumentButton";
import DeleteDocumentButton from "./DeleteDocumentButton";
import TextPreviewModal from "./TextPreviewModal";

type DocumentRow = {
  id: string;
  title: string;
  storage_path: string;
  file_size_bytes: number | null;
  created_at: string;
};

const formatBytes = (bytes: number | null) => {
  if (!bytes || bytes <= 0) return "\u2014";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
};

const getFileIcon = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["png", "jpg", "jpeg", "gif"].includes(ext)) return "img";
  if (["md", "txt"].includes(ext)) return "txt";
  if (["doc", "docx"].includes(ext)) return "doc";
  return "file";
};

const FileTypeIcon = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    pdf: "text-red-400 bg-red-400/10",
    img: "text-violet-400 bg-violet-400/10",
    txt: "text-emerald-400 bg-emerald-400/10",
    doc: "text-blue-400 bg-blue-400/10",
    file: "text-stone-400 bg-stone-400/10",
  };

  const labels: Record<string, string> = {
    pdf: "PDF",
    img: "IMG",
    txt: "TXT",
    doc: "DOC",
    file: "FILE",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider ${colors[type]}`}
    >
      {labels[type]}
    </span>
  );
};

export default function DocumentTable({
  documents,
}: {
  documents: DocumentRow[];
}) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (showBulkConfirm) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [showBulkConfirm]);

  // Clear selection when documents change (e.g. after delete/refresh)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [documents]);

  const allSelected =
    documents.length > 0 && selectedIds.size === documents.length;
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/documents/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showError(data?.error || "Failed to delete documents");
        return;
      }

      const data = await res.json();
      showSuccess(`Deleted ${data.deleted} document${data.deleted !== 1 ? "s" : ""}`);
      setShowBulkConfirm(false);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      showError("A network error occurred while deleting");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkDownload = async () => {
    setBulkDownloading(true);
    let opened = 0;
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/documents/${id}/download`);
        if (!res.ok) continue;
        const { url } = await res.json();
        window.open(url, "_blank", "noopener,noreferrer");
        opened++;
      }
      if (opened > 0) {
        showSuccess(`Opened ${opened} document${opened !== 1 ? "s" : ""}`);
      } else {
        showError("Could not open any documents");
      }
    } catch {
      showError("A network error occurred while downloading");
    } finally {
      setBulkDownloading(false);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-stone-700/50 bg-stone-900/40 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-800">
          <svg
            className="h-6 w-6 text-stone-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m0 0l2.25-2.25M9.75 15l2.25 2.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-sm text-stone-400">
          Your vault is empty. Upload your first document to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Bulk action toolbar */}
      {someSelected && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-forge-500/20 bg-forge-500/5 px-4 py-2.5">
          <span className="text-xs font-semibold text-forge-300">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-stone-700/50" />
          <button
            onClick={() => setShowBulkConfirm(true)}
            disabled={bulkDeleting}
            className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-70"
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
            Delete selected
          </button>
          <button
            onClick={handleBulkDownload}
            disabled={bulkDownloading}
            className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-stone-700/50 bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:border-forge-500/40 hover:text-forge-300 disabled:opacity-70"
          >
            {bulkDownloading ? (
              <>
                <svg
                  className="h-3 w-3 animate-spin"
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
                Opening...
              </>
            ) : (
              <>
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
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Open selected
              </>
            )}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-stone-500 transition hover:text-stone-300"
          >
            Clear
          </button>
        </div>
      )}

      {/* Document table */}
      <div className="overflow-hidden rounded-lg border border-stone-700/40">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700/40 bg-stone-900/60">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-stone-600 accent-forge-500"
                  aria-label="Select all documents"
                />
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                Title
              </th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500 sm:table-cell">
                Type
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                Size
              </th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500 md:table-cell">
                Added
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-stone-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-700/30">
            {documents.map((doc) => (
              <tr
                key={doc.id}
                className={`table-row-hover ${selectedIds.has(doc.id) ? "bg-forge-500/[0.06]" : ""}`}
              >
                <td className="w-10 px-3 py-3.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(doc.id)}
                    onChange={() => toggleSelect(doc.id)}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-stone-600 accent-forge-500"
                    aria-label={`Select ${doc.title}`}
                  />
                </td>
                <td className="px-4 py-3.5 font-medium text-stone-100">
                  {doc.title}
                </td>
                <td className="hidden px-4 py-3.5 sm:table-cell">
                  <FileTypeIcon type={getFileIcon(doc.storage_path)} />
                </td>
                <td className="px-4 py-3.5 font-mono text-xs text-stone-400">
                  {formatBytes(doc.file_size_bytes)}
                </td>
                <td className="hidden px-4 py-3.5 text-stone-400 md:table-cell">
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                  }).format(new Date(doc.created_at))}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {["txt", "md"].includes(
                      doc.storage_path
                        .split(".")
                        .pop()
                        ?.toLowerCase() ?? ""
                    ) && (
                      <TextPreviewModal
                        documentId={doc.id}
                        documentTitle={doc.title}
                      />
                    )}
                    <ViewDocumentButton documentId={doc.id} />
                    <DeleteDocumentButton
                      documentId={doc.id}
                      documentTitle={doc.title}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk delete confirmation dialog */}
      <dialog
        ref={dialogRef}
        onClose={() => setShowBulkConfirm(false)}
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
            Delete {selectedIds.size} document{selectedIds.size !== 1 ? "s" : ""}
          </h3>
          <p className="mt-2 text-sm text-stone-400">
            Are you sure you want to delete{" "}
            <span className="font-medium text-stone-200">
              {selectedIds.size} document{selectedIds.size !== 1 ? "s" : ""}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowBulkConfirm(false)}
              disabled={bulkDeleting}
              className="focus-ring rounded-lg border border-stone-700/50 bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-300 transition hover:bg-stone-750 disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-70"
            >
              {bulkDeleting ? (
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
                `Delete ${selectedIds.size}`
              )}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
