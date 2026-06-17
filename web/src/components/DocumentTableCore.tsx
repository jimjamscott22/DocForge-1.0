"use client";

import ViewDocumentButton from "./ViewDocumentButton";
import DeleteDocumentButton from "./DeleteDocumentButton";
import TextPreviewModal from "./TextPreviewModal";
import PdfPreviewModal from "./PdfPreviewModal";
import ExportButton from "./ExportButton";
import { getFileExtension } from "@/lib/fileType";
import {
  DocumentRow,
  FileTypeIcon,
  formatBytes,
  formatDate,
  getFileIcon,
} from "./documentTableTypes";

type Props = {
  documents: DocumentRow[];
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onVersionHistory: (doc: DocumentRow) => void;
};

function PreviewButton({ doc }: { doc: DocumentRow }) {
  const ext = getFileExtension(doc.storage_path);
  if (ext === "pdf") return <PdfPreviewModal documentId={doc.id} documentTitle={doc.title} />;
  if (["txt", "md"].includes(ext)) return <TextPreviewModal documentId={doc.id} documentTitle={doc.title} />;
  return null;
}

export default function DocumentTableCore({
  documents,
  selectedIds,
  allSelected,
  onToggleSelect,
  onToggleSelectAll,
  onVersionHistory,
}: Props) {
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
      <div className="mb-3 flex items-center justify-between rounded-lg border border-stone-700/40 bg-stone-900/30 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Results</p>
          <p className="mt-1 text-sm text-stone-300">
            {documents.length} document{documents.length !== 1 ? "s" : ""} ready for review
          </p>
        </div>
        <p className="hidden text-xs text-stone-500 sm:block">
          Select rows for bulk open, move, or delete.
        </p>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {documents.map((doc) => (
          <article
            key={doc.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", doc.id)}
            className={`rounded-xl border px-4 py-4 transition ${
              selectedIds.has(doc.id)
                ? "border-forge-500/35 bg-forge-500/[0.08]"
                : "border-stone-700/40 bg-stone-900/35"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.has(doc.id)}
                onChange={() => onToggleSelect(doc.id)}
                className="mt-1 h-4 w-4 cursor-pointer rounded border-stone-600 accent-forge-500"
                aria-label={`Select ${doc.title}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <FileTypeIcon type={getFileIcon(doc.storage_path)} />
                  <h3 className="truncate text-sm font-semibold text-stone-100">{doc.title}</h3>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-400">
                  <span className="rounded-full border border-stone-700/60 bg-stone-950/50 px-2.5 py-1">
                    {formatBytes(doc.file_size_bytes)}
                  </span>
                  <span className="rounded-full border border-stone-700/60 bg-stone-950/50 px-2.5 py-1">
                    {formatDate(doc.created_at)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <PreviewButton doc={doc} />
                  <ExportButton documentId={doc.id} storagePath={doc.storage_path} documentTitle={doc.title} />
                  <ViewDocumentButton documentId={doc.id} />
                  <button
                    type="button"
                    onClick={() => onVersionHistory(doc)}
                    className="focus-ring inline-flex items-center gap-1 rounded-md border border-stone-700/50 bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-stone-400 transition hover:text-stone-200"
                    title="Version history"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    History
                  </button>
                  <DeleteDocumentButton documentId={doc.id} documentTitle={doc.title} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-stone-700/40 md:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700/40 bg-stone-900/60">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
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
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", doc.id)}
                className={`table-row-hover ${selectedIds.has(doc.id) ? "bg-forge-500/[0.06]" : ""}`}
              >
                <td className="w-10 px-3 py-3.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(doc.id)}
                    onChange={() => onToggleSelect(doc.id)}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-stone-600 accent-forge-500"
                    aria-label={`Select ${doc.title}`}
                  />
                </td>
                <td className="px-4 py-3.5 font-medium text-stone-100">{doc.title}</td>
                <td className="hidden px-4 py-3.5 sm:table-cell">
                  <FileTypeIcon type={getFileIcon(doc.storage_path)} />
                </td>
                <td className="px-4 py-3.5 font-mono text-xs text-stone-400">
                  {formatBytes(doc.file_size_bytes)}
                </td>
                <td className="hidden px-4 py-3.5 text-stone-400 md:table-cell">
                  {formatDate(doc.created_at)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <PreviewButton doc={doc} />
                    <ExportButton documentId={doc.id} storagePath={doc.storage_path} documentTitle={doc.title} />
                    <ViewDocumentButton documentId={doc.id} />
                    <button
                      type="button"
                      onClick={() => onVersionHistory(doc)}
                      className="focus-ring inline-flex items-center gap-1 rounded-md border border-stone-700/50 bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-stone-400 transition hover:text-stone-200"
                      title="Version history"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      History
                    </button>
                    <DeleteDocumentButton documentId={doc.id} documentTitle={doc.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
