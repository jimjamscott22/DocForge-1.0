"use client";

import { FormEvent, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";
import { useErrorHandler } from "./ErrorProvider";
import { parseApiError } from "@/lib/errors";
import { Spinner } from "./Spinner";

type Status = "idle" | "uploading" | "success" | "error";

interface UploadProgress {
  loaded: number;
  total: number;
}

export default function UploadForm() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { handleError } = useErrorHandler();
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file") as File | null;

    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File must be 50MB or smaller.");
      return;
    }

    try {
      setStatus("uploading");
      setError(null);
      setProgress({ loaded: 0, total: file.size });

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress({ loaded: event.loaded, total: event.total });
        }
      };

      xhr.onload = async () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            setStatus("success");
            showSuccess("Document uploaded successfully!");
            form.reset();
            router.refresh();
            setTimeout(() => setStatus("idle"), 3000);
            return;
          }

          const response = new Response(xhr.responseText, {
            status: xhr.status,
            headers: {
              "Content-Type": xhr.getResponseHeader("Content-Type") ?? "application/json",
            },
          });
          const appError = await parseApiError(response);
          setStatus("error");
          setError(appError.userMessage);
          showError(appError.userMessage);
          handleError(appError, "UploadForm");
        } catch (err) {
          setStatus("error");
          const errorMessage = err instanceof Error ? err.message : "Upload failed";
          setError(errorMessage);
          showError(errorMessage);
          handleError(err, "UploadForm");
        }
      };

      xhr.onerror = () => {
        const errorMessage = "Network error occurred during upload";
        setStatus("error");
        setError(errorMessage);
        showError(errorMessage);
        handleError(new Error(errorMessage), "UploadForm");
      };

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    } catch (err) {
      setStatus("error");
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      showError(errorMessage);
      handleError(err, "UploadForm");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.size > 50 * 1024 * 1024) {
      setError("File must be 50MB or smaller.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      setError(null);
    }
  };

  const isUploading = status === "uploading";
  const pct = progress ? Math.min((progress.loaded / progress.total) * 100, 100) : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-4" encType="multipart/form-data">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500" htmlFor="title">
          Title
        </label>
        <input
          required
          id="title"
          name="title"
          type="text"
          placeholder="e.g. API Spec v1"
          disabled={isUploading}
          className="focus-ring w-full rounded-lg border border-stone-700/50 bg-stone-900/80 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 transition focus:border-forge-500/40 focus:outline-none disabled:opacity-50"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500" htmlFor="file">
          File
        </label>
        <input
          required
          ref={fileInputRef}
          id="file"
          name="file"
          type="file"
          accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg,.gif"
          onChange={handleFileChange}
          disabled={isUploading}
          className="w-full rounded-lg border border-stone-700/50 bg-stone-900/80 px-3 py-2 text-sm text-stone-300 transition file:mr-3 file:rounded-md file:border-0 file:bg-forge-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white file:transition file:hover:bg-forge-500 disabled:opacity-50"
        />
        <p className="text-xs text-stone-600">Max 50 MB &middot; Stored in Supabase Storage</p>
      </div>

      {isUploading && progress && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-stone-400">
            <span>Uploading&hellip;</span>
            <span className="font-mono">{formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
            <div
              className="progress-glow h-full rounded-full bg-gradient-to-r from-forge-600 to-forge-400 transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isUploading}
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-forge-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-forge-500 disabled:opacity-70"
        >
          {isUploading ? (
            <>
              <Spinner size="sm" />
              Uploading&hellip;
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload
            </>
          )}
        </button>
        {status === "success" && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Uploaded
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
