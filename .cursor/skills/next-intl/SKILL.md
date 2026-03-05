---
name: next-intl
description: Use when working on i18n, translations, next-intl, messages, Spanish locale, or client-facing copy in this Next.js app.
---

# next-intl in this project

## How we use it

- **Locale:** Single locale `es`. No locale segment in the URL; middleware does not use next-intl (auth only).
- **Config:** `src/i18n/request.ts` — `getRequestConfig` returns `locale: "es"` and messages from `messages/es.json`. Plugin wired in `next.config.ts` via `createNextIntlPlugin("./src/i18n/request.ts")`.
- **Root layout:** `src/app/layout.tsx` wraps the app in `NextIntlClientProvider`; messages from `getMessages()` with JSON fallback.
- **Client copy:** All user-facing text lives in `messages/es.json`. Top-level keys are namespaces (e.g. `nav`, `home`, `members`, `configNav`, `common`, `cronograma`, `schedules`, `roles`, `events`, `holidays`, `scheduleDetail`, `myAssignments`, `admin`, `login`, `settings`, `errorBoundary`, `newGroup`, `collaborators`, `shortcuts`).
- **In components:** Use `useTranslations('namespace')` then `t('key')` or `t('key', { n: value })` for placeholders. Multiple namespaces per component are fine (e.g. `useTranslations("roles")`, `useTranslations("common")`).
- **Raw/arrays:** For array messages (e.g. month names), use **`getRawArray(t, key)`** from `src/lib/intl-utils.ts`; it returns `string[]` and centralizes the type cast for `t.raw(key)`.
- **Error handling:** `IntlErrorHandlingProvider` exists (`src/components/IntlErrorHandlingProvider.tsx`) but is not used in the root layout (comment: nesting breaks SSG of `/_not-found`). Root layout has no custom `onError` or `getMessageFallback`.

## How it should be used

- **New use cases:** Before using next-intl in a new context (e.g. server component, new namespace), check the docs and document the pattern in this skill.
- **New copy:** Add keys to `messages/es.json` under the right namespace (or add a new top-level key). In components use `useTranslations('namespace')` and `t('key')`; for placeholders use `t('key', { name: value })` (or `n` for numbers where plural rules apply).
- **Server Components:** Async Server Components can use `getTranslations`, `getLocale`, `getMessages` from `next-intl/server` instead of hooks. This project currently uses only client/shared components with `useTranslations`.
- **Root layout:** Prefer loading messages via `getMessages()` from `next-intl/server` (single source of truth with `getRequestConfig`), with a fallback when `getMessages()` is undefined (e.g. `_not-found`).
- **Plurals:** Use next-intl plural rules and `t('key', { n: count })` with ICU plural forms in messages (e.g. "one" / "other") where applicable.
- **Tests:** Mock `next-intl`: `jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))` (see `spec/app-nav-bar.spec.tsx`).
