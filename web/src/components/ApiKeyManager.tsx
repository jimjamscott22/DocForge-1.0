"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "./ToastProvider";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
};

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createDialogRef = useRef<HTMLDialogElement>(null);
  const { showSuccess, showError } = useToast();

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/keys");
      if (!res.ok) return;
      const data = await res.json() as { keys: ApiKey[] };
      setKeys(data.keys ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadKeys(); }, [loadKeys]);

  useEffect(() => {
    if (showCreateModal) createDialogRef.current?.showModal();
    else createDialogRef.current?.close();
  }, [showCreateModal]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) { setError("Key name is required"); return; }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setError(data?.error ?? "Failed to create key");
        return;
      }
      const data = await res.json() as { key: ApiKey; rawKey: string };
      setCreatedKey(data.rawKey);
      setKeys((prev) => [data.key, ...prev]);
      setNewKeyName("");
    } catch {
      setError("A network error occurred");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        showError("Failed to revoke API key");
        return;
      }
      setKeys((prev) => prev.map((k) => k.id === id ? { ...k, is_active: false } : k));
      showSuccess("API key revoked");
    } catch {
      showError("A network error occurred");
    } finally {
      setRevoking(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess("Copied to clipboard");
    } catch {
      showError("Failed to copy to clipboard");
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreatedKey(null);
    setNewKeyName("");
    setError(null);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">API Keys</h3>
          <p className="text-xs text-stone-500">Use API keys to access DocForge from external applications</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-forge-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-forge-500"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Generate Key
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="h-5 w-5 animate-spin text-stone-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : keys.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500 italic">No API keys generated yet</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-700/40">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700/40 bg-stone-900/60">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500">Prefix</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500 sm:table-cell">Created</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500 md:table-cell">Last Used</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-stone-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-700/30">
              {keys.map((key) => (
                <tr key={key.id} className="table-row-hover">
                  <td className="px-4 py-3 font-medium text-stone-200">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-400">{key.key_prefix}...</td>
                  <td className="hidden px-4 py-3 text-xs text-stone-400 sm:table-cell">
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(key.created_at))}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-stone-400 md:table-cell">
                    {key.last_used_at
                      ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(key.last_used_at))
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      key.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-stone-700/50 text-stone-500"
                    }`}>
                      {key.is_active ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {key.is_active && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        disabled={revoking === key.id}
                        className="focus-ring inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-70"
                      >
                        {revoking === key.id ? "Revoking..." : "Revoke"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create key modal */}
      <dialog
        ref={createDialogRef}
        onClose={handleCloseCreateModal}
        className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-xl border border-stone-700/50 bg-stone-850 p-0 text-stone-200 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          {createdKey ? (
            <>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-100">API Key Created</h3>
              <p className="mt-1 text-sm font-medium text-amber-400">
                <svg className="mr-1 inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Copy this key now — it will never be shown again.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-stone-700/50 bg-stone-900/80 p-3">
                <code className="flex-1 truncate font-mono text-xs text-emerald-400">{createdKey}</code>
                <button
                  onClick={() => copyToClipboard(createdKey)}
                  className="flex-shrink-0 rounded-md border border-stone-700/50 bg-stone-800 px-2.5 py-1.5 text-xs text-stone-300 transition hover:bg-stone-700"
                >
                  Copy
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleCloseCreateModal}
                  className="focus-ring rounded-lg bg-forge-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-forge-500"
                >
                  Done
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-stone-100">Generate API Key</h3>
              <form onSubmit={handleCreate} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-stone-400">Key name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="My Integration"
                    className="focus-ring w-full rounded-lg border border-stone-700/50 bg-stone-900/80 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 transition focus:border-forge-500/40 focus:outline-none"
                  />
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    disabled={creating}
                    className="focus-ring rounded-lg border border-stone-700/50 bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-300 transition hover:bg-stone-750 disabled:opacity-70"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="focus-ring inline-flex items-center gap-2 rounded-lg bg-forge-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-forge-500 disabled:opacity-70"
                  >
                    {creating ? "Creating..." : "Generate"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
