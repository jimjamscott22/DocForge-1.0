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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { folder_id?: string | null };
    const folder_id = body.folder_id ?? null;

    // Verify document ownership
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, created_by")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (doc.created_by !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    const { error } = await supabase
      .from("documents")
      .update({ folder_id })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to move document" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Move document error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
