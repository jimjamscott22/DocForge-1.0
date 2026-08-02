"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import DocumentTable from "./DocumentTable";
import FolderTree, { FolderNode } from "./FolderTree";
import CreateFolderModal from "./CreateFolderModal";
import MoveDocumentModal from "./MoveDocumentModal";
import AnalyticsDashboard from "./AnalyticsDashboard";
import ApiKeyManager from "./ApiKeyManager";
import UploadDrawer from "./UploadDrawer";
import { useToast } from "./ToastProvider";
import { useRouter } from "next/navigation";
import { DocumentRow } from "./documentTableTypes";
import { ChartBarIcon, ChevronDownIcon, DocumentIcon, KeyIcon } from "./icons";

type FolderOption = {
  id: string;
  name: string;
  parent_id: string | null;
};

type WorkspacePanel = "analytics" | "apiKeys" | null;

type DashboardClientProps = {
  documents: DocumentRow[];
  initialFolders?: FolderOption[];
  workspaceControls?: ReactNode;
};

export default function DashboardClient({
  documents,
  initialFolders = [],
  workspaceControls,
}: DashboardClientProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [workspacePanel, setWorkspacePanel] = useState<WorkspacePanel>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderModalParentId, setFolderModalParentId] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string } | null>(null);
  const [folderRefreshSignal, setFolderRefreshSignal] = useState(0);

  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [movingDocIds, setMovingDocIds] = useState<string[]>([]);
  const [folders, setFolders] = useState<FolderOption[]>(initialFolders);

  useEffect(() => {
    if (folderRefreshSignal === 0) return;
    let cancelled = false;
    fetch("/api/folders")
      .then((r) => r.json())
      .then((data: { folders: FolderOption[] }) => {
        if (!cancelled) setFolders(data.folders ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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

  const toggleWorkspace = (panel: Exclude<WorkspacePanel, null>) => {
    setWorkspacePanel((current) => (current === panel ? null : panel));
  };

  const documentFolderMap: Record<string, string | null> = {};
  for (const doc of documents) {
    documentFolderMap[doc.id] = doc.folder_id ?? null;
  }

  const filteredDocuments =
    selectedFolderId === null
      ? documents
      : documents.filter((d) => d.folder_id === selectedFolderId);

  const selectedFolderName = folders.find((f) => f.id === selectedFolderId)?.name ?? null;
  const rootDocumentCount = documents.filter((document) => !document.folder_id).length;
  const folderCount = folders.length;
  const totalStorageBytes = documents.reduce(
    (total, document) => total + (document.file_size_bytes ?? 0),
    0
  );
  const totalStorageLabel =
    totalStorageBytes > 0
      ? `${(totalStorageBytes / (1024 * 1024)).toFixed(1)} MB`
      : "0 MB";

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
      {/* Thin folder rail */}
      <section
        className="animate-fade-up order-2 lg:order-1 lg:sticky lg:top-6 lg:self-start"
        style={{ animationDelay: "0.15s" }}
      >
        <div className="rounded-lg border border-stone-700/40 bg-stone-950/30 p-3 backdrop-blur-sm">
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
        </div>

        <div className="mt-3 rounded-lg border border-stone-700/40 bg-stone-950/25 p-2 backdrop-blur-sm">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-600">
            Workspace
          </p>
          <button
            type="button"
            onClick={() => toggleWorkspace("analytics")}
            className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs font-medium transition ${
              workspacePanel === "analytics"
                ? "bg-stone-800/80 text-stone-100"
                : "text-stone-400 hover:bg-stone-800/50 hover:text-stone-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <ChartBarIcon className="h-3.5 w-3.5" />
              Analytics
            </span>
            <ChevronDownIcon
              className={`h-3.5 w-3.5 transition-transform ${
                workspacePanel === "analytics" ? "rotate-180" : ""
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => toggleWorkspace("apiKeys")}
            className={`mt-0.5 flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs font-medium transition ${
              workspacePanel === "apiKeys"
                ? "bg-stone-800/80 text-stone-100"
                : "text-stone-400 hover:bg-stone-800/50 hover:text-stone-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <KeyIcon className="h-3.5 w-3.5" />
              API Keys
            </span>
            <ChevronDownIcon
              className={`h-3.5 w-3.5 transition-transform ${
                workspacePanel === "apiKeys" ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </section>

      {/* Main browse area */}
      <section className="animate-fade-up order-1 space-y-4 lg:order-2" style={{ animationDelay: "0.2s" }}>
        {/* Command strip */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav
            className="flex flex-wrap items-center gap-1.5 text-sm text-stone-400"
            aria-label="Breadcrumb"
          >
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className={`focus-ring rounded-md px-1.5 py-0.5 transition hover:text-stone-200 ${
                selectedFolderId === null ? "font-medium text-stone-100" : ""
              }`}
            >
              All Documents
            </button>
            {selectedFolderName && (
              <>
                <span className="text-stone-600" aria-hidden>
                  /
                </span>
                <span className="rounded-md px-1.5 py-0.5 font-medium text-forge-300">
                  {selectedFolderName}
                </span>
              </>
            )}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-stone-500">
              {folderCount} folder{folderCount !== 1 ? "s" : ""} · {rootDocumentCount} root ·{" "}
              {totalStorageLabel}
            </p>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-forge-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-forge-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Upload
            </button>
          </div>
        </div>

        {workspacePanel && (
          <div className="card-glow rounded-xl border border-stone-700/50 bg-stone-850/60 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg text-stone-50">
                {workspacePanel === "analytics" ? "Analytics" : "API Keys"}
              </h2>
              <button
                type="button"
                onClick={() => setWorkspacePanel(null)}
                className="focus-ring rounded-md px-2 py-1 text-xs font-medium text-stone-400 transition hover:text-stone-200"
              >
                Close
              </button>
            </div>
            {workspacePanel === "analytics" ? <AnalyticsDashboard /> : <ApiKeyManager />}
          </div>
        )}

        <div className="card-glow overflow-hidden rounded-xl border border-stone-700/50 bg-stone-850/60 backdrop-blur-sm">
          <div className="border-b border-stone-700/40 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forge-500/15 ring-1 ring-forge-500/20">
                    <DocumentIcon className="h-4 w-4 text-forge-400" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl text-stone-50">Library</h2>
                    <p className="text-sm text-stone-400">
                      {filteredDocuments.length} file
                      {filteredDocuments.length !== 1 ? "s" : ""}
                      {selectedFolderName
                        ? ` in ${selectedFolderName}`
                        : " across your vault"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-stone-500 sm:max-w-xs sm:text-right">
                  Drag rows into folders. Select rows for bulk actions.
                </p>
              </div>
              {workspaceControls}
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <DocumentTable documents={filteredDocuments} onMoveToFolder={handleMoveToFolder} />
          </div>
        </div>
      </section>

      <UploadDrawer isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />

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
