"use client";

import { useEffect } from "react";
import { useErrorHandler } from "@/components/ErrorProvider";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { handleServerError } = useErrorHandler();

  useEffect(() => {
    handleServerError(error.message, error);
  }, [error, handleServerError]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
          <div className="w-full max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-red-100 p-4">
                <svg
                  className="h-12 w-12 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-zinc-900">
              Application Error
            </h1>
            <p className="mb-6 text-zinc-600">
              We encountered an unexpected error. Our team has been notified.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={reset}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                Try again
              </button>
              <a
                href="/"
                className="rounded-lg border border-zinc-300 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
