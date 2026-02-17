import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "DocForgeVault";
const TEXT_EXTENSIONS = ["txt", "md"];
const MAX_PREVIEW_BYTES = 512 * 1024; // 512 KB preview limit

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("storage_path, title, created_by, file_size_bytes")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify the file is a text type
    const ext = doc.storage_path.split(".").pop()?.toLowerCase() ?? "";
    if (!TEXT_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Preview is only available for text and markdown files" },
        { status: 400 }
      );
    }

    // Download file content from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      console.error("Failed to download file for preview", downloadError);
      return NextResponse.json(
        { error: "Could not load file content" },
        { status: 500 }
      );
    }

    const bytes = await fileData.arrayBuffer();
    const truncated = bytes.byteLength > MAX_PREVIEW_BYTES;
    const slice = truncated ? bytes.slice(0, MAX_PREVIEW_BYTES) : bytes;
    const content = new TextDecoder("utf-8").decode(slice);

    return NextResponse.json({
      content,
      title: doc.title,
      extension: ext,
      truncated,
      totalBytes: doc.file_size_bytes,
    });
  } catch (err) {
    console.error("Content preview error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
