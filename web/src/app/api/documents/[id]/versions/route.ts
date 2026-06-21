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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase);

    // Verify document ownership
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, created_by")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return errorResponse(new NotFoundError("Document not found"));
    }

    assertOwned(doc, user.id, "view this document");

    const { data: versions, error } = await supabase
      .from("document_versions")
      .select("id, version_number, storage_path, file_size_bytes, content_type, created_at")
      .eq("document_id", id)
      .order("version_number", { ascending: false });

    if (error) {
      console.error("Failed to fetch document versions", error);
      return errorResponse(new ServerError("Could not fetch version history"));
    }

    return NextResponse.json({ versions: versions ?? [] });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred");
  }
}
