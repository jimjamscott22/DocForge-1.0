"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getFileExtension } from "@/lib/fileType";
import {
  DocumentRow,
  FileTypeIcon,
  formatBytes,
  formatDate,
  getFileIcon,
} from "./documentTableTypes";
import ViewDocumentButton from "./ViewDocumentButton";
import DeleteDocumentButton from "./DeleteDocumentButton";
import ExportButton from "./ExportButton";
import { HistoryIcon } from "./icons";

type DocumentPreviewPaneProps = {
  document: DocumentRow | null;
  onVersionHistory: (doc: DocumentRow) => void;
};

type PreviewKind = "text" | "pdf" | "image" | "unsupported";

function previewKind(ext: string): PreviewKind {
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["txt", "md"].includes(ext)) return "text";
  return "unsupported";
}

function PreviewBody({
  doc,
  onVersionHistory,
}: {
  doc: DocumentRow;
  onVersionHistory: (doc: DocumentRow) => void;
}) {
  const ext = getFileExtension(doc.storage_path);
  const kind = previewKind(ext);
  const type = getFileIcon(doc.storage_path);

  const [loading, setLoading] = useState(kind !== "unsupported");
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [extension, setExtension] = useState(ext || "file");
  const [truncated, setTruncated] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  useEffect(() => {
    if (kind === "unsupported") return;

    let cancelled = false;

    const load = async () => {
      try {
        if (kind === "text") {
          const res = await fetch(`/api/documents/${doc.id}/content`);
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            if (!cancelled) setError(data?.error || "Failed to load preview");
            return;
          }
          const data = await res.json();
          if (!cancelled) {
            setTextContent(data.content);
            setExtension(data.extension);
            setTruncated(Boolean(data.truncated));
          }
          return;
        }

        const res = await fetch(`/api/documents/${doc.id}/download?event=preview`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          if (!cancelled) setError(data?.error || "Failed to load preview");
          return;
        }
        const { url } = await res.json();
        if (!cancelled) setMediaUrl(url);
      } catch {
        if (!cancelled) setError("A network error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [doc.id, kind]);

  return (
    <div className="flex h-full min-h-[22rem] flex-col overflow-hidden rounded-xl border border-stone-700/50 bg-stone-850/60 backdrop-blur-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
      <div className="shrink-0 border-b border-stone-700/40 px-4 py-3">
        <div className="flex items-start gap-3">
          <FileTypeIcon type={type} extension={ext || undefined} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg text-stone-50">{doc.title}</h3>
            <p className="mt-0.5 text-xs text-stone-500">
              {formatBytes(doc.file_size_bytes)} · {formatDate(doc.created_at)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ViewDocumentButton documentId={doc.id} />
          <ExportButton
            documentId={doc.id}
            storagePath={doc.storage_path}
            documentTitle={doc.title}
          />
          <button
            type="button"
            onClick={() => onVersionHistory(doc)}
            className="focus-ring inline-flex items-center gap-1 rounded-md border border-stone-700/50 bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-stone-400 transition hover:text-stone-200"
            title="Version history"
          >
            <HistoryIcon className="h-3.5 w-3.5" />
            History
          </button>
          <DeleteDocumentButton documentId={doc.id} documentTitle={doc.title} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center py-16 text-sm text-stone-400">
            <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading preview…
          </div>
        )}

        {error && !loading && (
          <div className="px-4 py-12 text-center text-sm text-red-400">{error}</div>
        )}

        {!loading && !error && kind === "unsupported" && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-stone-400">Inline preview isn&apos;t available for this file type.</p>
            <p className="mt-1 text-xs text-stone-500">Use Open to view it in a new tab.</p>
          </div>
        )}

        {!loading && !error && kind === "text" && textContent !== null && (
          <>
            {extension === "md" ? (
              <div className="markdown-preview p-4 text-sm leading-relaxed text-stone-300">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    code({ className, children, node: _node, ...rest }: React.HTMLAttributes<HTMLElement> & { node?: unknown }) {
                      const match = /language-(\w+)/.exec(className || "");
                      return match ? (
                        <div className="my-3 overflow-hidden rounded-lg border border-stone-700/50 bg-[#1E1E1E]">
                          <SyntaxHighlighter
                            PreTag="div"
                            language={match[1]}
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: "0.75rem",
                              backgroundColor: "transparent",
                            }}
                            codeTagProps={{ className: "text-xs" }}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code
                          {...rest}
                          className={`${className || ""} rounded bg-stone-800 px-1.5 py-0.5 font-mono text-[13px] text-stone-200`}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {textContent}
                </ReactMarkdown>
              </div>
            ) : (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={extension && extension !== "txt" ? extension : "text"}
                PreTag="div"
                showLineNumbers
                customStyle={{
                  margin: 0,
                  padding: "1rem",
                  backgroundColor: "transparent",
                }}
                codeTagProps={{ className: "text-xs leading-relaxed" }}
              >
                {textContent}
              </SyntaxHighlighter>
            )}
            {truncated && (
              <div className="border-t border-stone-700/40 px-4 py-2 text-center text-xs text-stone-500">
                Preview truncated — file is larger than 512 KB.
              </div>
            )}
          </>
        )}

        {!loading && !error && kind === "pdf" && mediaUrl && (
          <div className="relative h-full min-h-[18rem]">
            {!iframeReady && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-stone-400">
                Rendering PDF…
              </div>
            )}
            <iframe
              title={doc.title}
              src={mediaUrl}
              className={`h-full min-h-[18rem] w-full border-0 ${iframeReady ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setIframeReady(true)}
            />
          </div>
        )}

        {!loading && !error && kind === "image" && mediaUrl && (
          <div className="flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl}
              alt={doc.title}
              className="max-h-[min(70vh,36rem)] max-w-full rounded-lg object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentPreviewPane({
  document: doc,
  onVersionHistory,
}: DocumentPreviewPaneProps) {
  if (!doc) {
    return (
      <div className="flex h-full min-h-[22rem] flex-col items-center justify-center rounded-xl border border-dashed border-stone-700/50 bg-stone-950/30 px-6 text-center">
        <p className="text-sm font-medium text-stone-300">Select a document</p>
        <p className="mt-1 text-xs text-stone-500">
          Preview appears here for PDF, Markdown, text, and images.
        </p>
      </div>
    );
  }

  return <PreviewBody key={doc.id} doc={doc} onVersionHistory={onVersionHistory} />;
}
