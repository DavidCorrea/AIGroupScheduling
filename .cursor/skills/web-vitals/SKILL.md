---
name: web-vitals
description: Core Web Vitals best practices for Next.js App Router projects. Use when adding or changing pages, layouts, components, images, fonts, scripts, or anything that affects loading performance, interactivity, or visual stability.
---

# Web Vitals — Next.js App Router

## When to use

- Adding or changing pages, layouts, or heavy components.
- Adding images, fonts, or third-party scripts.
- Optimising LCP, CLS, or INP.
- Setting up performance monitoring or reporting.
- Reviewing a page for performance regressions.

---

## The three Core Web Vitals

| Metric | What it measures | Good | Poor | Biggest levers |
|--------|-----------------|------|------|----------------|
| **LCP** (Largest Contentful Paint) | Time until the largest visible element renders | ≤ 2.5 s | > 4 s | Server Components, ISR/SSG, `next/image` with `priority`, font preloading, streaming with `<Suspense>` |
| **CLS** (Cumulative Layout Shift) | Visual stability — unexpected layout movement | ≤ 0.1 | > 0.25 | Explicit image dimensions, `font-display: swap` via `next/font`, reserved space for async content, skeleton loaders |
| **INP** (Interaction to Next Paint) | Responsiveness — delay from interaction to visual update | ≤ 200 ms | > 500 ms | Code splitting with `next/dynamic`, `useTransition` for heavy state updates, small client bundles, avoiding long main-thread tasks |

Google ranks using **field data** (CrUX / real users at p75), not Lighthouse lab scores. Optimise for real-world conditions.

---

## LCP optimisation

### Images — use `next/image`

```tsx
import Image from 'next/image';

<Image
  src={src}
  alt="descriptive alt text"
  width={800}
  height={400}
  priority          // above-the-fold LCP candidates only
  sizes="(max-width: 768px) 100vw, 800px"
/>
```

**Rules:**
- **`priority`** on the single LCP image per page (hero, main banner). Only one per page — it triggers `<link rel="preload">`.
- **`sizes`** — always provide when using responsive layout so the browser picks the right srcset variant. Without it the browser downloads the largest image.
- **`width` + `height`** — always required (prevents CLS). For fill layout use the `fill` prop with a parent that has `position: relative` and explicit dimensions.
- **Small decorative images** (avatars ≤ 48 px, icons): plain `<img>` is acceptable when they are never LCP elements.

### Fonts — use `next/font`

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
```

`next/font` self-hosts, subsets, and applies `font-display: swap` automatically. **Never add manual `<link>` tags for Google Fonts** — that creates a render-blocking external request.

### Server Components and streaming

- **Default to Server Components.** They send zero JS to the client and render on the server — fastest path to LCP.
- **Wrap slow data fetches in `<Suspense>`** with a skeleton fallback so the page shell streams immediately:

```tsx
<Suspense fallback={<SkeletonGrid />}>
  <SlowDataSection />
</Suspense>
```

- **ISR / `revalidate`** caches pages at the edge for content that changes infrequently. Pair with `revalidatePath` / `revalidateTag` for on-demand freshness.

**Adopted Suspense streaming pattern:** Heavy server pages (dashboard, assignments, settings, admin) keep auth at the top level for fast redirects, then wrap data-fetching in a co-located async Server Component inside `<Suspense>`:

```tsx
export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <Suspense fallback={<RootLoadingSkeleton />}>
      <PageContent userId={session.user.id} />
    </Suspense>
  );
}

