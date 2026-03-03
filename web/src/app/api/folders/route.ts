import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: folders, error } = await supabase
      .from("folders")
      .select("id,name,parent_id,created_at,updated_at")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Failed to fetch folders", error);
      return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
    }

    return NextResponse.json({ folders: folders ?? [] });
  } catch (err) {
    console.error("Folders GET error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { name?: string; parent_id?: string | null };
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });

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
      return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
    }

    return NextResponse.json({ folder }, { status: 201 });
  } catch (err) {
    console.error("Folders POST error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
