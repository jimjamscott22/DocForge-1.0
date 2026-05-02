import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  AppError,
  ErrorCode,
  ErrorSeverity,
  AuthError,
  NotFoundError,
  ServerError,
} from "@/lib/errors";
import { errorResponse } from "@/lib/apiResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return errorResponse(
        new AppError({
          code: ErrorCode.UNAUTHORIZED,
          severity: ErrorSeverity.HIGH,
          userMessage: "You must be signed in to move documents",
        })
      );
    }

    const body = await request.json() as { folder_id?: string | null };
    const folder_id = body.folder_id ?? null;

    // Verify document ownership
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, created_by")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return errorResponse(new NotFoundError("Document not found"));
    }
    if (doc.created_by !== user.id) {
      return errorResponse(new AuthError("You do not have permission to move this document"));
    }

    // If folder_id is specified, verify it belongs to user
    if (folder_id) {
      const { data: folder } = await supabase
        .from("folders")
        .select("id")
        .eq("id", folder_id)
        .eq("user_id", user.id)
        .single();
      if (!folder) {
        return errorResponse(new NotFoundError("Folder not found"));
      }
    }

    const { error } = await supabase
      .from("documents")
      .update({ folder_id })
      .eq("id", id);

    if (error) {
      return errorResponse(new ServerError("Failed to move document"));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Move document error:", err);
    return errorResponse(new ServerError("An unexpected error occurred"));
  }
}
