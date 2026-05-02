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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
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

    const { data, error } = await supabase.rpc("restore_document_version", {
      p_document_id: id,
      p_version_id:  versionId,
      p_restored_by: user.id,
    });

    if (error) {
      if (error.message?.includes("version_not_found")) {
        return errorResponse(new NotFoundError("Version not found"));
      }
      console.error("Failed to restore document version", error);
      return errorResponse(new ServerError("Could not restore version. Please try again."));
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    console.error("Version restore error:", err);
    return errorResponse(new ServerError("An unexpected error occurred"));
  }
}
