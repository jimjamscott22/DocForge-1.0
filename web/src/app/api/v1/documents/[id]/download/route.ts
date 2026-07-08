import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { BUCKET_NAME } from "@/lib/storage";
import { errorResponse, handleRouteError } from "@/lib/apiResponse";
import { NotFoundError, ServerError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await authenticateApiKey(request.headers.get("authorization"));

    const supabase = createSupabaseAdminClient();
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("storage_path, title")
      .eq("id", id)
      .eq("created_by", userId)
      .single();

    if (docError || !doc) {
      return errorResponse(new NotFoundError("Document not found"));
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(doc.storage_path, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return errorResponse(new ServerError("Could not generate download link"));
    }

    return NextResponse.json({ url: signedUrlData.signedUrl, title: doc.title });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred");
  }
}
