/**
 * Helpers for next-intl usage.
 * Use getRawArray when you need a message value as string[] (e.g. month names from messages).
 */

import type { useTranslations } from "next-intl";

/**
 * Returns a message value as string[]. Use for keys whose value is an array in messages (e.g. "months", "dayHeaders").
 * Centralizes the type cast needed because next-intl's t.raw() return type is string | string[] depending on the message.
 */
export function getRawArray(
  t: ReturnType<typeof useTranslations<string>>,
  key: string
): string[] {
  const raw = (t as unknown as { raw: (k: string) => unknown }).raw(key);
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") return [raw];
  return [];
}
