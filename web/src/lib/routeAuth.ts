import type { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { AppError, ErrorCode, ErrorSeverity } from "@/lib/errors";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Resolve the authenticated user for a session-backed API route.
 * Throws an {@link AppError} (UNAUTHORIZED) when no user is present, so callers
 * can rely on a single catch block + {@link handleRouteError} for the response.
 *
 * @param action short phrase completing "You must be signed in to ___"
 */
export async function requireUser(
  supabase: SupabaseServerClient,
  action = "perform this action"
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError({
      code: ErrorCode.UNAUTHORIZED,
      severity: ErrorSeverity.HIGH,
      userMessage: `You must be signed in to ${action}`,
    });
  }

  return user;
}
