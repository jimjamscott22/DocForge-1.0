"use client";

import { useEffect, useRef, useState } from "react";

type Version = {
  id: string;
  version_number: number;
  storage_path: string;
  file_size_bytes: number;
  content_type: string | null;
  created_at: string;
};

type Props = {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
};

const formatBytes = (bytes: number) => {
  if (bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / 1024 ** exp;
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${units[exp]}`;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );

export default function VersionHistoryModal({
  documentId,
  documentTitle,
  isOpen,
  onClose,
  onRestored,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      fetchVersions();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to load version history");
        return;
      }
      const data = await res.json();
      setVersions(data.versions ?? []);
    } catch {
      setError("A network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: Version) => {
    setRestoringId(version.id);
    try {
      const res = await fetch(
        `/api/documents/${documentId}/versions/${version.id}/restore`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to restore version");
        return;
      }
      onRestored();
    } catch {
      setError("A network error occurred while restoring");
    } finally {
      setRestoringId(null);
    }
  };

  const currentVersionNumber = versions[0]?.version_number ?? null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 z-50 m-auto w-full max-w-2xl rounded-xl border border-stone-700/50 bg-stone-900 p-0 text-stone-200 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-stone-700/50 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-stone-100">Version History</h2>
          <p className="mt-0.5 text-sm text-stone-400 truncate max-w-sm">{documentTitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-800 hover:text-stone-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-6">
        {loading && (
          <div className="flex items-center justify-center py-10 text-stone-400">
            <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading versions…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-700/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && versions.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-500">No version history found.</p>
        )}

        {!loading && !error && versions.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                <th className="pb-3 pr-4">Version</th>
                <th className="pb-3 pr-4">Uploaded</th>
                <th className="pb-3 pr-4">Size</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {versions.map((v) => {
                const isCurrent = v.version_number === currentVersionNumber;
                const isRestoring = restoringId === v.id;
                return (
                  <tr key={v.id} className="group">
                    <td className="py-3 pr-4 font-mono text-stone-300">v{v.version_number}</td>
                    <td className="py-3 pr-4 text-stone-400">{formatDate(v.created_at)}</td>
                    <td className="py-3 pr-4 text-stone-400">{formatBytes(v.file_size_bytes)}</td>
                    <td className="py-3 pr-4 text-stone-400 font-mono text-xs">
                      {v.content_type ?? "—"}
                    </td>
                    <td className="py-3 text-right">
                      {isCurrent ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                          Current
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestore(v)}
                          disabled={isRestoring || restoringId !== null}
                          className="rounded-lg border border-stone-700/50 bg-stone-800 px-3 py-1 text-xs font-medium text-stone-300 transition hover:bg-stone-700 hover:text-stone-100 disabled:opacity-50"
                        >
                          {isRestoring ? "Restoring…" : "Restore"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </dialog>
  );
}
