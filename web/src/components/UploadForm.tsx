"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "uploading" | "success" | "error";

export default function UploadForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

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
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Upload failed");
      }

      setStatus("success");
      form.reset();
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  };

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
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-800" htmlFor="file">
          File
        </label>
        <input
          required
          id="file"
          name="file"
          type="file"
          accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg,.gif"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white file:transition file:hover:bg-zinc-800"
        />
        <p className="text-xs text-zinc-600">Max 10MB. Stored locally in /public/uploads.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "uploading"}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-70"
        >
          {status === "uploading" ? "Uploading..." : "Upload"}
        </button>
        {status === "success" ? (
          <span className="text-xs font-semibold text-green-600">Uploaded</span>
        ) : null}
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    </form>
  );
}
