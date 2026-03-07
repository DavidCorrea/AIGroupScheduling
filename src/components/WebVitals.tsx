"use client";

import { useReportWebVitals } from "next/web-vitals";

type Callback = Parameters<typeof useReportWebVitals>[0];

const reportWebVitals: Callback = (metric) => {
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[${metric.name}] ${metric.rating}: ${Math.round(metric.value)}ms`,
    );
  }
};

export function WebVitals() {
  useReportWebVitals(reportWebVitals);
  return null;
}
