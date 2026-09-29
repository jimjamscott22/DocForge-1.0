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
    await requireUser(supabase, "delete folders");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return errorResponse(new ValidationError("Invalid folder ID"));
    }

    const { error } = await supabase.rpc("delete_folder", { p_folder_id: id });

    if (error) {
      if (error.code === "P0002") return errorResponse(new NotFoundError("Folder not found"));
      console.error("Failed to delete folder", error);
      return errorResponse(new ServerError("Could not delete folder. No changes were made. Please try again."));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred");
  }
}
