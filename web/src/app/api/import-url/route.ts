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
import { fetchPublicHtml, isBlockedHostname } from "@/lib/urlSafety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Maximum HTML response body size (5 MB) to prevent memory exhaustion. */
const MAX_HTML_BYTES = 5 * 1024 * 1024;

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

    // Bound the entire fetch, including redirects and the response body.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let html: string;
    try {
      const res = await fetchPublicHtml(parsed, controller.signal);
      const status = res.statusCode ?? 0;
      if (status < 200 || status >= 300) {
        res.destroy();
        return errorResponse(
          new AppError({
            code: ErrorCode.NETWORK_ERROR,
            severity: ErrorSeverity.MEDIUM,
            userMessage: `Could not fetch the URL (HTTP ${status})`,
          })
        );
      }

      const contentType = res.headers["content-type"] ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        res.destroy();
        return errorResponse(
          new ValidationError(
            "The URL does not point to an HTML page. Only HTML documentation pages can be imported."
          )
        );
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;
      for await (const chunk of res) {
        const bounded = (chunk as Buffer).subarray(0, MAX_HTML_BYTES - totalBytes);
        chunks.push(bounded);
        totalBytes += bounded.length;
        if (totalBytes === MAX_HTML_BYTES) break;
      }
      html = Buffer.concat(chunks, totalBytes).toString("utf8");
    } catch (err) {
      if (controller.signal.aborted) {
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
    } finally {
      clearTimeout(timeout);
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
