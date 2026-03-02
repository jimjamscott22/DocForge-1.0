"use client";

import { useState, useRef, useEffect } from "react";

type FolderOption = {
  id: string;
  name: string;
  parent_id: string | null;
};

type MoveDocumentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  documentIds: string[];
  folders: FolderOption[];
};

export default function MoveDocumentModal({
  isOpen,
  onClose,
  onSuccess,
  documentIds,
  folders,
}: MoveDocumentModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      setSelectedFolderId("");
      setError(null);
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const handleMove = async () => {
    setLoading(true);
    setError(null);

    try {
      const folderId = selectedFolderId || null;
      const results = await Promise.allSettled(
        documentIds.map((id) =>
          fetch(`/api/documents/${id}/move`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder_id: folderId }),
          })
        )
      );

      const failed = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
      ).length;

      if (failed > 0) {
        setError(`Failed to move ${failed} document${failed !== 1 ? "s" : ""}`);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("A network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const rootFolders = folders.filter((f) => !f.parent_id);
  const childFolders = folders.filter((f) => f.parent_id);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 z-50 m-auto w-full max-w-sm rounded-xl border border-stone-700/50 bg-stone-850 p-0 text-stone-200 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <h3 className="text-lg font-semibold text-stone-100">
          Move {documentIds.length} Document{documentIds.length !== 1 ? "s" : ""}
        </h3>
        <p className="mt-1 text-sm text-stone-400">Select a destination folder</p>

        <div className="mt-4 max-h-60 overflow-y-auto rounded-lg border border-stone-700/50">
          {/* Root option */}
          <button
            type="button"
            onClick={() => setSelectedFolderId("")}
            className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-stone-800 ${
              selectedFolderId === "" ? "bg-forge-500/15 text-forge-300" : "text-stone-300"
            }`}
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Root (no folder)
          </button>

          {rootFolders.map((folder) => (
            <div key={folder.id}>
              <button
                type="button"
                onClick={() => setSelectedFolderId(folder.id)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-stone-800 ${
                  selectedFolderId === folder.id ? "bg-forge-500/15 text-forge-300" : "text-stone-300"
                }`}
              >
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                {folder.name}
              </button>
              {childFolders.filter((c) => c.parent_id === folder.id).map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedFolderId(child.id)}
                  className={`flex w-full items-center gap-2 px-8 py-2.5 text-left text-sm transition hover:bg-stone-800 ${
                    selectedFolderId === child.id ? "bg-forge-500/15 text-forge-300" : "text-stone-400"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                  {child.name}
                </button>
              ))}
            </div>
          ))}

          {folders.length === 0 && (
            <p className="px-4 py-3 text-sm text-stone-500 italic">No folders created yet</p>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="focus-ring rounded-lg border border-stone-700/50 bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-300 transition hover:bg-stone-750 disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={loading}
            className="focus-ring inline-flex items-center gap-2 rounded-lg bg-forge-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-forge-500 disabled:opacity-70"
          >
            {loading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Moving...
              </>
            ) : "Move"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
