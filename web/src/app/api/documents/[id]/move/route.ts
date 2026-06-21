import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  NotFoundError,
  ServerError,
} from "@/lib/errors";
import { errorResponse, handleRouteError } from "@/lib/apiResponse";
import { assertOwned, requireUser } from "@/lib/routeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase, "move documents");

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
    assertOwned(doc, user.id, "move this document");

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
    return handleRouteError(err, "An unexpected error occurred");
  }
}
