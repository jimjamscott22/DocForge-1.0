import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { errorResponse, handleRouteError } from "@/lib/apiResponse";
import { NotFoundError, ServerError, ValidationError } from "@/lib/errors";
import { assertOwned, requireUser } from "@/lib/routeAuth";

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
    const user = await requireUser(supabase);

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("storage_path, title, created_by")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return errorResponse(new NotFoundError("Document not found"));
    }
    assertOwned(doc, user.id, "export this document");

    const ext = doc.storage_path.split(".").pop()?.toLowerCase() ?? "";
    if (!TEXT_EXTENSIONS.includes(ext)) {
      return errorResponse(new ValidationError("Markdown export is only available for text files"));
    }

    // Download the file content from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      return errorResponse(new ServerError("Could not download file"));
    }

    const content = await fileData.text();

    // Track analytics (fire-and-forget)
    void supabase.from("document_analytics").insert({
      document_id: id,
      user_id: user.id,
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
    return handleRouteError(err, "An unexpected error occurred");
  }
}
