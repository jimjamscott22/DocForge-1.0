import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  AppError,
  ErrorCode,
  ErrorSeverity,
  ServerError,
} from "@/lib/errors";
import { errorResponse } from "@/lib/apiResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "DocForgeVault";
const MAX_IDS = 50;

export async function POST(request: Request) {
  try {
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
    const ownedDocs = (docs || []).filter((doc) => doc.created_by === user.id);

    if (ownedDocs.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const storagePaths = ownedDocs.map((doc) => doc.storage_path);
    const ownedIds = ownedDocs.map((doc) => doc.id);

    // Delete document records from database first — DB is the source of truth.
    // If this fails, storage is untouched and we can return a clean error.
    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .in("id", ownedIds);

    if (dbError) {
      console.error("Failed to delete document records", dbError);
      return errorResponse(
        new ServerError("Could not delete documents. Please try again.")
      );
    }

    // Delete files from storage after DB records are gone.
    // If this fails, the files are orphaned (no DB record) — a quota issue, not a
    // user-visible bug. Log prominently for cleanup; still return success.
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(storagePaths);

    if (storageError) {
      console.error("CRITICAL: orphaned storage files after bulk delete", storagePaths, storageError);
    }

    return NextResponse.json({ success: true, deleted: ownedIds.length });
  } catch (err) {
    console.error("Bulk delete error:", err);
    return errorResponse(
      new ServerError("An unexpected error occurred while deleting documents")
    );
  }
}
