import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  NotFoundError,
  ServerError,
} from "@/lib/errors";
import { errorResponse, handleRouteError } from "@/lib/apiResponse";
import { assertOwned, requireUser } from "@/lib/routeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "DocForgeVault";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("event") ?? "download";
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase);

    // Fetch document metadata
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("storage_path, title, created_by")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return errorResponse(new NotFoundError("Document not found"));
    }
    assertOwned(doc, user.id, "download this document");

    // Generate a signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(doc.storage_path, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Failed to create signed URL", signedUrlError);
      return errorResponse(new ServerError("Could not generate download link"));
    }

    if (["download", "view", "preview"].includes(eventType)) {
      void supabase.from("document_analytics").insert({
        document_id: id,
        user_id: user.id,
        event_type: eventType,
      });
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      title: doc.title,
    });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred");
  }
}
