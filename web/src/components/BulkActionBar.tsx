"use client";

type Props = {
  selectedCount: number;
  bulkDeleting: boolean;
  bulkDownloading: boolean;
  onDeleteClick: () => void;
  onDownloadClick: () => void;
  onMoveClick?: () => void;
  onClear: () => void;
};

export default function BulkActionBar({
  selectedCount,
  bulkDeleting,
  bulkDownloading,
  onDeleteClick,
  onDownloadClick,
  onMoveClick,
  onClear,
}: Props) {
  return (
    <div className="mb-3 flex items-center gap-3 rounded-lg border border-forge-500/20 bg-forge-500/5 px-4 py-2.5">
      <span className="text-xs font-semibold text-forge-300">
        {selectedCount} selected
      </span>
      <div className="h-4 w-px bg-stone-700/50" />
      <button
        onClick={onDeleteClick}
        disabled={bulkDeleting}
        className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-70"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete selected
      </button>
      <button
        onClick={onDownloadClick}
        disabled={bulkDownloading}
        className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-stone-700/50 bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:border-forge-500/40 hover:text-forge-300 disabled:opacity-70"
      >
        {bulkDownloading ? (
          <>
            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Opening...
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open selected
          </>
        )}
      </button>
      {onMoveClick && (
        <button
          onClick={onMoveClick}
          className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-stone-700/50 bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:border-forge-500/40 hover:text-forge-300"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          Move to folder
        </button>
      )}
      <button
        onClick={onClear}
        className="ml-auto text-xs text-stone-500 transition hover:text-stone-300"
      >
        Clear
      </button>
    </div>
  );
}
