import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { createHash, randomBytes } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: keys, error } = await supabase
      .from("api_keys")
      .select("id,name,key_prefix,created_at,last_used_at,is_active")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
    }

    return NextResponse.json({ keys: keys ?? [] });
  } catch (err) {
    console.error("Keys GET error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { name?: string };
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: "Key name is required" }, { status: 400 });

    // Generate a secure random key
    const rawKey = `dfk_${randomBytes(32).toString("hex")}`;
    const keyPrefix = rawKey.slice(0, 12);
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const { data: key, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: session.user.id,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        is_active: true,
      })
      .select("id,name,key_prefix,created_at,last_used_at,is_active")
      .single();

    if (error) {
      console.error("Failed to create API key", error);
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
    }

    // Return the full key ONCE — never stored
    return NextResponse.json({ key, rawKey }, { status: 201 });
  } catch (err) {
    console.error("Keys POST error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
