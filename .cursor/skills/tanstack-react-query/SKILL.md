---
name: tanstack-react-query
description: How this project uses TanStack React Query for data fetching, cache, useQuery, useMutation, and invalidation. Use when adding or changing React Query usage, config context fetching, or cache invalidation.
---
# TanStack React Query in this project

## How we use it

- **Provider**: `QueryProvider` (`src/components/QueryProvider.tsx`) wraps the app in the root layout (`src/app/layout.tsx`), inside `NextIntlClientProvider` and wrapping `SessionProvider`. One `QueryClient` per client (via `useState` to avoid sharing between requests).
- **Defaults**: `staleTime: 60 * 1000` (1 min). No `gcTime` set (v5 default 5 min).
- **Config context**: Single query surface — `useConfigContext(slug, include)` in `src/lib/config-queries.ts`. Query key from `configContextQueryKey(slug, include)` → `["config", slug, includeKey]`. View-scoped: pass `include` (e.g. `["members"]`, `["roles", "exclusiveGroups"]`) to fetch only needed slices. `enabled: Boolean(slug)`.
- **Invalidation**: After config mutations, call `refetchContext()` from `useGroup()` (`src/lib/group-context.tsx`). It runs `queryClient.invalidateQueries({ queryKey: configContextQueryKeyPrefix(slug) })` so all config queries for that slug refetch. Key prefix lives in `src/lib/config-queries.ts` (`configContextQueryKeyPrefix(slug)` → `["config", slug]`).
- **Mutations**: Config mutations are manual `fetch` + `await refetchContext()` then navigate. We do not use `useMutation` for these; invalidation is explicit.

## How it should be used

- **New use cases:** Before adding a new query or mutation pattern, check TanStack Query docs and document the key shape and invalidation here.
- **Query keys**: Use the factory in `config-queries`: `configContextQueryKey(slug, include)` for queries, `configContextQueryKeyPrefix(slug)` for invalidation. Do not hardcode `["config", slug]` elsewhere.
- **New queries**: Prefer view-scoped `useConfigContext(slug, include)` with the smallest `include` the view needs. Add a new slice in `load-config-context.ts` and API if required.
- **After mutations**: Always `await refetchContext()` (or invalidate the same key prefix) before navigating away so the next view sees fresh data.
- **Provider**: Keep a single `QueryClientProvider` at the root; do not nest another provider for React Query.
- **v5**: We use v5; options are `staleTime` and `gcTime` (not `cacheTime`). Partial query keys in `invalidateQueries` match by prefix.
