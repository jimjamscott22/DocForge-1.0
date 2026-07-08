import { createHash } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { AuthError } from "@/lib/errors";

const LAST_USED_THROTTLE_MS = 60_000;

/**
 * Authenticate a v1 API request via `Authorization: Bearer <key>`.
 * Throws an {@link AuthError} on failure so callers can rely on a single
 * catch block + `handleRouteError`, mirroring the session-route `requireUser` pattern.
 */
export async function authenticateApiKey(authHeader: string | null): Promise<string> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid Authorization header");
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    throw new AuthError("Missing API key");
  }

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const supabase = createSupabaseAdminClient();
  const { data: key, error } = await supabase
    .from("api_keys")
    .select("id,user_id,is_active,last_used_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !key) {
    throw new AuthError("Invalid API key");
  }

  if (!key.is_active) {
    throw new AuthError("API key has been revoked");
  }

  // Throttle last_used_at writes to avoid an UPDATE on every request
  const lastUsedMs = key.last_used_at ? new Date(key.last_used_at).getTime() : 0;
  if (Date.now() - lastUsedMs > LAST_USED_THROTTLE_MS) {
    void supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", key.id);
  }

  return key.user_id;
}
