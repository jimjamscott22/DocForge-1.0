import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { handleRouteError } from "@/lib/apiResponse";
import { requireUser } from "@/lib/routeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase);

    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleRouteError(err, "An unexpected error occurred");
  }
}
