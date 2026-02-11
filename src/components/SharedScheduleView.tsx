"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export interface ScheduleEntry {
  id: number;
  date: string;
  roleId: number;
  memberId: number;
  memberName: string;
  roleName: string;
}

export interface DateNote {
  id: number;
  date: string;
  description: string;
}

export interface RoleInfo {
  id: number;
  name: string;
  requiredCount: number;
  displayOrder: number;
  dependsOnRoleId?: number | null;
  isRelevant?: boolean;
}

export interface ScheduleNavLink {
  month: number;
  year: number;
}

export interface SharedScheduleData {
  month: number;
  year: number;
  entries: ScheduleEntry[];
  members: { id: number; name: string }[];
  notes: DateNote[];
  rehearsalDates: string[];
  /** @deprecated Use dependentRoleIds instead */
  leaderRoleId?: number | null;
  dependentRoleIds?: number[];
  roles?: RoleInfo[];
  prevSchedule?: ScheduleNavLink | null;
  nextSchedule?: ScheduleNavLink | null;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Get the Monday of the ISO week for a given date string.
 * Returns an ISO date string for that Monday.
 */
function getMondayOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dow = date.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = dow === 0 ? 6 : dow - 1; // days since Monday
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString().slice(0, 10);
}

/**
 * Get the Spanish weekday name (lowercase) for a date string.
 */
function getWeekdayName(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    timeZone: "UTC",
  });
}

/**
 * Get a friendly relative label in Spanish for the distance between today and a target date.
 */
function getRelativeLabel(targetStr: string, todayStr: string): string {
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const [dy, dm, dd] = targetStr.split("-").map(Number);
  const todayDate = new Date(Date.UTC(ty, tm - 1, td));
  const targetDate = new Date(Date.UTC(dy, dm - 1, dd));
  const diffMs = targetDate.getTime() - todayDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays === 2) return "Pasado mañana";
  if (diffDays <= 6) return `En ${diffDays} días`;
  if (diffDays <= 13) return "La próxima semana";
  const weeks = Math.floor(diffDays / 7);
  return `En ${weeks} semanas`;
}

/**
 * Get today's date as YYYY-MM-DD in local timezone.
 */
