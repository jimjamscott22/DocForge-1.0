import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  ServerError,
  ValidationError,
} from "@/lib/errors";
import { errorResponse, handleRouteError } from "@/lib/apiResponse";
import { requireUser } from "@/lib/routeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase);

    const { data: folders, error } = await supabase
      .from("folders")
      .select("id,name,parent_id,created_at,updated_at")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Failed to fetch folders", error);
      return errorResponse(new ServerError("Failed to fetch folders"));
    }

    return NextResponse.json({ folders: folders ?? [] });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred");
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase);

    const body = await request.json() as { name?: string; parent_id?: string | null };
    const name = body.name?.trim();
    if (!name) return errorResponse(new ValidationError("Folder name is required"));

    const insert: { user_id: string; name: string; parent_id?: string | null } = {
      user_id: user.id,
      name,
    };
    if (body.parent_id !== undefined) insert.parent_id = body.parent_id;

    const { data: folder, error } = await supabase
      .from("folders")
      .insert(insert)
      .select("id,name,parent_id,created_at,updated_at")
      .single();

    if (error) {
      console.error("Failed to create folder", error);
      return errorResponse(new ServerError("Failed to create folder"));
    }

    return NextResponse.json({ folder }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred");
  }
}
