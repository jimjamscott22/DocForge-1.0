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
const MAX_IDS = 50;

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
          userMessage: "You must be signed in to delete documents",
        })
      );
    }

    const body = await request.json();
    const ids: unknown = body.ids;

    if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string")) {
      return errorResponse(
        new AppError({
          code: ErrorCode.INVALID_INPUT,
          severity: ErrorSeverity.MEDIUM,
          userMessage: "Please provide a valid list of document IDs",
        })
      );
    }

    if (ids.length > MAX_IDS) {
      return errorResponse(
        new AppError({
          code: ErrorCode.INVALID_INPUT,
          severity: ErrorSeverity.MEDIUM,
          userMessage: `Cannot delete more than ${MAX_IDS} documents at once`,
        })
      );
    }

    // Fetch all documents to verify ownership and get storage paths
    const { data: docs, error: fetchError } = await supabase
      .from("documents")
      .select("id, storage_path, created_by")
      .in("id", ids);

    if (fetchError) {
      console.error("Failed to fetch documents for bulk delete", fetchError);
      return errorResponse(new ServerError("Could not verify documents. Please try again."));
    }

    // Filter to only documents owned by this user
    const ownedDocs = (docs || []).filter((doc) => doc.created_by === session.user.id);

    if (ownedDocs.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const storagePaths = ownedDocs.map((doc) => doc.storage_path);
    const ownedIds = ownedDocs.map((doc) => doc.id);

    // Delete files from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(storagePaths);

    if (storageError) {
      console.error("Failed to delete files from storage", storageError);
      return errorResponse(
        new ServerError("Could not delete files from storage. Please try again.")
      );
    }

    // Delete document records from database
    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .in("id", ownedIds);

    if (dbError) {
      console.error("Failed to delete document records", dbError);
      return errorResponse(
        new ServerError(
          "Files were removed but some records could not be deleted. Please try again."
        )
      );
    }

    return NextResponse.json({ success: true, deleted: ownedIds.length });
  } catch (err) {
    console.error("Bulk delete error:", err);
    return errorResponse(
      new ServerError("An unexpected error occurred while deleting documents")
    );
  }
}
