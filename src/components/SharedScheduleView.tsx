"use client";

import { useEffect, useState } from "react";

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
  const [filteredMemberId, setFilteredMemberId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [today, setToday] = useState("");
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [dayFilter, setDayFilter] = useState("");
  const [showPastDates, setShowPastDates] = useState(false);

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

  // Filter entries if a member is selected
  const filteredEntries = filteredMemberId
    ? schedule.entries.filter((e) => e.memberId === filteredMemberId)
    : schedule.entries;

  const filteredDates = filteredMemberId
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
  // (used in the upcoming assignment section to avoid duplicating dependent roles shown with star)
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

  // Helper: toggle collapsed state for a date (mobile cards)
  const toggleCollapsed = (date: string) => {
    setCollapsedDates((prev) => {
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card shadow-[0_1px_3px_var(--shadow-color)] sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {schedule.prevSchedule && (
                <a
                  href={`${basePath}/${schedule.prevSchedule.year}/${schedule.prevSchedule.month}`}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                  title={`${MONTH_NAMES[schedule.prevSchedule.month - 1]} ${schedule.prevSchedule.year}`}
                >
                  ← Anterior
                </a>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {MONTH_NAMES[schedule.month - 1]} {schedule.year}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">Agenda del Grupo</p>
              </div>
              {schedule.nextSchedule && (
                <a
                  href={`${basePath}/${schedule.nextSchedule.year}/${schedule.nextSchedule.month}`}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                  title={`${MONTH_NAMES[schedule.nextSchedule.month - 1]} ${schedule.nextSchedule.year}`}
                >
                  Siguiente →
                </a>
              )}
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="self-start sm:self-auto rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
              aria-label="Cambiar modo"
            >
              <span className="text-base leading-none">{darkMode ? "☀️" : "🌙"}</span>
              <span>{darkMode ? "Claro" : "Oscuro"}</span>
            </button>
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
              className="w-full sm:w-auto rounded-lg border border-border bg-background px-3.5 py-2 text-sm"
            >
              <option value="">Todas las personas</option>
              {schedule.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-border bg-background px-3.5 py-2 text-sm capitalize"
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
                className="rounded border-border accent-primary"
              />
              <span className="text-muted-foreground">Mostrar fechas pasadas</span>
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Filtered member view header */}
        {filteredMemberId && selectedMember && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-[0_1px_3px_var(--shadow-color)]">
            <h2 className="text-lg font-semibold">
              Agenda de {selectedMember.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {assignedDateCount}{" "}
              {assignedDateCount === 1
                ? "fecha asignada"
                : "fechas asignadas"}
            </p>
          </div>
        )}

        {/* Upcoming assignment for filtered member */}
        {filteredMemberId && selectedMember && upcomingDate && (
          <div className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-5 shadow-[0_2px_8px_var(--shadow-color)]">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              Próxima asignación
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="font-semibold">
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
                  <span className="ml-2 text-primary font-semibold">
                    ★ {getDependentRoleNamesOnDate(upcomingDate).join(", ")}
                  </span>
                )}
              </span>
            </div>
            {noteMap.get(upcomingDate) && (
              <p className="text-xs text-primary mt-2">
                {noteMap.get(upcomingDate)}
              </p>
            )}
          </div>
        )}

        {/* Mobile card view */}
        <div className="block lg:hidden space-y-3">
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
                  <div className="border-t border-border/40 my-4" />
                )}
                <div
                  className={`rounded-xl overflow-hidden shadow-[0_1px_3px_var(--shadow-color)] transition-all ${
                    isPast(date) ? "opacity-50" : ""
                  } ${
                    isRehearsal
                      ? "border border-border/30 bg-muted/20"
                      : highlighted
                        ? "border border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                        : "border border-border/40 bg-card"
                  }`}
                >
                  <div
                    className={`px-4 py-3 text-sm cursor-pointer select-none ${
                      highlighted
                        ? "bg-primary/10"
                        : isRehearsal
                          ? "bg-muted/30"
                          : "bg-muted/40"
                    }`}
                    onClick={() => toggleCollapsed(date)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground/60">
                          {collapsedDates.has(date) ? "▸" : "▾"}
                        </span>
                        <span className="font-medium">{formatDateLong(date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isRehearsal && (
                          <span className="text-xs text-muted-foreground italic">
                            Ensayo
                          </span>
                        )}
                        {depRoleDate && filteredMemberId && (
                          <span className="text-xs font-semibold text-primary">
                            ★ {getDependentRoleNamesOnDate(date).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    {note && (
                      <p className="text-xs text-primary mt-1 ml-5">{note}</p>
                    )}
                  </div>
                  {!collapsedDates.has(date) && (
                    <>
                      {isRehearsal ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground italic text-center">
                          Ensayo
                        </div>
                      ) : (
                        <div className="divide-y divide-border/30">
                          {filteredMemberId ? (
                            // Grouped roles for filtered member
                            <div className="px-4 py-3 text-sm">
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
                                  className="flex justify-between px-4 py-3 text-sm"
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
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table view */}
        <div className="hidden lg:block overflow-x-auto">
          {filteredMemberId ? (
            // Simplified table for individual member
            <div className="rounded-xl border border-border/50 overflow-hidden shadow-[0_1px_3px_var(--shadow-color)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border-b border-border/50 bg-muted/50 px-4 py-3 text-left text-sm font-semibold">
                      Fecha
                    </th>
                    <th className="border-b border-border/50 bg-muted/50 px-4 py-3 text-left text-sm font-semibold">
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
                      <tr
                        key={date}
                        className={[
                          isRehearsal
                            ? "bg-muted/20"
                            : highlighted
                              ? "bg-primary/5"
                              : index % 2 === 0
                                ? "bg-card"
                                : "bg-muted/10",
                          isPast(date) ? "opacity-50" : "",
                          weekBreak ? "border-t-2 border-t-border/40" : "",
                          "hover:bg-accent/30 transition-colors",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <td
                          className={`border-b border-border/30 px-4 py-3 text-sm ${
                            highlighted ? "border-l-4 border-l-primary" : ""
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
                              <span className="text-xs font-semibold text-primary">
                                ★ {getDependentRoleNamesOnDate(date).join(", ")}
                              </span>
                            )}
                          </div>
                          {note && (
                            <div className="text-xs text-primary font-normal mt-0.5">
                              {note}
                            </div>
                          )}
                        </td>
                        <td className="border-b border-border/30 px-4 py-3 text-sm">
                          {isRehearsal ? (
                            <span className="text-muted-foreground italic">
                              Ensayo
                            </span>
                          ) : (
                            getRolesForDate(date)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            // Full schedule table
            <div className="rounded-xl border border-border/50 overflow-hidden shadow-[0_1px_3px_var(--shadow-color)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border-b border-r border-border/50 bg-muted/50 px-4 py-3 text-left text-sm font-semibold">
                      Fecha
                    </th>
                    {roleOrder.map((role) => (
                      <th
                        key={role.id}
                        className="border-b border-r border-border/50 bg-muted/50 px-4 py-3 text-left text-sm font-semibold"
                      >
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allDates.map((date, index) => {
                    const isRehearsal = rehearsalSet.has(date);
                    const entriesOnDate = schedule.entries.filter(
                      (e) => e.date === date
                    );
                    const note = noteMap.get(date);
                    const prevDate = index > 0 ? allDates[index - 1] : null;
                    const weekBreak = isNewWeek(date, prevDate);

                    return (
                      <tr
                        key={date}
                        className={[
                          isRehearsal
                            ? "bg-muted/20"
                            : index % 2 === 0
                              ? "bg-card"
                              : "bg-muted/10",
                          isPast(date) ? "opacity-50" : "",
                          weekBreak ? "border-t-2 border-t-border/40" : "",
                          "hover:bg-accent/30 transition-colors",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <td className="border-b border-r border-border/30 px-4 py-3 text-sm font-medium whitespace-nowrap">
                          <div>{formatDateShort(date)}</div>
                          {note && (
                            <div className="text-xs text-primary font-normal mt-0.5">
                              {note}
                            </div>
                          )}
                        </td>
                        {isRehearsal ? (
                          <td
                            colSpan={roleOrder.length}
                            className="border-b border-border/30 px-4 py-3 text-sm text-muted-foreground italic text-center"
                          >
                            Ensayo
                          </td>
                        ) : (
                          roleOrder.map((role) => {
                            const roleEntries = entriesOnDate.filter(
                              (e) => e.roleId === role.id
                            );
                            return (
                              <td
                                key={role.id}
                                className="border-b border-r border-border/30 px-4 py-3 text-sm"
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {displayDates.length === 0 && !upcomingDate && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {filteredMemberId
                ? "Este miembro no tiene asignaciones este mes."
                : "No se encontraron entradas."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
