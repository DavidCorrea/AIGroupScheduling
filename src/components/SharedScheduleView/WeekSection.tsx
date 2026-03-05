"use client";

import type { ReactNode } from "react";

export interface WeekSectionProps {
  weekNumber: number;
  /** e.g. t("week") */
  titlePrefix: string;
  dateRangeLabel: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  titleAs?: "h2" | "h3";
}

export function WeekSection({
  weekNumber,
  titlePrefix,
  dateRangeLabel,
  isCollapsed,
  onToggle,
  children,
  titleAs: Title = "h2",
}: WeekSectionProps) {
  return (
    <section className="border border-border rounded-lg bg-muted/10 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={!isCollapsed}
      >
        <Title className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {titlePrefix} {weekNumber}
          <span className="normal-case font-normal tracking-normal text-muted-foreground/90">
            {" · "}
            {dateRangeLabel}
          </span>
        </Title>
        <span className="text-muted-foreground shrink-0" aria-hidden>
          {isCollapsed ? "▶" : "▼"}
        </span>
      </button>
      {!isCollapsed && children}
    </section>
  );
}
