import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { name?: string };
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });

    const { data: folder, error } = await supabase
      .from("folders")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select("id,name,parent_id,created_at,updated_at")
      .single();

    if (error || !folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (err) {
    console.error("Folder PATCH error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Move documents in this folder to null (root)
    await supabase
      .from("documents")
      .update({ folder_id: null })
      .eq("folder_id", id)
      .eq("created_by", session.user.id);

    // Move child folders to parent's parent (or root)
    const { data: folder } = await supabase
      .from("folders")
      .select("parent_id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (folder) {
      await supabase
        .from("folders")
        .update({ parent_id: folder.parent_id ?? null })
        .eq("parent_id", id)
        .eq("user_id", session.user.id);
    }

    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Failed to delete folder", error);
      return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Folder DELETE error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