async function PageContent({ userId }: { userId: string }) {
  const data = await loadExpensiveData(userId);
  return <PageClient data={data} />;
}
```

Config pages are excluded — they have fast queries and already benefit from `[slug]/config/loading.tsx`.

**LCP headings outside Suspense:** On `/` and `/asignaciones`, the page heading (`h1` + subtitle) is rendered by the server page component *above* the `<Suspense>` boundary. The heading text comes from `getTranslations` (near-instant since messages are statically imported). This lets the LCP element paint as soon as the page shell streams, without waiting for data.

**Cronograma streaming:** `[slug]/cronograma/[year]/[month]` wraps all DB work (group lookup, schedule query, `buildPublicScheduleResponse`) in `<Suspense>` with the route's loading skeleton as fallback. On ISR cache misses the skeleton streams immediately; cached responses serve the fully-resolved HTML.

### Avoid

- **Top-level `await` in page components** when the page has other content to show — it blocks the entire page from streaming. Extract the slow fetch into a child component wrapped in `<Suspense>`.
- **Fetching your own route handlers from Server Components.** Call the data layer directly — both run on the server; the extra HTTP hop is waste.
- **Large unoptimised images** without `next/image` — they skip automatic format negotiation (AVIF/WebP), resizing, and lazy loading.

---

## CLS optimisation

### Reserved dimensions

- **Images:** Always set `width` + `height` (or use `fill` with a sized container). `next/image` enforces this.
- **Skeleton loaders:** Match the skeleton's dimensions to the final content so the swap doesn't shift layout.
- **Dynamic content:** If content loads async and inserts into the viewport, reserve its space with `min-height`, `aspect-ratio`, or a placeholder skeleton.

### Fonts

`next/font` with `font-display: swap` eliminates FOUT-related layout shifts. Avoid loading fonts via `<link>` or CSS `@import`.

### Common CLS causes

- Injecting a banner, toast, or alert above existing content without reserved space.
- Images without explicit dimensions.
- Web fonts loaded via external stylesheets (render-blocking or late swap).
- Dynamically prepending items to a list.

---

## INP optimisation

### Code splitting with `next/dynamic`

Lazy-load heavy client components that are not needed for initial render:

```tsx
import dynamic from 'next/dynamic';

const HeavyEditor = dynamic(() => import('@/components/HeavyEditor'), {
  loading: () => <Skeleton />,
});
```

**Named exports** need a `.then()` wrapper because `next/dynamic` expects a default export:

```tsx
const MyModal = dynamic(
  () => import('./MyModal').then((m) => ({ default: m.MyModal })),
);
```

**When to use:**
- Modals, dialogs, drawers (rendered on interaction).
- Complex forms or editors with large dependency trees (e.g. `EventForm`, `AvailabilityWeekGrid`).
- Components behind tabs, accordions, or feature flags.

**Adopted in this project:** `EventForm` (events pages), `AvailabilityWeekGrid` (member pages), `DateDetailModal`, `CalendarGrid`, `MemberAgendaCard` (SharedScheduleView) are dynamically imported.

### `useTransition` for heavy state updates

Wrap expensive transitions so they don't block user input:

```tsx
const [, startTransition] = useTransition();

function handleFilter(value: string) {
  startTransition(() => {
    setFilter(value);
  });
}
```

For components that pass setters to children, wrap in `useCallback` for a stable reference:

```tsx
const setFilterTransition = useCallback(
  (v: string) => startTransition(() => setFilter(v)),
  [startTransition],
);
```

Use when filtering, sorting, or re-rendering large lists. React processes the update in the background while the UI stays responsive.

**Adopted in this project:** Filter setters in `/asignaciones`, `SharedScheduleView`, dashboard calendar selection, and schedule detail `showPastDates` all use `startTransition`.

### Keep client bundles small

- **Push `"use client"` as deep as possible.** Only the interactive leaf component needs it — don't mark a whole page as client when only a button needs state.
- **Avoid importing large libraries in client components.** If only one function is needed, dynamically import it.
- **No barrel exports** (`index.ts` re-exporting everything) in component or schema folders — tree shaking is unreliable with barrel files. API routes import directly from the specific schema module (e.g. `@/lib/schemas/members` not `@/lib/schemas`).

### Server Component shell + client leaf (adopted pattern)

Every page in this project follows this architecture:

```tsx
// page.tsx — async Server Component (no "use client")
import { getGroupForConfigLayout } from "@/lib/config-server";
import { loadConfigContextForGroup } from "@/lib/load-config-context";
import PageClient from "./PageClient";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await getGroupForConfigLayout(slug);  // cached per request
  const ctx = await loadConfigContextForGroup(group.id, { include: ["members"] });
  return <PageClient slug={slug} groupId={group.id} members={ctx?.members ?? []} />;
}
```

```tsx
// PageClient.tsx — "use client" leaf
"use client";
export default function PageClient({ slug, groupId, members }: Props) {
  // All interactivity, state, mutations here
  // After mutations: router.refresh() to re-trigger server render
}
```

**Key rules:**
- Server pages call data access functions from `src/lib/data-access.ts` or `src/lib/load-config-context.ts` — never fetch from internal API routes.
- Config pages use `getGroupForConfigLayout(slug)` (wrapped in `React.cache()`) for auth + group resolution.
- Non-config pages use `auth()` from `src/lib/auth.ts` and `redirect("/login")` if unauthenticated.
- Client components receive data as props. No `useEffect` + `fetch` for initial data loading.
- After mutations, client components call `router.refresh()` to re-render server components with fresh data.

### Third-party scripts

Use `next/script` with the right loading strategy:

```tsx
import Script from 'next/script';

