# Skeletons — Loading placeholders

Shared skeleton components for loading states. **Only skeletons are used** (no spinners); route-level `loading.tsx` and page-level `LoadingScreen` both render skeletons.

- **SkeletonText**, **SkeletonRow**, **SkeletonCard**, **SkeletonGrid**: primitives built with Tailwind `animate-pulse` and `bg-muted` (theme-aware).
- **SkeletonRegion**: wraps a skeleton area with `aria-busy="true"` and `aria-label` (e.g. "Cargando…") for screen readers.
- **RootLoadingSkeleton**: full-page dashboard-style skeleton. Used by `src/app/loading.tsx` and `LoadingScreen` when `fullPage`.
- **ConfigContentSkeleton**: config-area list/cards skeleton. Used by `src/app/[slug]/config/loading.tsx` and `LoadingScreen` when `!fullPage`.

Import from `@/components/Skeletons`. Used by route-level `loading.tsx`, by `LoadingScreen`, and by pages that show inline skeletons (e.g. when `isLoading` from TanStack Query).
