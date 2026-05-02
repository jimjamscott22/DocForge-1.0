import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  AppError,
  ErrorCode,
  ErrorSeverity,
  NotFoundError,
  ServerError,
} from "@/lib/errors";
import { errorResponse } from "@/lib/apiResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse(
        new AppError({
          code: ErrorCode.UNAUTHORIZED,
          severity: ErrorSeverity.HIGH,
          userMessage: "Unauthorized",
        })
      );
    }

    // Verify document ownership
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, created_by")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return errorResponse(new NotFoundError("Document not found"));
    }

    if (doc.created_by !== user.id) {
      return errorResponse(new NotFoundError("Document not found"));
    }

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
    console.error("Versions GET error:", err);
    return errorResponse(new ServerError("An unexpected error occurred"));
  }
}
