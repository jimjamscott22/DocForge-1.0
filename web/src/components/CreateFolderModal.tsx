"use client";

import { useState, useRef, useEffect } from "react";

type FolderOption = {
  id: string;
  name: string;
};

type CreateFolderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialParentId?: string | null;
  folders?: FolderOption[];
  editingFolder?: { id: string; name: string } | null;
};

export default function CreateFolderModal({
  isOpen,
  onClose,
  onSuccess,
  initialParentId,
  folders = [],
  editingFolder,
}: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      setName(editingFolder?.name ?? "");
      setParentId(initialParentId ?? "");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, editingFolder, initialParentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Folder name is required"); return; }
    setLoading(true);
    setError(null);

    try {
      let res: Response;
      if (editingFolder) {
        res = await fetch(`/api/folders/${editingFolder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });
      } else {
        res = await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), parent_id: parentId || null }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setError(data?.error ?? "Failed to save folder");
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

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 z-50 m-auto w-full max-w-sm rounded-xl border border-stone-700/50 bg-stone-850 p-0 text-stone-200 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-stone-100">
            {editingFolder ? "Rename Folder" : "Create Folder"}
          </h3>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-400">
                Folder name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Documents"
                className="focus-ring w-full rounded-lg border border-stone-700/50 bg-stone-900/80 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 transition focus:border-forge-500/40 focus:outline-none"
              />
            </div>

            {!editingFolder && folders.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-400">
                  Parent folder (optional)
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="focus-ring w-full rounded-lg border border-stone-700/50 bg-stone-900/80 px-3 py-2 text-sm text-stone-200 transition focus:border-forge-500/40 focus:outline-none"
                >
                  <option value="">None (root level)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
          </div>

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
              type="submit"
              disabled={loading}
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-forge-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-forge-500 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : editingFolder ? "Rename" : "Create"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
