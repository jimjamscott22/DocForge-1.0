import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "DocForgeVault";

// PDF export: for .pdf files returns signed URL; for other types returns 501
// (no PDF generation library available without additional installation)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("storage_path, title, created_by")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (doc.created_by !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ext = doc.storage_path.split(".").pop()?.toLowerCase() ?? "";

    if (ext === "pdf") {
      // Return signed URL for direct PDF download
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(doc.storage_path, 3600, { download: `${doc.title}.pdf` });

      if (signedUrlError || !signedUrlData?.signedUrl) {
        return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
      }

      // Track analytics (fire-and-forget)
      void supabase.from("document_analytics").insert({
        document_id: id,
        user_id: session.user.id,
        event_type: "export",
      });

      return NextResponse.json({ url: signedUrlData.signedUrl });
    }

    // For non-PDF files, PDF generation requires pdfkit or similar library
    return NextResponse.json(
      { error: "PDF export for this file type is not yet supported" },
      { status: 501 }
    );
  } catch (err) {
    console.error("Export PDF error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
