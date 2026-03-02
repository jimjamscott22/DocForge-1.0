"use client";

import { useState, useEffect, useCallback } from "react";

export type FolderNode = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  children?: FolderNode[];
  documentCount?: number;
};

type FolderTreeProps = {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folder: FolderNode) => void;
  onDeleteFolder: (folder: FolderNode) => void;
  onDropDocument?: (documentId: string, folderId: string | null) => void;
  documentFolderMap?: Record<string, string | null>;
  refreshSignal?: number;
};

function buildTree(folders: FolderNode[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];
  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }
  for (const f of map.values()) {
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children!.push(f);
    } else {
      roots.push(f);
    }
  }
  return roots;
}

function FolderItem({
  folder,
  depth,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDropDocument,
  documentFolderMap,
}: {
  folder: FolderNode;
  depth: number;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folder: FolderNode) => void;
  onDeleteFolder: (folder: FolderNode) => void;
  onDropDocument?: (documentId: string, folderId: string | null) => void;
  documentFolderMap?: Record<string, string | null>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const isSelected = selectedFolderId === folder.id;
  const docCount = documentFolderMap
    ? Object.values(documentFolderMap).filter((fid) => fid === folder.id).length
    : 0;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const docId = e.dataTransfer.getData("text/plain");
    if (docId && onDropDocument) onDropDocument(docId, folder.id);
  };

  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition cursor-pointer ${
          isSelected
            ? "bg-forge-500/15 text-forge-300"
            : isDragOver
            ? "bg-stone-700/50 text-stone-200"
            : "text-stone-400 hover:bg-stone-800 hover:text-stone-200"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelectFolder(folder.id)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {(folder.children?.length ?? 0) > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="flex-shrink-0 rounded p-0.5 hover:bg-stone-700"
          >
            <svg
              className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
        <span className="flex-1 truncate text-xs font-medium">{folder.name}</span>
        {docCount > 0 && (
          <span className="flex-shrink-0 rounded-full bg-stone-700/60 px-1.5 py-0.5 text-[10px] font-medium text-stone-400">
            {docCount}
          </span>
        )}
        <div className="ml-auto hidden flex-shrink-0 items-center gap-0.5 group-hover:flex">
          <button
            onClick={(e) => { e.stopPropagation(); onCreateFolder(folder.id); }}
            className="rounded p-0.5 text-stone-500 hover:bg-stone-700 hover:text-stone-300"
            title="New subfolder"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRenameFolder(folder); }}
            className="rounded p-0.5 text-stone-500 hover:bg-stone-700 hover:text-stone-300"
            title="Rename"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder); }}
            className="rounded p-0.5 text-stone-500 hover:bg-stone-700 hover:text-red-400"
            title="Delete"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      {expanded && folder.children && folder.children.length > 0 && (
        <ul>
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onDropDocument={onDropDocument}
              documentFolderMap={documentFolderMap}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FolderTree({
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDropDocument,
  documentFolderMap,
  refreshSignal,
}: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);

  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders");
      if (!res.ok) return;
      const data = await res.json() as { folders: FolderNode[] };
      setFolders(data.folders ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders, refreshSignal]);

  const tree = buildTree(folders);

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">
          Folders
        </span>
        <button
          onClick={() => onCreateFolder(null)}
          className="focus-ring inline-flex items-center gap-1 rounded-md border border-stone-700/50 bg-stone-800 px-2 py-1 text-[10px] font-semibold text-stone-400 transition hover:border-forge-500/40 hover:text-forge-300"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>
      </div>

      <ul className="space-y-0.5">
        {/* All Documents root */}
        <li>
          <div
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition cursor-pointer ${
              selectedFolderId === null && !isDragOverRoot
                ? "bg-forge-500/15 text-forge-300"
                : isDragOverRoot
                ? "bg-stone-700/50 text-stone-200"
                : "text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            }`}
            onClick={() => onSelectFolder(null)}
            onDragOver={(e) => { e.preventDefault(); setIsDragOverRoot(true); }}
            onDragLeave={() => setIsDragOverRoot(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOverRoot(false);
              const docId = e.dataTransfer.getData("text/plain");
              if (docId && onDropDocument) onDropDocument(docId, null);
            }}
          >
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">All Documents</span>
          </div>
        </li>

        {loading ? (
          <li className="px-3 py-2 text-xs text-stone-600">Loading...</li>
        ) : tree.length === 0 ? (
          <li className="px-3 py-2 text-xs text-stone-600 italic">No folders yet</li>
        ) : (
          tree.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              depth={0}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onDropDocument={onDropDocument}
              documentFolderMap={documentFolderMap}
            />
          ))
        )}
      </ul>
    </div>
  );
}
