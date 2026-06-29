import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  NotFoundError,
  ServerError,
  ValidationError,
} from "@/lib/errors";
import { errorResponse, handleRouteError } from "@/lib/apiResponse";
import { assertOwned, requireUser } from "@/lib/routeAuth";
import { BUCKET_NAME } from "@/lib/storage";
import { getFileExtension } from "@/lib/fileType";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const TEXT_EXTENSIONS = ["txt", "md"];
const MAX_PREVIEW_BYTES = 512 * 1024; // 512 KB preview limit

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase);

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("storage_path, title, created_by, file_size_bytes")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return errorResponse(new NotFoundError("Document not found"));
    }
    assertOwned(doc, user.id, "preview this document");

    // Verify the file is a text type
    const ext = getFileExtension(doc.storage_path);
    if (!TEXT_EXTENSIONS.includes(ext)) {
      return errorResponse(
        new ValidationError("Preview is only available for text and markdown files")
      );
    }

    // Download file content from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      console.error("Failed to download file for preview", downloadError);
      return errorResponse(new ServerError("Could not load file content"));
    }

    const bytes = await fileData.arrayBuffer();
    const truncated = bytes.byteLength > MAX_PREVIEW_BYTES;
    const slice = truncated ? bytes.slice(0, MAX_PREVIEW_BYTES) : bytes;
    const content = new TextDecoder("utf-8").decode(slice);

    // Track analytics (fire-and-forget)
    void supabase.from("document_analytics").insert({
      document_id: id,
      user_id: user.id,
      event_type: "preview",
    });

    return NextResponse.json({
      content,
      title: doc.title,
      extension: ext,
      truncated,
      totalBytes: doc.file_size_bytes,
    });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred");
  }
}
