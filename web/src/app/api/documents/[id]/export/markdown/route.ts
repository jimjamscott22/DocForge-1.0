import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "DocForgeVault";
const TEXT_EXTENSIONS = ["txt", "md"];

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
    if (!TEXT_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: "Markdown export is only available for text files" }, { status: 400 });
    }

    // Download the file content from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: "Could not download file" }, { status: 500 });
    }

    const content = await fileData.text();

    // Track analytics (fire-and-forget)
    void supabase.from("document_analytics").insert({
      document_id: id,
      user_id: session.user.id,
      event_type: "export",
    });

    const filename = doc.title.endsWith(".md") ? doc.title : `${doc.title}.md`;
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Export markdown error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
