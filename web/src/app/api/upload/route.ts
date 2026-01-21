import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  AppError,
  ErrorCode,
  ErrorSeverity,
  ValidationError,
  ServerError,
} from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/gif",
];

interface ErrorResponse {
  error: string;
  code?: ErrorCode;
  details?: Record<string, unknown>;
}

function errorResponse(error: AppError): NextResponse {
  return NextResponse.json(
    {
      error: error.userMessage,
      code: error.code,
      details: error.details,
    },
    {
      status:
        error.code === ErrorCode.AUTH_REQUIRED ||
        error.code === ErrorCode.UNAUTHORIZED
          ? 401
          : error.code === ErrorCode.INVALID_INPUT ||
            error.code === ErrorCode.FILE_TOO_LARGE ||
            error.code === ErrorCode.INVALID_FILE_TYPE
          ? 400
          : error.code === ErrorCode.SERVER_ERROR ||
            error.code === ErrorCode.DATABASE_ERROR ||
            error.code === ErrorCode.STORAGE_ERROR
          ? 500
          : 500,
    }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return errorResponse(
        new AppError({
          code: ErrorCode.UNAUTHORIZED,
          severity: ErrorSeverity.HIGH,
          userMessage: "You must be signed in to upload documents",
        })
      );
    }

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
          userMessage: "File exceeds the 10MB size limit",
          details: { maxSize: MAX_FILE_SIZE_BYTES, actualSize: file.size },
        })
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(
        new AppError({
          code: ErrorCode.INVALID_FILE_TYPE,
          severity: ErrorSeverity.MEDIUM,
          userMessage: "File type not supported. Please upload PDF, TXT, MD, DOC, DOCX, PNG, JPG, or GIF files",
          details: {
            allowedTypes: ALLOWED_TYPES,
            providedType: file.type,
          },
        })
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const safeName = path.basename(file.name).replace(/\s+/g, "-");
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const storagePath = path.join("uploads", uniqueName);
    const fullPath = path.join(uploadDir, uniqueName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fullPath, buffer);

    const { data, error } = await supabase
      .from("documents")
      .insert({
        title: title.trim(),
        storage_path: storagePath.replace(/\\/g, "/"),
        file_size_bytes: file.size,
        created_by: session.user.id,
      })
      .select("id,title,storage_path,file_size_bytes,created_at")
      .single();

    if (error) {
      console.error("Failed to insert document metadata", error);
      return errorResponse(
        new ServerError("Could not save document metadata. Please try again.")
      );
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    console.error("Upload error:", err);
    return errorResponse(
      new ServerError("An unexpected error occurred during upload")
    );
  }
}
