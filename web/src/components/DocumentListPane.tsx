"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";
import BulkActionBar from "./BulkActionBar";
import BulkDeleteDialog from "./BulkDeleteDialog";
import VersionHistoryModal from "./VersionHistoryModal";
import DocumentPreviewPane from "./DocumentPreviewPane";
import { getFileExtension } from "@/lib/fileType";
import {
  DocumentRow,
  FileTypeIcon,
  formatBytes,
  formatDate,
  getFileIcon,
} from "./documentTableTypes";
import { EmptyBoxIcon } from "./icons";

type DocumentListPaneProps = {
  documents: DocumentRow[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onMoveToFolder?: (ids: string[]) => void;
};

export default function DocumentListPane({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onMoveToFolder,
}: DocumentListPaneProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [versionHistoryDoc, setVersionHistoryDoc] = useState<DocumentRow | null>(null);

  const documentIdSet = useMemo(
    () => new Set(documents.map((d) => d.id)),
    [documents]
  );

  const activeSelectedIds = useMemo(() => {
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (documentIdSet.has(id)) next.add(id);
    }
    return next;
  }, [selectedIds, documentIdSet]);

  const allSelected = documents.length > 0 && activeSelectedIds.size === documents.length;
  const someSelected = activeSelectedIds.size > 0;
  const selectedDoc =
    documents.find((d) => d.id === selectedDocumentId) ?? null;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(documents.map((d) => d.id)));
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/documents/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(activeSelectedIds) }),
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
      for (const id of activeSelectedIds) {
        const res = await fetch(`/api/documents/${id}/download?event=view`);
        if (!res.ok) continue;
        const { url } = await res.json();
        window.open(url, "_blank", "noopener,noreferrer");
        opened++;
      }
      if (opened > 0) showSuccess(`Opened ${opened} document${opened !== 1 ? "s" : ""}`);
      else showError("Could not open any documents");
    } catch {
      showError("A network error occurred while downloading");
    } finally {
      setBulkDownloading(false);
    }
  };

  return (
    <>
      {someSelected && (
        <BulkActionBar
          selectedCount={activeSelectedIds.size}
          bulkDeleting={bulkDeleting}
          bulkDownloading={bulkDownloading}
          onDeleteClick={() => setShowBulkConfirm(true)}
          onDownloadClick={handleBulkDownload}
          onMoveClick={
            onMoveToFolder ? () => onMoveToFolder(Array.from(activeSelectedIds)) : undefined
          }
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:items-start">
        <div className="overflow-hidden rounded-xl border border-stone-700/50 bg-stone-850/60 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-stone-700/40 px-3 py-2.5">
            <p className="text-xs text-stone-400">
              {documents.length} document{documents.length !== 1 ? "s" : ""}
            </p>
            {documents.length > 0 && (
              <label className="flex items-center gap-2 text-[11px] text-stone-500">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-stone-600 bg-stone-900 text-forge-500 focus:ring-forge-500/40"
                />
                Select all
              </label>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-800">
                <EmptyBoxIcon className="h-5 w-5 text-stone-500" />
              </div>
              <p className="text-sm text-stone-400">No documents in this view.</p>
            </div>
          ) : (
            <ul className="max-h-[min(70vh,36rem)] divide-y divide-stone-800/80 overflow-y-auto">
              {documents.map((doc) => {
                const ext = getFileExtension(doc.storage_path);
                const type = getFileIcon(doc.storage_path);
                const active = doc.id === selectedDocumentId;
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => onSelectDocument(doc.id)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition ${
                        active ? "bg-forge-500/10" : "hover:bg-stone-900/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={activeSelectedIds.has(doc.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(doc.id)) next.delete(doc.id);
                            else next.add(doc.id);
                            return next;
                          });
                        }}
                        className="rounded border-stone-600 bg-stone-900 text-forge-500 focus:ring-forge-500/40"
                        aria-label={`Select ${doc.title}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${
                            active ? "font-semibold text-stone-50" : "font-medium text-stone-200"
                          }`}
                        >
                          {doc.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-stone-500">
                          {formatBytes(doc.file_size_bytes)} · {formatDate(doc.created_at)}
                        </p>
                      </div>
                      <FileTypeIcon type={type} extension={ext || undefined} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DocumentPreviewPane
          key={selectedDoc?.id ?? "empty"}
          document={selectedDoc}
          onVersionHistory={setVersionHistoryDoc}
        />
      </div>

      <BulkDeleteDialog
        isOpen={showBulkConfirm}
        count={activeSelectedIds.size}
        deleting={bulkDeleting}
        onConfirm={handleBulkDelete}
        onClose={() => setShowBulkConfirm(false)}
      />

      {versionHistoryDoc && (
        <VersionHistoryModal
          documentId={versionHistoryDoc.id}
          documentTitle={versionHistoryDoc.title}
          isOpen={versionHistoryDoc !== null}
          onClose={() => setVersionHistoryDoc(null)}
          onRestored={() => {
            setVersionHistoryDoc(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
