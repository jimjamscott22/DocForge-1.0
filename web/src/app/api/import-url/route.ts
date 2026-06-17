import crypto from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  AppError,
  ErrorCode,
  ErrorSeverity,
  ValidationError,
  DatabaseError,
} from "@/lib/errors";
import { errorResponse, handleRouteError } from "@/lib/apiResponse";
import { requireUser } from "@/lib/routeAuth";
import { BUCKET_NAME } from "@/lib/storage";
import { extractTextFromHtml } from "@/lib/textExtractor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Maximum HTML response body size (5 MB) to prevent memory exhaustion. */
const MAX_HTML_BYTES = 5 * 1024 * 1024;

/**
 * Block requests to private / loopback addresses to prevent SSRF.
 * Note: this check operates on the supplied hostname string only.
 * DNS-rebinding attacks (a public domain resolving to a private IP) are not
 * mitigated here; users with sensitive internal infrastructure should deploy
 * this service in an isolated network or add a DNS-based egress firewall.
 */
function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "::1" ||
    lower.endsWith(".local") ||
    // RFC-1918 ranges (simple prefix check – good enough for a server-side guard)
    lower.startsWith("10.") ||
    lower.startsWith("192.168.") ||
    (lower.startsWith("172.") && /^172\.(1[6-9]|2\d|3[01])\./.test(lower)) ||
    lower.startsWith("169.254.") // link-local
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase, "import documents");

    const body = await request.json().catch(() => null);
    const rawUrl: unknown = body?.url;
    const rawTitle: unknown = body?.title;

    if (typeof rawUrl !== "string" || !rawUrl.trim()) {
      return errorResponse(new ValidationError("Please provide a URL to import"));
    }

    // Validate the URL and extract the hostname for SSRF checks
    let parsed: URL;
    try {
      parsed = new URL(rawUrl.trim());
    } catch {
      return errorResponse(new ValidationError("The URL provided is not valid"));
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return errorResponse(
        new ValidationError("Only http and https URLs are supported")
      );
    }

    if (isBlockedHostname(parsed.hostname)) {
      return errorResponse(
        new ValidationError("Importing from private or local addresses is not allowed")
      );
    }

    const title =
      typeof rawTitle === "string" && rawTitle.trim().length > 0
        ? rawTitle.trim()
        : parsed.hostname + parsed.pathname;

    // Fetch the remote page with a timeout
    let html: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "DocForge/1.0 (document importer)",
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return errorResponse(
          new AppError({
            code: ErrorCode.NETWORK_ERROR,
            severity: ErrorSeverity.MEDIUM,
            userMessage: `Could not fetch the URL (HTTP ${res.status})`,
          })
        );
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        return errorResponse(
          new ValidationError(
            "The URL does not point to an HTML page. Only HTML documentation pages can be imported."
          )
        );
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      let hitSizeLimit = false;
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > MAX_HTML_BYTES) {
            hitSizeLimit = true;
            break;
          }
          chunks.push(value);
        }
      }
      // Only cancel the reader when we stopped early due to the size cap;
      // if the stream finished naturally (done=true) it is already closed.
      if (hitSizeLimit) {
        reader.cancel();
      }

      const combined = new Uint8Array(totalBytes > MAX_HTML_BYTES ? MAX_HTML_BYTES : totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        const copied = Math.min(chunk.length, combined.length - offset);
        combined.set(chunk.subarray(0, copied), offset);
        offset += copied;
        if (offset >= combined.length) break;
      }
      html = new TextDecoder("utf-8").decode(combined);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return errorResponse(
          new AppError({
            code: ErrorCode.NETWORK_ERROR,
            severity: ErrorSeverity.MEDIUM,
            userMessage: "The request timed out. The URL may be unreachable.",
          })
        );
      }
      console.error("Failed to fetch URL", err);
      return errorResponse(
        new AppError({
          code: ErrorCode.NETWORK_ERROR,
          severity: ErrorSeverity.MEDIUM,
          userMessage: "Could not reach the URL. Check it is publicly accessible.",
        })
      );
    }

    // Extract readable text from the HTML
    const extractedText = extractTextFromHtml(html);
    if (!extractedText || extractedText.trim().length < 20) {
      return errorResponse(
        new ValidationError(
          "Could not extract any meaningful text from the page. The URL may require authentication or contain no readable content."
        )
      );
    }

    // Build a plain-text file to store.
    // Remove all non-ASCII characters from the title for the file header
    // (keeps only printable ASCII: U+0020–U+007E).
    const safeTitle = title.replace(/[^\x20-\x7E]/g, " ").trim() || parsed.hostname;
    const fileContent =
      `# ${safeTitle}\n\nSource: ${parsed.toString()}\n\n---\n\n${extractedText}`;
    const fileBuffer = Buffer.from(fileContent, "utf-8");
    const fileSizeBytes = fileBuffer.length;

    // Store as .txt in Supabase Storage
    const safeName = (
      title
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)
        .toLowerCase() || "imported-page"
    );
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${safeName}.txt`;
    const storagePath = `${user.id}/${uniqueName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: "text/plain",
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload imported content to Supabase Storage", uploadError);
      return errorResponse(
        new AppError({
          code: ErrorCode.STORAGE_ERROR,
          severity: ErrorSeverity.HIGH,
          userMessage: "Could not save the imported document. Please try again.",
        })
      );
    }

    // Truncate content text for the DB if needed
    const MAX_DB_TEXT = 1_000_000;
    const contentText =
      extractedText.length > MAX_DB_TEXT
        ? extractedText.slice(0, MAX_DB_TEXT)
        : extractedText;

    const { data, error } = await supabase.rpc("upsert_document_with_version", {
      p_document_id:     null,
      p_title:           title,
      p_storage_path:    uploadData.path,
      p_file_size_bytes: fileSizeBytes,
      p_content_type:    "text/plain",
      p_created_by:      user.id,
      p_content_text:    contentText,
    });

    if (error) {
      // Rollback the storage upload
      const { error: rollbackError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([uploadData.path]);
      if (rollbackError) {
        console.error("CRITICAL: storage orphan created at path", uploadData.path, rollbackError);
      }
      console.error("Failed to insert imported document record", error);
      return errorResponse(
        new DatabaseError("Could not save document metadata. Please try again.")
      );
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred while importing the document");
  }
}
