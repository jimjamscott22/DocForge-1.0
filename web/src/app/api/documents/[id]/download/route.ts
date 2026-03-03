import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "DocForgeVault";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch document metadata
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("storage_path, title, created_by")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Generate a signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(doc.storage_path, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Failed to create signed URL", signedUrlError);
      return NextResponse.json(
        { error: "Could not generate download link" },
        { status: 500 }
      );
    }

    // Track analytics (fire-and-forget)
    void supabase.from("document_analytics").insert({
      document_id: id,
      user_id: user.id,
      event_type: "download",
    });

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      title: doc.title,
    });
  } catch (err) {
    console.error("Download error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
