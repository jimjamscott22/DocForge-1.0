import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { errorResponse, handleRouteError } from "@/lib/apiResponse";
import { NotFoundError, ServerError } from "@/lib/errors";
import { assertOwned, requireUser } from "@/lib/routeAuth";
import { BUCKET_NAME } from "@/lib/storage";
import { getFileExtension } from "@/lib/fileType";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PDF export: for .pdf files returns signed URL; for other types returns 501
// (no PDF generation library available without additional installation)
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

    const ext = getFileExtension(doc.storage_path);

    if (ext === "pdf") {
      // Return signed URL for direct PDF download
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(doc.storage_path, 3600, { download: `${doc.title}.pdf` });

      if (signedUrlError || !signedUrlData?.signedUrl) {
        return errorResponse(new ServerError("Could not generate download link"));
      }

      // Track analytics (fire-and-forget)
      void supabase.from("document_analytics").insert({
        document_id: id,
        user_id: user.id,
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
    return handleRouteError(err, "An unexpected error occurred");
  }
}
