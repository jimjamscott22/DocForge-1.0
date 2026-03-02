import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export type ApiKeyAuthResult =
  | { success: true; userId: string }
  | { success: false; error: string; status: number };

export async function authenticateApiKey(
  authHeader: string | null
): Promise<ApiKeyAuthResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { success: false, error: "Missing or invalid Authorization header", status: 401 };
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    return { success: false, error: "Missing API key", status: 401 };
  }

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const supabase = await createSupabaseServerClient();
  const { data: key, error } = await supabase
    .from("api_keys")
    .select("id,user_id,is_active")
    .eq("key_hash", keyHash)
    .single();

  if (error || !key) {
    return { success: false, error: "Invalid API key", status: 401 };
  }

  if (!key.is_active) {
    return { success: false, error: "API key has been revoked", status: 401 };
  }

  // Update last_used_at asynchronously
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  return { success: true, userId: key.user_id };
}
