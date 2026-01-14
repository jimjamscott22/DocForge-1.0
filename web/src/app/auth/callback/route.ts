import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const error = requestUrl.searchParams.get("error");

  if (!code && !error) {
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  const supabase = createSupabaseServerClient();

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("Failed to exchange auth code", exchangeError);
    }
  }

  const redirectUrl = new URL(next, requestUrl.origin);

  if (error) {
    redirectUrl.searchParams.set("auth_error", error);
  }

  return NextResponse.redirect(redirectUrl);
}
