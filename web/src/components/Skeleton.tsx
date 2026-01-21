"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-200 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}
        />
      ))}
    </div>
  );
}

export function SkeletonButton({ className = "" }: { className?: string }) {
  return (
    <Skeleton
      className={`h-10 w-24 rounded-lg ${className}`}
    />
  );
}

export function SkeletonInput({ className = "" }: { className?: string }) {
  return (
    <Skeleton
      className={`h-10 w-full rounded-lg ${className}`}
    />
  );
}

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <Skeleton className={`rounded-full ${sizeClasses[size]}`} />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-3 rounded-lg border border-zinc-200 bg-white p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <SkeletonButton />
        <SkeletonButton />
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 3,
  className = "",
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex gap-4 border-b border-zinc-200 pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({
  items = 3,
  className = "",
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <SkeletonAvatar size="sm" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <SkeletonText lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonUploadForm({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-20" />
        <SkeletonInput />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <div className="flex items-center gap-3">
        <SkeletonButton />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
