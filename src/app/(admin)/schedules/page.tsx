"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Schedule {
  id: number;
  month: number;
  year: number;
  status: string;
  shareToken: string | null;
  createdAt: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function SchedulesPage() {
  const [schedulesList, setSchedulesList] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Generation form
  const now = new Date();
  const [selectedMonths, setSelectedMonths] = useState<
    { month: number; year: number }[]
  >([{ month: now.getMonth() + 1, year: now.getFullYear() }]);

  const fetchSchedules = useCallback(async () => {
    const res = await fetch("/api/schedules");
    setSchedulesList(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const addMonth = () => {
    const last = selectedMonths[selectedMonths.length - 1];
    const nextMonth = last.month === 12 ? 1 : last.month + 1;
    const nextYear = last.month === 12 ? last.year + 1 : last.year;
    setSelectedMonths([
      ...selectedMonths,
      { month: nextMonth, year: nextYear },
    ]);
  };

  const removeMonth = (index: number) => {
    setSelectedMonths(selectedMonths.filter((_, i) => i !== index));
  };

  const updateMonth = (
    index: number,
    field: "month" | "year",
    value: number
  ) => {
    const updated = [...selectedMonths];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedMonths(updated);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: selectedMonths }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to generate schedule");
        return;
      }

      fetchSchedules();
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    fetchSchedules();
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Schedules</h1>
        <p className="mt-1 text-muted-foreground">
          Generate new schedules or view existing ones.
        </p>
      </div>

      {/* Generate form */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Generate Schedule</h2>
        <p className="text-sm text-muted-foreground">
          Select one or more months to generate schedules for.
        </p>

        <div className="space-y-3">
          {selectedMonths.map((sm, index) => (
            <div key={index} className="flex items-center gap-3">
              <select
                value={sm.month}
                onChange={(e) =>
                  updateMonth(index, "month", parseInt(e.target.value, 10))
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={sm.year}
                onChange={(e) =>
                  updateMonth(index, "year", parseInt(e.target.value, 10))
                }
                className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
                min={2020}
                max={2040}
              />
              {selectedMonths.length > 1 && (
                <button
                  onClick={() => removeMonth(index)}
                  className="text-sm text-destructive hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={addMonth}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            + Add Month
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {/* Schedules list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Existing Schedules</h2>
        {schedulesList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No schedules generated yet.
          </p>
        ) : (
          schedulesList.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-4">
                <div>
                  <span className="font-medium">
                    {MONTH_NAMES[schedule.month - 1]} {schedule.year}
                  </span>
                  <span
                    className={`ml-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      schedule.status === "committed"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {schedule.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/schedules/${schedule.id}`}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted transition-colors"
                >
                  View
                </Link>
                {schedule.shareToken && (
                  <Link
                    href={`/shared/${schedule.shareToken}`}
                    className="rounded-md border border-primary text-primary px-3 py-1 text-sm hover:bg-accent transition-colors"
                  >
                    Shared Link
                  </Link>
                )}
                <button
                  onClick={() => handleDelete(schedule.id)}
                  className="rounded-md border border-destructive px-3 py-1 text-sm text-destructive hover:bg-destructive hover:text-white transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
