import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { errorResponse, handleRouteError } from "@/lib/apiResponse";
import { NotFoundError } from "@/lib/errors";

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
    const { data: doc, error } = await supabase
      .from("documents")
      .select("id,title,storage_path,file_size_bytes,created_at,updated_at,folder_id")
      .eq("id", id)
      .eq("created_by", userId)
      .single();

    if (error || !doc) {
      return errorResponse(new NotFoundError("Document not found"));
    }

    return NextResponse.json({ document: doc });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred");
  }
}
