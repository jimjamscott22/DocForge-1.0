import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  AppError,
  ErrorCode,
  ErrorSeverity,
  ServerError,
} from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "DocForgeVault";

function errorResponse(error: AppError): NextResponse {
  const status =
    error.code === ErrorCode.AUTH_REQUIRED ||
    error.code === ErrorCode.UNAUTHORIZED
      ? 401
      : error.code === ErrorCode.INVALID_INPUT
        ? 400
        : 500;

  return NextResponse.json(
    { error: error.userMessage, code: error.code },
    { status }
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return errorResponse(
        new AppError({
          code: ErrorCode.UNAUTHORIZED,
          severity: ErrorSeverity.HIGH,
          userMessage: "You must be signed in to delete documents",
        })
      );
    }

    // Fetch document to verify ownership and get storage path
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("storage_path, created_by")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (doc.created_by !== session.user.id) {
      return errorResponse(
        new AppError({
          code: ErrorCode.UNAUTHORIZED,
          severity: ErrorSeverity.HIGH,
          userMessage: "You do not have permission to delete this document",
        })
      );
    }

    // Delete file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([doc.storage_path]);

    if (storageError) {
      console.error("Failed to delete file from storage", storageError);
      return errorResponse(
        new ServerError("Could not delete file from storage. Please try again.")
      );
    }

    // Delete document record from database
    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (dbError) {
      console.error("Failed to delete document record", dbError);
      return errorResponse(
        new ServerError(
          "File was removed but the record could not be deleted. Please try again."
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return errorResponse(
      new ServerError("An unexpected error occurred while deleting the document")
    );
  }
}
