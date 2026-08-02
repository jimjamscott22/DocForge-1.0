"use client";

import { useEffect, useRef } from "react";
import UploadSection from "./UploadSection";

type UploadDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function UploadDrawer({ isOpen, onClose }: UploadDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-y-0 right-0 z-50 m-0 ml-auto h-full w-full max-w-md border-0 border-l border-stone-700/50 bg-stone-850 p-0 text-stone-200 shadow-2xl open:flex open:flex-col backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-stone-700/40 px-5 py-4">
        <div>
          <h2 className="font-display text-lg text-stone-50">Add documents</h2>
          <p className="text-xs text-stone-500">Upload a file or import from a URL</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring rounded-lg border border-stone-700/50 bg-stone-800/80 p-2 text-stone-400 transition hover:bg-stone-750 hover:text-stone-200"
          aria-label="Close upload drawer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <UploadSection embedded />
      </div>
    </dialog>
  );
}
