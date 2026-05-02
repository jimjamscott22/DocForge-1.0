"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";
import BulkActionBar from "./BulkActionBar";
import BulkDeleteDialog from "./BulkDeleteDialog";
import DocumentTableCore from "./DocumentTableCore";
import VersionHistoryModal from "./VersionHistoryModal";
import { DocumentRow } from "./documentTableTypes";

export default function DocumentTable({
  documents,
  onMoveToFolder,
}: {
  documents: DocumentRow[];
  onMoveToFolder?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [versionHistoryDoc, setVersionHistoryDoc] = useState<DocumentRow | null>(null);

  // Clear selection when documents change (e.g. after delete/refresh)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [documents]);

  const allSelected = documents.length > 0 && selectedIds.size === documents.length;
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
        const res = await fetch(`/api/documents/${id}/download?event=view`);
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

  return (
    <>
      {someSelected && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          bulkDeleting={bulkDeleting}
          bulkDownloading={bulkDownloading}
          onDeleteClick={() => setShowBulkConfirm(true)}
          onDownloadClick={handleBulkDownload}
          onMoveClick={onMoveToFolder ? () => onMoveToFolder(Array.from(selectedIds)) : undefined}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      <DocumentTableCore
        documents={documents}
        selectedIds={selectedIds}
        allSelected={allSelected}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onVersionHistory={(doc) => setVersionHistoryDoc(doc)}
      />

      <BulkDeleteDialog
        isOpen={showBulkConfirm}
        count={selectedIds.size}
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
