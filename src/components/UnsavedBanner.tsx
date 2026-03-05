"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useUnsavedConfig } from "@/lib/unsaved-config-context";

/**
 * Banner shown when config form has unsaved changes (dirty).
 * Also sets beforeunload so closing the tab warns the user.
 */
export function UnsavedBanner() {
  const { dirty } = useUnsavedConfig();
  const t = useTranslations("configNav");

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  if (!dirty) return null;

  return (
    <div
      className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:text-amber-200"
      role="status"
      aria-live="polite"
    >
      {t("unsavedBanner")}
    </div>
  );
}
