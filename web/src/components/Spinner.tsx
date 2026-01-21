"use client";

import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-3",
};

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-current border-t-transparent text-indigo-600 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function LoadingOverlay({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-zinc-600">{message}</p>
      </div>
    </div>
  );
}

export function ButtonSpinner({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner size={size} />
    </span>
  );
}

export function InlineLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-zinc-500">
      <Spinner size="sm" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