<Script src="https://example.com/analytics.js" strategy="afterInteractive" />
<Script src="https://example.com/widget.js" strategy="lazyOnload" />
```

| Strategy | When |
|----------|------|
| `beforeInteractive` | Critical scripts that must run before hydration (rare) |
| `afterInteractive` | Analytics, tracking — runs after hydration (default) |
| `lazyOnload` | Non-critical — chat widgets, social embeds |

**Never add third-party `<script>` tags directly in JSX.** Use `next/script` for load orchestration and deferred execution.

---

## Measurement and reporting

### `useReportWebVitals`

Create a dedicated client component to confine the client boundary:

```tsx
'use client';

import { useReportWebVitals } from 'next/web-vitals';

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const reportWebVitals: ReportWebVitalsCallback = (metric) => {
  // Send to your analytics endpoint; console.log in dev
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${metric.name}] ${metric.rating}: ${Math.round(metric.value)}ms`);
  }
};

export function WebVitals() {
  useReportWebVitals(reportWebVitals);
  return null;
}
```

Add `<WebVitals />` in the root layout's `<body>`. The callback reference must be **stable** (defined outside the component) to avoid duplicate reports.

**Adopted in this project:** `src/components/WebVitals.tsx` logs metrics in dev; wired in `src/app/layout.tsx` after `<SpeedInsights />`.

### `instrumentation-client.ts`

For early client-side performance marks that run before React hydration:

```ts
// src/instrumentation-client.ts
performance.mark('app-init');

export function onRouterTransitionStart() {
  performance.mark(`nav-start-${Date.now()}`);
}
```

Keep this file lightweight (< 16 ms init time). Next.js warns in dev if it takes longer.

**Adopted in this project:** `src/instrumentation-client.ts` marks `app-init` and each router transition.

### Lab tools

- **Lighthouse** (Chrome DevTools → Lighthouse tab) — quick audit. Use "Mobile" preset for worst-case.
- **React DevTools Profiler** — find components with expensive re-renders.
- **WebPageTest** — detailed waterfall, filmstrip, CWV breakdown for deep investigation.
- **Chrome DevTools Performance panel** — identify long tasks (> 50 ms) that hurt INP.

---

## Checklist — before shipping a page

1. **LCP element identified?** If it's an image, does it use `next/image` with `priority`?
2. **No layout shifts?** All images have dimensions; async content has reserved space or skeleton.
3. **Client bundle minimal?** `"use client"` only on interactive leaves; heavy components dynamically imported.
4. **No long tasks?** Heavy filters/sorts use `useTransition`; no synchronous work > 50 ms in event handlers.
5. **Third-party scripts** loaded via `next/script` with appropriate strategy.
6. **Streaming enabled?** Slow data fetches in `<Suspense>` boundaries, not blocking the page shell.

---

## What to avoid

- **Plain `<img>` for large/hero images.** Use `next/image` for automatic optimisation.
- **`priority` on more than one image per page.** Only the LCP candidate gets it.
- **Manual `<link>` or CSS `@import` for fonts.** Use `next/font` for zero-CLS font loading.
- **Barrel index files** in component folders — they defeat tree shaking and bloat client bundles.
- **Raw `<script>` tags for third-party code.** Use `next/script` for load orchestration.
- **Synchronous heavy computation in event handlers.** Use `useTransition` or move to a Web Worker.
- **Forgetting `sizes` on responsive `next/image`.** Without it the browser downloads the largest variant.
