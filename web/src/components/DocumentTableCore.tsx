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
import { EmptyBoxIcon, HistoryIcon } from "./icons";

type Props = {
  documents: DocumentRow[];
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onVersionHistory: (doc: DocumentRow) => void;
};

const HEADER_CELL_CLASS =
  "px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-stone-500";

function PreviewButton({ doc }: { doc: DocumentRow }) {
  const ext = getFileExtension(doc.storage_path);
  if (ext === "pdf") return <PdfPreviewModal documentId={doc.id} documentTitle={doc.title} />;
  if (["txt", "md"].includes(ext)) return <TextPreviewModal documentId={doc.id} documentTitle={doc.title} />;
  return null;
}

function DocumentActions({
  doc,
  onVersionHistory,
}: {
  doc: DocumentRow;
  onVersionHistory: (doc: DocumentRow) => void;
}) {
  return (
    <>
      <PreviewButton doc={doc} />
      <ExportButton documentId={doc.id} storagePath={doc.storage_path} documentTitle={doc.title} />
      <ViewDocumentButton documentId={doc.id} />
      <button
        type="button"
        onClick={() => onVersionHistory(doc)}
        className="focus-ring inline-flex items-center gap-1 rounded-md border border-stone-700/50 bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-stone-400 transition hover:text-stone-200"
        title="Version history"
      >
        <HistoryIcon className="h-3.5 w-3.5" />
        History
      </button>
      <DeleteDocumentButton documentId={doc.id} documentTitle={doc.title} />
    </>
  );
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
          <EmptyBoxIcon className="h-6 w-6 text-stone-500" />
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
                  <FileTypeIcon type={getFileIcon(doc.storage_path)} extension={getFileExtension(doc.storage_path)} />
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
                  <DocumentActions doc={doc} onVersionHistory={onVersionHistory} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div
        role="table"
        aria-label="Documents"
        className="hidden grid-cols-[2.5rem_minmax(8rem,1fr)_auto_auto_auto_18.5rem] gap-y-2 overflow-x-auto text-sm md:grid"
      >
        <div role="rowgroup" className="contents">
          <div
            role="row"
            className="col-span-full grid grid-cols-subgrid items-center rounded-lg border border-l-4 border-l-transparent border-stone-700/40 bg-stone-900/60"
          >
            <div role="columnheader" className="px-3 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="h-3.5 w-3.5 cursor-pointer rounded border-stone-600 accent-forge-500"
                aria-label="Select all documents"
              />
            </div>
            <div role="columnheader" className={`${HEADER_CELL_CLASS} text-left`}>
              Title
            </div>
            <div role="columnheader" className={`${HEADER_CELL_CLASS} text-left`}>
              Type
            </div>
            <div role="columnheader" className={`${HEADER_CELL_CLASS} text-left`}>
              Size
            </div>
            <div role="columnheader" className={`${HEADER_CELL_CLASS} text-left`}>
              Added
            </div>
            <div role="columnheader" className={`${HEADER_CELL_CLASS} text-right`} aria-label="Actions" />
          </div>
        </div>

        <div role="rowgroup" className="contents">
          {documents.map((doc) => (
            <div
              key={doc.id}
              role="row"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", doc.id)}
              className={`row-glow col-span-full grid grid-cols-subgrid items-center rounded-lg border border-l-4 border-stone-700/40 ${
                selectedIds.has(doc.id)
                  ? "border-l-forge-500/80 bg-forge-500/[0.06]"
                  : "border-l-transparent bg-stone-900/40"
              }`}
            >
              <div role="cell" className="px-3 py-3.5">
                <input
                  type="checkbox"
                  checked={selectedIds.has(doc.id)}
                  onChange={() => onToggleSelect(doc.id)}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-stone-600 accent-forge-500"
                  aria-label={`Select ${doc.title}`}
                />
              </div>
              <div role="cell" className="min-w-0 truncate px-4 py-3.5 font-semibold text-stone-100">
                {doc.title}
              </div>
              <div role="cell" className="px-4 py-3.5">
                <FileTypeIcon type={getFileIcon(doc.storage_path)} extension={getFileExtension(doc.storage_path)} />
              </div>
              <div role="cell" className="px-4 py-3.5 font-mono text-xs text-stone-400">
                {formatBytes(doc.file_size_bytes)}
              </div>
              <div role="cell" className="px-4 py-3.5 text-stone-400">
                {formatDate(doc.created_at)}
              </div>
              <div role="cell" className="px-4 py-3.5 text-right">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <DocumentActions doc={doc} onVersionHistory={onVersionHistory} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
