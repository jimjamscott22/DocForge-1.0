"use client";

import { useState } from "react";
import UploadForm from "./UploadForm";
import ImportUrlForm from "./ImportUrlForm";

type Tab = "upload" | "import";

export default function UploadSection() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");

  return (
    <div className="card-glow rounded-xl border border-stone-700/50 bg-stone-850/60 p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forge-500/15">
          {activeTab === "upload" ? (
            <svg className="h-4 w-4 text-forge-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-forge-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}
        </div>
        <div>
          <h2 className="font-display text-lg text-stone-50">
            {activeTab === "upload" ? "Upload" : "Import from web"}
          </h2>
          <p className="text-xs text-stone-500">
            {activeTab === "upload"
              ? "PDF, images, text \u00b7 up to 50\u00a0MB"
              : "Paste a URL to save a page as a document"}
          </p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="mb-5 flex rounded-lg border border-stone-700/50 bg-stone-900/60 p-0.5">
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "upload"
              ? "bg-forge-600 text-white shadow-sm"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("import")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "import"
              ? "bg-forge-600 text-white shadow-sm"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Import from URL
        </button>
      </div>

      {activeTab === "upload" ? <UploadForm /> : <ImportUrlForm />}
    </div>
  );
}
