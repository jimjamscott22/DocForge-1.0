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

    if (file.size > 10 * 1024 * 1024) {
      setError("File must be 10MB or smaller.");
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
    if (file && file.size > 10 * 1024 * 1024) {
      setError("File must be 10MB or smaller.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      setError(null);
    }
  };

  const isUploading = status === "uploading";

  return (
    <form onSubmit={onSubmit} className="space-y-3" encType="multipart/form-data">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-800" htmlFor="title">
          Title
        </label>
        <input
          required
          id="title"
          name="title"
          type="text"
          placeholder="e.g. API Spec v1"
          disabled={isUploading}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-zinc-50 disabled:text-zinc-500"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-800" htmlFor="file">
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
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white file:transition file:hover:bg-zinc-800 disabled:opacity-50"
        />
        <p className="text-xs text-zinc-600">Max 10MB. Stored locally in /public/uploads.</p>
      </div>

      {isUploading && progress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-600">
            <span>Uploading...</span>
            <span>{formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{
                width: `${Math.min((progress.loaded / progress.total) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-70"
        >
          {isUploading ? (
            <>
              <Spinner size="sm" />
              Uploading...
            </>
          ) : (
            "Upload"
          )}
        </button>
        {status === "success" && (
          <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Uploaded
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1 text-xs text-red-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
