import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  NotFoundError,
  ServerError,
  ValidationError,
} from "@/lib/errors";
import { errorResponse, handleRouteError } from "@/lib/apiResponse";
import { requireUser } from "@/lib/routeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase);

    const body = await request.json() as { name?: string };
    const name = body.name?.trim();
    if (!name) return errorResponse(new ValidationError("Folder name is required"));

    const { data: folder, error } = await supabase
      .from("folders")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id,name,parent_id,created_at,updated_at")
      .single();

    if (error || !folder) {
      return errorResponse(new NotFoundError("Folder not found"));
    }

    return NextResponse.json({ folder });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase);

    // Move documents in this folder to null (root)
    await supabase
      .from("documents")
      .update({ folder_id: null })
      .eq("folder_id", id)
      .eq("created_by", user.id);

    // Move child folders to parent's parent (or root)
    const { data: folder } = await supabase
      .from("folders")
      .select("parent_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (folder) {
      await supabase
        .from("folders")
        .update({ parent_id: folder.parent_id ?? null })
        .eq("parent_id", id)
        .eq("user_id", user.id);
    }

    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete folder", error);
      return errorResponse(new ServerError("Failed to delete folder"));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred");
  }
}
