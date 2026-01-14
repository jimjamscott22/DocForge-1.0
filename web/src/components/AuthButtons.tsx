"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

type Props = {
  isAuthenticated: boolean;
};

type Provider = "google" | "github";

export default function AuthButtons({ isAuthenticated }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<Provider | "signout" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (provider: Provider) => {
    try {
      setError(null);
      setLoading(provider);
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        setError(signInError.message);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      setLoading("signout");
      const response = await fetch("/auth/signout", { method: "POST" });
      if (!response.ok) {
        setError("Unable to sign out. Try again.");
        return;
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-end gap-2 text-right">
        <button
          type="button"
          onClick={signOut}
          disabled={loading === "signout"}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-70"
        >
          {loading === "signout" ? "Signing out..." : "Sign out"}
        </button>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => signIn("google")}
          disabled={loading !== null}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-70"
        >
          {loading === "google" ? "Redirecting..." : "Sign in with Google"}
        </button>
        <button
          type="button"
          onClick={() => signIn("github")}
          disabled={loading !== null}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-70"
        >
          {loading === "github" ? "Redirecting..." : "Sign in with GitHub"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
