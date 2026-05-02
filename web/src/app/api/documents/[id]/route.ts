import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  AppError,
  ErrorCode,
  ErrorSeverity,
  NotFoundError,
  ServerError,
} from "@/lib/errors";
import { errorResponse } from "@/lib/apiResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "DocForgeVault";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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
      return errorResponse(new NotFoundError("Document not found"));
    }

    if (doc.created_by !== user.id) {
      return errorResponse(
        new AppError({
          code: ErrorCode.UNAUTHORIZED,
          severity: ErrorSeverity.HIGH,
          userMessage: "You do not have permission to delete this document",
        })
      );
    }

    // Delete document record from database first — DB is the source of truth.
    // If this fails, storage is untouched and we can return a clean error.
    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (dbError) {
      console.error("Failed to delete document record", dbError);
      return errorResponse(
        new ServerError("Could not delete document. Please try again.")
      );
    }

    // Delete file from storage after DB record is gone.
    // If this fails, the file is orphaned — log for cleanup but still return success.
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([doc.storage_path]);

    if (storageError) {
      console.error("CRITICAL: orphaned storage file after delete", doc.storage_path, storageError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return errorResponse(
      new ServerError("An unexpected error occurred while deleting the document")
    );
  }
}