function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function SharedScheduleView({
  schedule,
  basePath = "/shared",
}: {
  schedule: SharedScheduleData;
  basePath?: string;
}) {
  const { data: session } = useSession();
  const [filteredMemberId, setFilteredMemberId] = useState<number | null>(null);
  const [filteredRoleId, setFilteredRoleId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [today, setToday] = useState("");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [dayFilter, setDayFilter] = useState("");
  const [showPastDates, setShowPastDates] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);

  // Initialise dark mode from system preference or localStorage
  useEffect(() => {
    const stored = localStorage.getItem("band-scheduler-theme");
    if (stored) {
      setDarkMode(stored === "dark");
    } else {
      setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    setToday(getTodayISO());
  }, []);

  // Apply dark/light class to html element
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }
    localStorage.setItem("band-scheduler-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Reset view mode when member filter changes
  useEffect(() => {
    setViewMode("list");
    setCalendarSelectedDate(null);
  }, [filteredMemberId]);

  // Support both old leaderRoleId (single) and new dependentRoleIds (array)
  const dependentRoleIds: number[] = schedule.dependentRoleIds
    ?? (schedule.leaderRoleId ? [schedule.leaderRoleId] : []);
  const dependentRoleIdSet = new Set(dependentRoleIds);

  // Relevant role IDs for highlighting
  const relevantRoleIdSet = new Set(
    (schedule.roles ?? []).filter((r) => r.isRelevant).map((r) => r.id)
  );

  const entryDates = [...new Set(schedule.entries.map((e) => e.date))];

  // Helper: check if a date should be excluded by past-date or day-of-week filters
  const isDateVisible = (d: string): boolean => {
    if (!showPastDates && today && d < today) return false;
    if (dayFilter && getWeekdayName(d) !== dayFilter) return false;
    return true;
  };

  // Helper: check if date is in the past (for styling when showPastDates is on)
  const isPast = (date: string): boolean => {
    if (!today) return false;
    return date < today;
  };

  const allDates = [
    ...new Set([...entryDates, ...schedule.rehearsalDates]),
  ]
    .sort()
    .filter(isDateVisible);

  // Filter entries by member and/or role
  const filteredEntries = schedule.entries.filter((e) => {
    if (filteredMemberId && e.memberId !== filteredMemberId) return false;
    if (filteredRoleId && e.roleId !== filteredRoleId) return false;
    return true;
  });

  const hasActiveFilter = filteredMemberId || filteredRoleId;

  const filteredDates = hasActiveFilter
    ? [...new Set(filteredEntries.map((e) => e.date))].sort().filter(isDateVisible)
    : allDates;

  // Derive unique weekday names from all schedule dates (for the day filter dropdown)
  const allScheduleDates = [
    ...new Set([...entryDates, ...schedule.rehearsalDates]),
  ].sort();
  const weekdayOrder = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const availableWeekdays = [...new Set(allScheduleDates.map(getWeekdayName))]
    .sort((a, b) => weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b));

  // Get unique roles ordered by displayOrder
  const entryRoleIds = new Set(schedule.entries.map((e) => e.roleId));
  const roleOrder: { id: number; name: string }[] = schedule.roles
    ? schedule.roles
        .filter((r) => entryRoleIds.has(r.id))
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((r) => ({ id: r.id, name: r.name }))
    : (() => {
        // Fallback: first appearance order (for backward compat)
        const order: { id: number; name: string }[] = [];
        for (const entry of schedule.entries) {
          if (!order.find((r) => r.id === entry.roleId)) {
            order.push({ id: entry.roleId, name: entry.roleName });
          }
        }
        return order;
      })();

  const selectedMember = schedule.members.find(
    (m) => m.id === filteredMemberId
  );

  const noteMap = new Map(schedule.notes.map((n) => [n.date, n.description]));
  const rehearsalSet = new Set(schedule.rehearsalDates);

  // Helper: check if the filtered member has a dependent role on a given date
  const hasDependentRoleOnDate = (date: string): boolean => {
    if (!filteredMemberId || dependentRoleIdSet.size === 0) return false;
    return filteredEntries.some(
      (e) => e.date === date && dependentRoleIdSet.has(e.roleId)
    );
  };

  // Helper: check if the filtered member has a relevant role on a given date
  const hasRelevantRoleOnDate = (date: string): boolean => {
    if (!filteredMemberId || relevantRoleIdSet.size === 0) return false;
    return filteredEntries.some(
      (e) => e.date === date && relevantRoleIdSet.has(e.roleId)
    );
  };

  // Helper: get the dependent role names assigned to the filtered member on a date
  const getDependentRoleNamesOnDate = (date: string): string[] => {
    if (!filteredMemberId) return [];
    return filteredEntries
      .filter((e) => e.date === date && dependentRoleIdSet.has(e.roleId))
      .map((e) => e.roleName);
  };

  // Helper: get grouped roles for the filtered member on a date
  const getRolesForDate = (date: string): string => {
    const dateEntries = filteredEntries.filter((e) => e.date === date);
    return dateEntries.map((e) => e.roleName).join(", ");
  };

  // Helper: get non-dependent roles for the filtered member on a date
  const getNonDependentRolesForDate = (date: string): string => {
    const dateEntries = filteredEntries.filter(
      (e) => e.date === date && !dependentRoleIdSet.has(e.roleId)
    );
    return dateEntries.map((e) => e.roleName).join(", ");
  };

  // Count non-rehearsal dates for filtered member
  const assignedDateCount = filteredMemberId
    ? filteredDates.filter((d) => !rehearsalSet.has(d)).length
    : 0;

  // Helper: toggle expanded state for a date (mobile cards)
  const toggleExpanded = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // Helper: check if a new week starts between two dates (Monday-based)
  const isNewWeek = (date: string, prevDate: string | null): boolean => {
    if (!prevDate) return false;
    return getMondayOfWeek(date) !== getMondayOfWeek(prevDate);
  };

  // Upcoming assignment for filtered member
  const upcomingDate =
    filteredMemberId && today
      ? filteredDates.find((d) => d >= today && !rehearsalSet.has(d))
      : null;

  // Dates to display in the list (exclude the upcoming date to avoid duplication)
  const displayDates = upcomingDate
    ? filteredDates.filter((d) => d !== upcomingDate)
    : filteredDates;

  // The first non-rehearsal date is auto-expanded on mobile
  const autoExpandedDate = displayDates.find((d) => !rehearsalSet.has(d)) ?? null;

  // A date is expanded if:
  //  - it's the auto-expanded first date and NOT manually toggled off, OR
  //  - it's been manually toggled on
  const isDateExpanded = (date: string): boolean => {
    const isAutoOpen = date === autoExpandedDate;
    const isManuallyToggled = expandedDates.has(date);
    // XOR: auto-open dates start expanded; toggling flips them.
    // Non-auto dates start collapsed; toggling flips them.
    return isAutoOpen ? !isManuallyToggled : isManuallyToggled;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-10 bg-background">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {schedule.prevSchedule && (
                <a
                  href={`${basePath}/${schedule.prevSchedule.year}/${schedule.prevSchedule.month}`}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-foreground transition-colors"
                  title={`${MONTH_NAMES[schedule.prevSchedule.month - 1]} ${schedule.prevSchedule.year}`}
                >
                  ← Anterior
                </a>
              )}
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl uppercase">
                  {MONTH_NAMES[schedule.month - 1]} {schedule.year}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-widest">Agenda del Grupo</p>
              </div>
              {schedule.nextSchedule && (
                <a
                  href={`${basePath}/${schedule.nextSchedule.year}/${schedule.nextSchedule.month}`}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-foreground transition-colors"
                  title={`${MONTH_NAMES[schedule.nextSchedule.month - 1]} ${schedule.nextSchedule.year}`}
                >
                  Siguiente →
                </a>
              )}
            </div>
            <div className="self-start sm:self-auto flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-foreground transition-colors flex items-center gap-1.5"
                aria-label="Cambiar modo"
              >
                <span className="text-base leading-none">{darkMode ? "☀️" : "🌙"}</span>
                <span>{darkMode ? "Claro" : "Oscuro"}</span>
              </button>
              {session ? (
                <Link
                  href="/"
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-foreground transition-colors"
                >
                  Inicio
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-foreground transition-colors"
                >
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={filteredMemberId ?? ""}
              onChange={(e) =>
                setFilteredMemberId(
                  e.target.value ? parseInt(e.target.value, 10) : null
                )
              }
              className="w-full sm:w-auto rounded-md border border-border bg-transparent px-3.5 py-2 text-sm"
            >
              <option value="">Todas las personas</option>
              {schedule.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={filteredRoleId ?? ""}
              onChange={(e) =>
                setFilteredRoleId(
                  e.target.value ? parseInt(e.target.value, 10) : null
                )
              }
              className="w-full sm:w-auto rounded-md border border-border bg-transparent px-3.5 py-2 text-sm"
            >
              <option value="">Todos los roles</option>
              {roleOrder.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="w-full sm:w-auto rounded-md border border-border bg-transparent px-3.5 py-2 text-sm capitalize"
            >
              <option value="">Todos los días</option>
              {availableWeekdays.map((day) => (
                <option key={day} value={day} className="capitalize">
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPastDates}
                onChange={(e) => setShowPastDates(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground">Mostrar fechas pasadas</span>
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Mobile: merged summary card (Agenda + upcoming) */}
        {filteredMemberId && selectedMember && (
          <div className="mb-8 border border-foreground/20 rounded-md p-5 lg:hidden">
            <h2 className="text-lg font-medium">
              Agenda de {selectedMember.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {assignedDateCount}{" "}
              {assignedDateCount === 1
                ? "fecha asignada"
                : "fechas asignadas"}
            </p>
            {upcomingDate && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                  Próxima asignación
                </h3>
                <p className="font-medium">
                  {formatDateLong(upcomingDate)}
                  {today && (
                    <span className="ml-2 text-sm text-muted-foreground font-normal">
                      — {getRelativeLabel(upcomingDate, today)}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getNonDependentRolesForDate(upcomingDate)}
                  {hasDependentRoleOnDate(upcomingDate) && (
                    <span className="ml-2 text-foreground font-medium">
                      ★ {getDependentRoleNamesOnDate(upcomingDate).join(", ")}
                    </span>
                  )}
                </p>
                {noteMap.get(upcomingDate) && (
                  <p className="text-xs text-accent mt-2">
                    {noteMap.get(upcomingDate)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Desktop: separate header + upcoming card */}
        {filteredMemberId && selectedMember && (
          <div className="hidden lg:block">
            <div className="mb-8 border-b border-border pb-6">
              <h2 className="text-lg font-medium">
                Agenda de {selectedMember.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {assignedDateCount}{" "}
                {assignedDateCount === 1
                  ? "fecha asignada"
                  : "fechas asignadas"}
              </p>
            </div>
            {upcomingDate && (
              <div className="mb-8 border border-foreground/20 rounded-md p-5">
                <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                  Próxima asignación
                </h3>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium">
                    {formatDateLong(upcomingDate)}
                    {today && (
                      <span className="ml-2 text-sm text-muted-foreground font-normal">
                        — {getRelativeLabel(upcomingDate, today)}
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {getNonDependentRolesForDate(upcomingDate)}
                    {hasDependentRoleOnDate(upcomingDate) && (
                      <span className="ml-2 text-foreground font-medium">
                        ★ {getDependentRoleNamesOnDate(upcomingDate).join(", ")}
                      </span>
                    )}
                  </span>
                </div>
                {noteMap.get(upcomingDate) && (
                  <p className="text-xs text-accent mt-2">
                    {noteMap.get(upcomingDate)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* View mode tabs (when member is selected) */}
        {filteredMemberId && (
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2.5 text-sm transition-colors ${
                viewMode === "list"
                  ? "border-b-2 border-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-4 py-2.5 text-sm transition-colors ${
                viewMode === "calendar"
                  ? "border-b-2 border-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Calendario
            </button>
          </div>
        )}

        {/* Mobile card view (list mode) */}
        <div className={`lg:hidden ${filteredMemberId && viewMode !== "list" ? "hidden" : "block"}`}>
          {displayDates.map((date, index) => {
            const isRehearsal = rehearsalSet.has(date);
            const entriesOnDate = filteredEntries.filter(
              (e) => e.date === date
            );
            const note = noteMap.get(date);
            const depRoleDate = hasDependentRoleOnDate(date);
            const relevantRoleDate = hasRelevantRoleOnDate(date);
            const highlighted = filteredMemberId && (depRoleDate || relevantRoleDate);
            const prevDate = index > 0 ? displayDates[index - 1] : null;
            const weekBreak = isNewWeek(date, prevDate);

            return (
              <div key={date}>
                {weekBreak && (
                  <div className="my-5" />
                )}
                {isRehearsal ? (
                  /* Rehearsal: simple non-collapsible row */
                  <div
                    className={`border-b border-border px-4 py-3.5 text-sm ${
                      isPast(date) ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{formatDateLong(date)}</span>
                      <span className="text-xs text-muted-foreground italic">
                        Ensayo
                      </span>
                    </div>
                    {note && (
                      <p className="text-xs text-accent mt-1">{note}</p>
                    )}
                  </div>
                ) : (
                  /* Normal date: collapsible card */
                  <div
                    className={`border-b border-border transition-all ${
                      isPast(date) ? "opacity-50" : ""
                    } ${highlighted ? "bg-muted/30" : ""}`}
                  >
                    <div
                      className="px-4 py-3.5 text-sm cursor-pointer select-none"
                      onClick={() => toggleExpanded(date)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {isDateExpanded(date) ? "▾" : "▸"}
                          </span>
                          <span className="font-medium">{formatDateLong(date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {depRoleDate && filteredMemberId && (
                            <span className="text-xs font-medium">
                              ★ {getDependentRoleNamesOnDate(date).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      {note && (
                        <p className="text-xs text-accent mt-1 ml-5">{note}</p>
                      )}
                    </div>
                    {isDateExpanded(date) && (
                      <div>
                        {filteredMemberId ? (
                          // Grouped roles for filtered member
                          <div className="px-4 py-3 text-sm border-t border-border/50">
                            <span className="text-muted-foreground">
                              {getRolesForDate(date)}
                            </span>
                          </div>
                        ) : (
                          roleOrder.map((role) => {
                            const roleEntries = entriesOnDate.filter(
                              (e) => e.roleId === role.id
                            );
                            if (roleEntries.length === 0) return null;
                            return (
                              <div
                                key={role.id}
                                className="flex justify-between px-4 py-2.5 text-sm border-t border-border/30"
                              >
                                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                                  {role.name}
                                </span>
                                <span className="font-medium text-right">
                                  {roleEntries
                                    .map((e) => e.memberName)
                                    .join(", ")}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Calendar grid view (when member is selected and calendar tab active) */}
        {filteredMemberId && viewMode === "calendar" && (
          <div className="max-w-md mx-auto">
            {(() => {
              // Build the full month grid
              const year = schedule.year;
              const month = schedule.month; // 1-based
              const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
              // Day of week for the 1st (0=Sun..6=Sat) -> convert to Mon-based (0=Mon..6=Sun)
              const firstDayDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
              const leadingBlanks = firstDayDow === 0 ? 6 : firstDayDow - 1;

              // Build a set of dates that have assignments for the filtered member
              const assignmentDateSet = new Set(
                filteredEntries.map((e) => e.date)
              );
              // Set of dates with relevant or dependent roles
              const highlightedDateSet = new Set<string>();
              for (const d of assignmentDateSet) {
                if (hasDependentRoleOnDate(d) || hasRelevantRoleOnDate(d)) {
                  highlightedDateSet.add(d);
                }
              }

              const dayHeaders = ["L", "M", "X", "J", "V", "S", "D"];

              return (
                <div>
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {dayHeaders.map((d) => (
                      <div
                        key={d}
                        className="text-center text-xs font-medium text-muted-foreground py-1"
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Leading blanks */}
                    {Array.from({ length: leadingBlanks }).map((_, i) => (
                      <div key={`blank-${i}`} />
                    ))}

                    {/* Actual days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                      const hasAssignment = assignmentDateSet.has(dateStr);
                      const isHighlighted = highlightedDateSet.has(dateStr);
                      const isRehearsalDay = rehearsalSet.has(dateStr);
                      const isToday = dateStr === today;
                      const past = isPast(dateStr);
                      const hasContent = hasAssignment || isRehearsalDay;

                      return (
                        <button
                          key={dayNum}
                          onClick={() => {
                            if (hasContent) setCalendarSelectedDate(dateStr);
                          }}
                          disabled={!hasContent}
                          className={[
                            "aspect-square rounded-md flex items-center justify-center text-sm transition-colors relative",
                            past ? "opacity-50" : "",
                            isToday ? "ring-1 ring-foreground" : "",
                            isHighlighted
                              ? "bg-foreground/15 font-semibold"
                              : hasAssignment
                                ? "bg-muted/50 font-medium"
                                : isRehearsalDay
                                  ? "border border-dashed border-border"
                                  : "text-muted-foreground",
                            hasContent ? "cursor-pointer hover:bg-muted/70 active:bg-muted" : "cursor-default",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {dayNum}
                          {isHighlighted && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Desktop table view */}
        <div className={`hidden lg:block overflow-x-auto ${filteredMemberId && viewMode === "calendar" ? "!hidden" : ""}`}>
          {filteredMemberId ? (
            // Simplified table for individual member
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Fecha
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Rol
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayDates.map((date, index) => {
                  const isRehearsal = rehearsalSet.has(date);
                  const note = noteMap.get(date);
                  const depRoleDate = hasDependentRoleOnDate(date);
                  const relevantRoleDate = hasRelevantRoleOnDate(date);
                  const highlighted = depRoleDate || relevantRoleDate;
                  const prevDate = index > 0 ? displayDates[index - 1] : null;
                  const weekBreak = isNewWeek(date, prevDate);

                  return (
                    <React.Fragment key={date}>
                      {weekBreak && (
                        <tr aria-hidden="true">
                          <td colSpan={2} className="h-5" />
                        </tr>
                      )}
                      <tr
                        className={[
                          "border-b border-border",
                          isRehearsal ? "bg-muted/20" : highlighted ? "bg-muted/30" : "",
                          isPast(date) ? "opacity-50" : "",
                          "hover:bg-muted/20 transition-colors",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <td
                          className={`px-4 py-4 text-sm ${
                            highlighted ? "border-l-2 border-l-foreground" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatDateLong(date)}</span>
                            {isRehearsal && (
                              <span className="text-xs text-muted-foreground italic">
                                Ensayo
                              </span>
                            )}
                            {depRoleDate && (
                              <span className="text-xs font-medium">
                                ★ {getDependentRoleNamesOnDate(date).join(", ")}
                              </span>
                            )}
                          </div>
                          {note && (
                            <div className="text-xs text-accent font-normal mt-0.5">
                              {note}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {isRehearsal ? (
                            <span className="text-muted-foreground italic">
                              Ensayo
                            </span>
                          ) : (
                            getRolesForDate(date)
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            // Full schedule table
            (() => {
              const visibleRoles = filteredRoleId
                ? roleOrder.filter((r) => r.id === filteredRoleId)
                : roleOrder;
              const tableDates = filteredRoleId ? filteredDates : allDates;
              return (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Fecha
                    </th>
                    {visibleRoles.map((role) => (
                      <th
                        key={role.id}
                        className="px-4 py-4 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground"
                      >
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableDates.map((date, index) => {
                    const isRehearsal = rehearsalSet.has(date);
                    const entriesOnDate = filteredEntries.filter(
                      (e) => e.date === date
                    );
                    const note = noteMap.get(date);
                    const prevDate = index > 0 ? tableDates[index - 1] : null;
                    const weekBreak = isNewWeek(date, prevDate);

                    return (
                      <React.Fragment key={date}>
                        {weekBreak && (
                          <tr aria-hidden="true">
                            <td colSpan={visibleRoles.length + 1} className="h-5" />
                          </tr>
                        )}
                        <tr
                          className={[
                            "border-b border-border",
                            isRehearsal ? "bg-muted/20" : "",
                            isPast(date) ? "opacity-50" : "",
                            "hover:bg-muted/20 transition-colors",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <td className="px-4 py-4 text-sm font-medium whitespace-nowrap">
                            <div>{formatDateShort(date)}</div>
                            {note && (
                              <div className="text-xs text-accent font-normal mt-0.5">
                                {note}
                              </div>
                            )}
                          </td>
                          {isRehearsal ? (
                            <td
                              colSpan={visibleRoles.length}
                              className="px-4 py-4 text-sm text-muted-foreground italic text-center"
                            >
                              Ensayo
                            </td>
                          ) : (
                            visibleRoles.map((role) => {
                              const roleEntries = entriesOnDate.filter(
                                (e) => e.roleId === role.id
                              );
                              return (
                                <td
                                  key={role.id}
                                  className="px-4 py-4 text-sm"
                                >
                                  {roleEntries.length === 0 ? (
                                    <span className="text-muted-foreground/40">
                                      —
                                    </span>
                                  ) : (
                                    roleEntries
                                      .map((e) => e.memberName)
                                      .join(", ")
                                  )}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              );
            })()
          )}
        </div>

        {displayDates.length === 0 && !upcomingDate && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {filteredMemberId
                ? "Este miembro no tiene asignaciones este mes."
                : hasActiveFilter
                  ? "No se encontraron asignaciones con los filtros seleccionados."
                  : "No se encontraron entradas."}
            </p>
          </div>
        )}
      </main>

      {/* Calendar day detail dialog */}
      {calendarSelectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setCalendarSelectedDate(null)}
        >
          <div
            className="bg-background border border-border rounded-lg w-full max-w-sm p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-medium capitalize">
                {formatDateLong(calendarSelectedDate)}
              </h3>
              <button
                onClick={() => setCalendarSelectedDate(null)}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none ml-3"
                aria-label="Cerrar"
              >
                &times;
              </button>
            </div>

            {rehearsalSet.has(calendarSelectedDate) ? (
              <p className="text-sm text-muted-foreground italic">Ensayo</p>
            ) : (
              <div className="space-y-2">
                {filteredEntries
                  .filter((e) => e.date === calendarSelectedDate)
                  .map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground text-xs uppercase tracking-wide">
                        {e.roleName}
                      </span>
                      {dependentRoleIdSet.has(e.roleId) && (
                        <span className="text-xs font-medium">★</span>
                      )}
                    </div>
                  ))}
                {filteredEntries.filter((e) => e.date === calendarSelectedDate).length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin asignaciones</p>
                )}
              </div>
            )}

            {noteMap.get(calendarSelectedDate) && (
              <p className="text-xs text-accent mt-3 pt-3 border-t border-border/50">
                {noteMap.get(calendarSelectedDate)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
