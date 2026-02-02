"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useErrorHandler } from "./ErrorProvider";
import { useToast } from "./ToastProvider";
import { Spinner } from "./Spinner";

type Props = {
  isAuthenticated: boolean;
};

type Provider = "google" | "github";

export default function AuthButtons({ isAuthenticated }: Props) {
  const router = useRouter();
  const { handleError } = useErrorHandler();
  const { showError } = useToast();
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
        showError(signInError.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
      handleError(err, "AuthButtons.signIn");
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
        const errorMessage = "Unable to sign out. Please try again.";
        setError(errorMessage);
        showError(errorMessage);
        return;
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign out failed";
      setError(message);
      handleError(err, "AuthButtons.signOut");
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
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-stone-700/50 bg-stone-800 px-3 py-2 text-sm font-medium text-stone-300 transition hover:border-stone-600 hover:text-stone-100 disabled:opacity-70"
        >
          {loading === "signout" ? (
            <>
              <Spinner size="sm" />
              Signing out...
            </>
          ) : (
            "Sign out"
          )}
        </button>
        {error && (
          <p className="flex items-center gap-1 text-xs text-red-400">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
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
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-forge-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-forge-500 disabled:opacity-70"
        >
          {loading === "google" ? (
            <Spinner size="sm" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {loading === "google" ? "Connecting..." : "Google"}
        </button>
        <button
          type="button"
          onClick={() => signIn("github")}
          disabled={loading !== null}
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-stone-700/50 bg-stone-800 px-3.5 py-2 text-sm font-semibold text-stone-200 transition hover:border-stone-600 hover:text-white disabled:opacity-70"
        >
          {loading === "github" ? (
            <Spinner size="sm" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          )}
          {loading === "github" ? "Connecting..." : "GitHub"}
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
