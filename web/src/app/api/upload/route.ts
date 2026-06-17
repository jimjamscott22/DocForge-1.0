import crypto from "crypto";
import path from "path";
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
import { extractText } from "@/lib/textExtractor";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  resolveFileMimeType,
} from "@/lib/uploadMime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function isMissingVersioningMigrationError(error: SupabaseErrorLike) {
  const message = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();

  return (
    error.code === "PGRST202" ||
    message.includes("upsert_document_with_version") ||
    (message.includes("document_versions") && message.includes("does not exist"))
  );
}

function createMetadataSaveError(error: SupabaseErrorLike) {
  const isMissingMigration = isMissingVersioningMigrationError(error);

  return new DatabaseError(
    isMissingMigration
      ? "Upload storage succeeded, but the database is missing the document versioning migration."
      : "Could not save document metadata. Please try again.",
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          migration: isMissingMigration ? "Run supabase/versioning_migration.sql" : undefined,
        }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase, "upload documents");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;

    if (!file) {
      return errorResponse(
        new ValidationError("Please select a file to upload")
      );
    }

    if (!title || title.trim().length === 0) {
      return errorResponse(
        new ValidationError("Please provide a title for your document")
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse(
        new AppError({
          code: ErrorCode.FILE_TOO_LARGE,
          severity: ErrorSeverity.MEDIUM,
          userMessage: "File exceeds the 50MB size limit",
          details: { maxSize: MAX_FILE_SIZE_BYTES, actualSize: file.size },
        })
      );
    }

    const resolvedMimeType = resolveFileMimeType(file);

    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(resolvedMimeType)) {
      return errorResponse(
        new AppError({
          code: ErrorCode.INVALID_FILE_TYPE,
          severity: ErrorSeverity.MEDIUM,
          userMessage: "File type not supported. Please upload PDF, TXT, MD, DOC, DOCX, PNG, JPG, or GIF files",
          details: {
            allowedTypes: ALLOWED_UPLOAD_MIME_TYPES,
            providedType: file.type,
            resolvedType: resolvedMimeType,
            fileName: file.name,
          },
        })
      );
    }

    // Build a unique path scoped to the user: <user_id>/<timestamp>-<uuid>-<filename>
    const safeName = path.basename(file.name).replace(/\s+/g, "-");
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const storagePath = `${user.id}/${uniqueName}`;

    // Upload file to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: resolvedMimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload to Supabase Storage", uploadError);
      return errorResponse(
        new AppError({
          code: ErrorCode.STORAGE_ERROR,
          severity: ErrorSeverity.HIGH,
          userMessage: "Could not upload file to storage. Please try again.",
        })
      );
    }

    // Extract searchable text content for supported file types
    const extraction = await extractText(buffer, resolvedMimeType);

    // Atomically insert document row + version record in a single DB transaction via RPC
    const { data, error } = await supabase.rpc("upsert_document_with_version", {
      p_document_id:     null,
      p_title:           title.trim(),
      p_storage_path:    uploadData.path,
      p_file_size_bytes: file.size,
      p_content_type:    resolvedMimeType,
      p_created_by:      user.id,
      p_content_text:    extraction?.text ?? null,
    });

    if (error) {
      // Rollback: remove the uploaded file since the DB record was never created
      const { error: rollbackError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([uploadData.path]);
      if (rollbackError) {
        console.error("CRITICAL: storage orphan created at path", uploadData.path, rollbackError);
      }
      console.error("Failed to insert document + version record", error);
      return errorResponse(createMetadataSaveError(error));
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred during upload");
  }
}
