"use client";

import { useState, useCallback, useEffect } from "react";
import DocumentTable from "./DocumentTable";
import FolderTree, { FolderNode } from "./FolderTree";
import CreateFolderModal from "./CreateFolderModal";
import MoveDocumentModal from "./MoveDocumentModal";
import AnalyticsDashboard from "./AnalyticsDashboard";
import ApiKeyManager from "./ApiKeyManager";
import { useToast } from "./ToastProvider";
import { useRouter } from "next/navigation";

type DocumentRow = {
  id: string;
  title: string;
  storage_path: string;
  file_size_bytes: number | null;
  created_at: string;
  folder_id?: string | null;
};

type FolderOption = {
  id: string;
  name: string;
  parent_id: string | null;
};

type DashboardClientProps = {
  documents: DocumentRow[];
};

export default function DashboardClient({ documents }: DashboardClientProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [showFolderTree, setShowFolderTree] = useState(true);

  // Folder modal state
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderModalParentId, setFolderModalParentId] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string } | null>(null);
  const [folderRefreshSignal, setFolderRefreshSignal] = useState(0);

  // Move document modal state
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [movingDocIds, setMovingDocIds] = useState<string[]>([]);
  const [folders, setFolders] = useState<FolderOption[]>([]);

  // Load folder list for move modal; re-runs when folderRefreshSignal changes
  useEffect(() => {
    let cancelled = false;
    fetch("/api/folders")
      .then((r) => r.json())
      .then((data: { folders: FolderOption[] }) => {
        if (!cancelled) setFolders(data.folders ?? []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [folderRefreshSignal]);

  const handleFolderRefresh = useCallback(() => {
    setFolderRefreshSignal((n) => n + 1);
  }, []);

  const handleCreateFolder = (parentId: string | null) => {
    setEditingFolder(null);
    setFolderModalParentId(parentId);
    setFolderModalOpen(true);
  };

  const handleRenameFolder = (folder: FolderNode) => {
    setEditingFolder({ id: folder.id, name: folder.name });
    setFolderModalParentId(null);
    setFolderModalOpen(true);
  };

  const handleDeleteFolder = async (folder: FolderNode) => {
    const confirmed = window.confirm(
      `Delete folder "${folder.name}"? Documents inside will be moved to root.`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
      if (!res.ok) {
        showError("Failed to delete folder");
        return;
      }
      showSuccess(`Folder "${folder.name}" deleted`);
      handleFolderRefresh();
      if (selectedFolderId === folder.id) setSelectedFolderId(null);
      router.refresh();
    } catch {
      showError("A network error occurred");
    }
  };

  const handleDropDocument = async (documentId: string, folderId: string | null) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId }),
      });
      if (!res.ok) {
        showError("Failed to move document");
        return;
      }
      showSuccess(folderId ? "Document moved to folder" : "Document moved to root");
      router.refresh();
    } catch {
      showError("A network error occurred");
    }
  };

  const handleMoveToFolder = (ids: string[]) => {
    setMovingDocIds(ids);
    setMoveModalOpen(true);
  };

  // Build folder map for drag-drop highlighting in tree
  const documentFolderMap: Record<string, string | null> = {};
  for (const doc of documents) {
    documentFolderMap[doc.id] = doc.folder_id ?? null;
  }

  // Filter documents by selected folder
  const filteredDocuments = selectedFolderId === null
    ? documents
    : documents.filter((d) => d.folder_id === selectedFolderId);

  const selectedFolderName = folders.find((f) => f.id === selectedFolderId)?.name ?? null;
  const rootDocumentCount = documents.filter((document) => !document.folder_id).length;
  const folderCount = folders.length;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left sidebar */}
      <section className="animate-fade-up lg:col-span-1 lg:sticky lg:top-6 lg:self-start" style={{ animationDelay: "0.15s" }}>
        <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-700/50 bg-stone-700/50">
          <div className="bg-stone-900/50 p-4 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Folders</p>
            <p className="mt-2 font-display text-2xl text-stone-50">{folderCount}</p>
            <p className="mt-1 text-xs text-stone-500">Organized spaces in your vault</p>
          </div>
          <div className="bg-stone-900/50 p-4 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Root Files</p>
            <p className="mt-2 font-display text-2xl text-stone-50">{rootDocumentCount}</p>
            <p className="mt-1 text-xs text-stone-500">Documents not inside a folder</p>
          </div>
        </div>
        {/* Folder tree */}
        <div className="card-glow rounded-xl border border-stone-700/50 bg-stone-850/60 p-4 backdrop-blur-sm">
          <button
            onClick={() => setShowFolderTree((v) => !v)}
            className="mb-3 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-widest text-stone-500 transition hover:text-stone-300"
          >
            <span>Folders</span>
            <svg
              className={`h-3.5 w-3.5 transition-transform ${showFolderTree ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showFolderTree && (
            <FolderTree
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={handleCreateFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              onDropDocument={handleDropDocument}
              documentFolderMap={documentFolderMap}
              refreshSignal={folderRefreshSignal}
            />
          )}
        </div>

        {/* Analytics toggle */}
        <div className="mt-4 rounded-xl border border-stone-700/50 bg-stone-850/40 p-4 backdrop-blur-sm">
          <button
            onClick={() => setShowAnalytics((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-widest text-stone-500 transition hover:text-stone-300"
          >
            <span className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </span>
            <svg
              className={`h-3.5 w-3.5 transition-transform ${showAnalytics ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showAnalytics && (
            <div className="mt-4">
              <AnalyticsDashboard />
            </div>
          )}
        </div>

        {/* API Keys toggle */}
        <div className="mt-4 rounded-xl border border-stone-700/50 bg-stone-850/40 p-4 backdrop-blur-sm">
          <button
            onClick={() => setShowApiKeys((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-widest text-stone-500 transition hover:text-stone-300"
          >
            <span className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              API Keys
            </span>
            <svg
              className={`h-3.5 w-3.5 transition-transform ${showApiKeys ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showApiKeys && (
            <div className="mt-4">
              <ApiKeyManager />
            </div>
          )}
        </div>
      </section>

      {/* Documents section */}
      <section className="animate-fade-up lg:col-span-2" style={{ animationDelay: "0.2s" }}>
        <div className="card-glow overflow-hidden rounded-xl border border-stone-700/50 bg-stone-850/60 backdrop-blur-sm">
          <div className="border-b border-stone-700/40 bg-[linear-gradient(135deg,rgba(249,115,22,0.1),transparent_40%),linear-gradient(180deg,rgba(12,10,9,0.25),rgba(12,10,9,0))] px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forge-500/15 ring-1 ring-forge-500/20">
                  <svg className="h-5 w-5 text-forge-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl text-stone-50">Documents</h2>
                    {selectedFolderName && (
                      <span className="rounded-full border border-forge-500/30 bg-forge-500/10 px-2.5 py-1 text-xs font-semibold text-forge-300">
                        {selectedFolderName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-400">
                    {filteredDocuments.length} file{filteredDocuments.length !== 1 ? "s" : ""}
                    {selectedFolderName ? ` currently visible in ${selectedFolderName}` : " currently visible across your vault"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                <span className="rounded-full border border-stone-700/60 bg-stone-950/40 px-3 py-1.5">
                  Drag rows into folders
                </span>
                <span className="rounded-full border border-stone-700/60 bg-stone-950/40 px-3 py-1.5">
                  Bulk actions after selection
                </span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <DocumentTable
              documents={filteredDocuments}
              onMoveToFolder={handleMoveToFolder}
            />
          </div>
        </div>
      </section>

      {/* Modals */}
      <CreateFolderModal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        onSuccess={handleFolderRefresh}
        initialParentId={folderModalParentId}
        folders={folders}
        editingFolder={editingFolder}
      />
      <MoveDocumentModal
        isOpen={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        onSuccess={() => {
          router.refresh();
          setMoveModalOpen(false);
        }}
        documentIds={movingDocIds}
        folders={folders}
      />
    </div>
  );
}
