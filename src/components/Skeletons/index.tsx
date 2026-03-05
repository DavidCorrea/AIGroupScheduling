"use client";

import type { ReactNode } from "react";

/**
 * Shared skeleton primitives for loading states.
 * Use Tailwind animate-pulse and bg-muted so all skeletons share the same look and respect theme.
 * Wrap skeleton regions in SkeletonRegion for aria-busy and aria-label (a11y).
 */

const skeletonClass = "animate-pulse rounded bg-muted";

export function SkeletonText({
  className = "",
  lines = 1,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 ${skeletonClass} ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonRow({
  className = "",
  avatar = true,
  lines = 2,
}: {
  className?: string;
  avatar?: boolean;
  lines?: number;
}) {
  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      aria-hidden
    >
      {avatar && (
        <div className={`h-10 w-10 shrink-0 rounded-full ${skeletonClass}`} />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className={`h-4 ${skeletonClass} w-full`} />
        {lines >= 2 && (
          <div className={`h-3 ${skeletonClass} w-2/3`} />
        )}
        {lines >= 3 && (
          <div className={`h-3 ${skeletonClass} w-1/2`} />
        )}
      </div>
    </div>
  );
}

export function SkeletonCard({
  className = "",
  height = "h-20",
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border p-4 ${height} flex flex-col justify-center gap-3 ${className}`}
      aria-hidden
    >
      <div className={`h-4 ${skeletonClass} w-2/3`} />
      <div className={`h-3 ${skeletonClass} w-1/2`} />
    </div>
  );
}

export function SkeletonGrid({
  count = 6,
  className = "",
  cardHeight = "h-20",
}: {
  count?: number;
  className?: string;
  cardHeight?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={cardHeight} />
      ))}
    </div>
  );
}

/**
 * Wraps a skeleton region with aria-busy and aria-label so screen readers announce loading.
 * Remove or replace with real content when data is ready.
 */
export function SkeletonRegion({
  "aria-label": ariaLabel = "Cargando…",
  children,
  className = "",
}: {
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      aria-busy="true"
      aria-label={ariaLabel}
      role="status"
    >
      {children}
    </div>
  );
}

/**
 * Full-page skeleton for dashboard/root loading. Used by root loading.tsx and LoadingScreen (fullPage).
 */
export function RootLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SkeletonRegion className="mb-12" aria-label="Cargando…">
          <div className="h-10 w-3/4 max-w-md animate-pulse rounded bg-muted" aria-hidden />
          <div className="mt-3 h-5 w-full max-w-lg animate-pulse rounded bg-muted" aria-hidden />
        </SkeletonRegion>

        <div className="border-t border-border pt-8 lg:grid lg:grid-cols-[1fr_1px_1fr] lg:gap-8">
          <div>
            <div className="mb-12">
              <div className="h-3 w-32 animate-pulse rounded bg-muted mb-6" aria-hidden />
              <div className="h-5 w-48 animate-pulse rounded bg-muted" aria-hidden />
              <div className="mt-3 h-4 w-64 animate-pulse rounded bg-muted" aria-hidden />
              <div className="mt-3 space-y-2">
                <SkeletonRow avatar={false} lines={2} />
                <SkeletonRow avatar={false} lines={2} />
              </div>
            </div>
            <div className="mb-12 border-t border-border pt-8">
              <div className="h-3 w-24 animate-pulse rounded bg-muted mb-6" aria-hidden />
              <div className="grid grid-cols-7 gap-1 mb-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse rounded bg-muted" aria-hidden />
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" aria-hidden />
                ))}
              </div>
            </div>
          </div>
          <div className="hidden lg:block bg-border" aria-hidden />
          <div className="border-t border-border pt-8 mt-4 lg:border-t-0 lg:pt-0 lg:mt-0">
            <div className="mb-6 flex items-center justify-between">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" aria-hidden />
              <div className="h-8 w-28 animate-pulse rounded bg-muted" aria-hidden />
            </div>
            <div className="divide-y divide-border">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-5 first:pt-0">
                  <SkeletonRow lines={2} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Config-area skeleton (sub-nav + list cards). Used by config loading.tsx and LoadingScreen (!fullPage).
 */
export function ConfigContentSkeleton() {
  return (
    <SkeletonRegion className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-label="Cargando…">
      <div className="space-y-12">
        <div>
          <div className="h-9 w-48 animate-pulse rounded bg-muted" aria-hidden />
          <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded bg-muted" aria-hidden />
        </div>
        <div className="border-t border-border pt-8">
          <div className="h-3 w-24 animate-pulse rounded bg-muted mb-6" aria-hidden />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-lg border border-dashed border-border p-4 h-20 flex items-center justify-center animate-pulse bg-muted/30" aria-hidden />
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} height="h-20" />
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
