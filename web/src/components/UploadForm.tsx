"use client";

import { FormEvent, useState, useRef, DragEvent } from "react";
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

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".txt", ".md", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".gif",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function UploadForm() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { handleError } = useErrorHandler();
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return `File type "${ext}" is not supported.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File must be 50MB or smaller.";
    }
    return null;
  };

  const applyDroppedFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    // Set file on the input via DataTransfer
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
    }

    // Auto-fill title if empty
    if (titleInputRef.current && !titleInputRef.current.value.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      // Trigger React-compatible value update
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, "value"
      )?.set;
      nativeInputValueSetter?.call(titleInputRef.current, nameWithoutExt);
      titleInputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      applyDroppedFile(file);
    }
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

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
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
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setError(null);
      }
    }
  };

  const isUploading = status === "uploading";
  const pct = progress ? Math.min((progress.loaded / progress.total) * 100, 100) : 0;

  return (
    <div
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-lg transition-colors duration-200 ${
        isDragging ? "ring-2 ring-forge-400/60 bg-forge-400/5" : ""
      }`}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-forge-400 bg-stone-900/90 backdrop-blur-sm">
          <svg className="mb-2 h-8 w-8 text-forge-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm font-semibold text-forge-400">Drop your file here</p>
          <p className="mt-1 text-xs text-stone-500">PDF, images, text &middot; up to 50 MB</p>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4" encType="multipart/form-data">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500" htmlFor="title">
            Title
          </label>
          <input
            required
            ref={titleInputRef}
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
          <p className="text-xs text-stone-600">Max 50 MB &middot; Drag & drop or click to browse &middot; Stored in Supabase Storage</p>
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
    </div>
  );
}
