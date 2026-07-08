import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { errorResponse, handleRouteError } from "@/lib/apiResponse";
import { ServerError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateApiKey(request.headers.get("authorization"));

    const supabase = createSupabaseAdminClient();
    const { data: documents, error } = await supabase
      .from("documents")
      .select("id,title,storage_path,file_size_bytes,created_at,updated_at,folder_id")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch v1 documents", error);
      return errorResponse(new ServerError("Failed to fetch documents"));
    }

    return NextResponse.json({ documents: documents ?? [] });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred");
  }
}
