"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGroup } from "@/lib/group-context";

interface ScheduleEntry {
  id: number;
  scheduleId: number;
  date: string;
  roleId: number;
  memberId: number;
  memberName: string;
  roleName: string;
}

interface DateNote {
  id: number;
  scheduleId: number;
  date: string;
  description: string;
}

interface RoleInfo {
  id: number;
  name: string;
  requiredCount: number;
  displayOrder: number;
  dependsOnRoleId: number | null;
}

interface HolidayConflict {
  date: string;
  memberId: number;
  memberName: string;
}

interface ExtraDate {
  date: string;
  type: string;
}

interface AuditLogEntry {
  id: number;
  action: string;
  detail: string | null;
  userName: string | null;
  createdAt: string;
}

interface ScheduleDetail {
  id: number;
  month: number;
  year: number;
  status: string;
  entries: ScheduleEntry[];
  notes: DateNote[];
  rehearsalDates: string[];
  roles: RoleInfo[];
  prevScheduleId: number | null;
  nextScheduleId: number | null;
  holidayConflicts?: HolidayConflict[];
  extraDates?: ExtraDate[];
  auditLog?: AuditLogEntry[];
}

interface Member {
  id: number;
  name: string;
  roleIds: number[];
  availableDayIds: number[];
}

interface ScheduleDay {
  id: number;
  dayOfWeek: string;
  active: boolean;
  isRehearsal: boolean;
  groupId: number;
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

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Get the Spanish weekday name (capitalized, e.g. "Lunes") for a date string. */
function getDayOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const raw = date.toLocaleDateString("es-ES", {
    weekday: "long",
    timeZone: "UTC",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

interface AuditDetailStructured {
  message: string;
  changes?: { date: string; role: string; from: string | null; to: string | null }[];
  added?: { date: string; roleName: string; memberName: string }[];
  mode?: string;
  removedCount?: number;
}

function tryParseJson(str: string | null): AuditDetailStructured | null {
  if (!str) return null;
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === "object" && parsed !== null && "message" in parsed ? parsed : null;
  } catch {
    return null;
  }
}

function formatRelativeTime(isoStr: string): string {
  const now = Date.now();
  const then = new Date(isoStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "ayer";
  if (diffDays < 30) return `hace ${diffDays} dias`;
  return new Date(isoStr).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

// Key for the edit state map: "date|roleId|slotIndex"
function slotKey(date: string, roleId: number, slotIndex: number): string {
  return `${date}|${roleId}|${slotIndex}`;
}

export default function SchedulePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { groupId, slug, loading: groupLoading } = useGroup();
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const [showPastDates, setShowPastDates] = useState(false);

  // Add extra date form
  const [extraDateValue, setExtraDateValue] = useState("");
  const [extraDateType, setExtraDateType] = useState<"regular" | "rehearsal">("regular");
  const [showAddDate, setShowAddDate] = useState(false);

  // Rebuild flow
  const [rebuildOpen, setRebuildOpen] = useState(false);
  const [rebuildMode, setRebuildMode] = useState<"overwrite" | "fill_empty" | null>(null);
  const [rebuildPreview, setRebuildPreview] = useState<{ date: string; roleId: number; roleName: string; memberId: number; memberName: string }[] | null>(null);
  const [rebuildRemovedCount, setRebuildRemovedCount] = useState(0);
  const [rebuildLoading, setRebuildLoading] = useState(false);

  // Audit log
  const [logOpen, setLogOpen] = useState(false);
  const [logDetailOpen, setLogDetailOpen] = useState<number | null>(null);

  // Local editable state: slotKey -> memberId | null
  const [editState, setEditState] = useState<Map<string, number | null>>(
    new Map()
  );
  // Snapshot of the initial state from the server (to detect dirty)
  const [initialState, setInitialState] = useState<Map<string, number | null>>(
    new Map()
  );

  const fetchData = useCallback(async () => {
    if (!groupId) return;

    const [scheduleRes, membersRes, daysRes] = await Promise.all([
      fetch(`/api/schedules/${params.id}`),
      fetch(`/api/members?groupId=${groupId}`),
      fetch(`/api/configuration/days?groupId=${groupId}`),
    ]);

    if (!scheduleRes.ok) {
      router.push("/schedules");
      return;
    }

    const scheduleData: ScheduleDetail = await scheduleRes.json();
    setSchedule(scheduleData);
    setMembers(await membersRes.json());
    setScheduleDays(await daysRes.json());
    setLoading(false);
  }, [params.id, router, groupId]);

  useEffect(() => {
    if (groupId) fetchData();
  }, [groupId, fetchData]);

  // Derive roleOrder from schedule
  const roleOrder = useMemo(() => {
    if (!schedule) return [];
    const entryRoleIds = new Set(schedule.entries.map((e) => e.roleId));
    const dependentRoleIds = new Set(
      schedule.roles
        .filter((r) => r.dependsOnRoleId != null)
        .map((r) => r.id)
    );
    return schedule.roles
      .filter((r) => entryRoleIds.has(r.id) || dependentRoleIds.has(r.id))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [schedule]);

  const rehearsalSet = useMemo(
    () => new Set(schedule?.rehearsalDates ?? []),
    [schedule]
  );
  const conflictSet = useMemo(
    () =>
      new Set(
        (schedule?.holidayConflicts ?? []).map((c) => `${c.date}-${c.memberId}`)
      ),
    [schedule]
  );
  const noteMap = useMemo(
    () => new Map((schedule?.notes ?? []).map((n) => [n.date, n.description])),
    [schedule]
  );
  const extraDateSet = useMemo(
    () => new Set((schedule?.extraDates ?? []).map((d) => d.date)),
    [schedule]
  );
  const allDates = useMemo(() => {
    if (!schedule) return [];
    const entryDates = [...new Set(schedule.entries.map((e) => e.date))];
    const extraDates = (schedule.extraDates ?? []).map((d) => d.date);
    return [...new Set([...entryDates, ...schedule.rehearsalDates, ...extraDates])].sort();
  }, [schedule]);

  // Map dayOfWeek name -> scheduleDayId for availability lookups
  const dayOfWeekToId = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of scheduleDays) {
      map.set(d.dayOfWeek, d.id);
    }
    return map;
  }, [scheduleDays]);

  // Build edit state from schedule whenever schedule changes
  useEffect(() => {
    if (!schedule || roleOrder.length === 0) return;

    const state = new Map<string, number | null>();

    for (const date of allDates) {
      if (rehearsalSet.has(date)) continue;

      for (const role of roleOrder) {
        const roleEntries = schedule.entries
          .filter((e) => e.date === date && e.roleId === role.id)
          .sort((a, b) => a.id - b.id); // stable order by id

        const slotCount = Math.max(role.requiredCount, roleEntries.length);
        for (let i = 0; i < slotCount; i++) {
          const key = slotKey(date, role.id, i);
          state.set(key, roleEntries[i]?.memberId ?? null);
        }
      }
    }

    setEditState(new Map(state));
    setInitialState(new Map(state));
  }, [schedule, roleOrder, allDates, rehearsalSet]);

  // Check if there are unsaved changes
  const isDirty = useMemo(() => {
    if (editState.size !== initialState.size) return true;
    for (const [key, value] of editState) {
      if (initialState.get(key) !== value) return true;
    }
    return false;
  }, [editState, initialState]);

  const updateSlot = (date: string, roleId: number, slotIndex: number, memberId: number | null) => {
    setEditState((prev) => {
      const next = new Map(prev);
      next.set(slotKey(date, roleId, slotIndex), memberId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!schedule) return;
    setSaving(true);

    // Build entries array from editState
    const entries: Array<{ date: string; roleId: number; memberId: number | null }> = [];
    for (const [key, memberId] of editState) {
      const [date, roleIdStr] = key.split("|");
      entries.push({
        date,
        roleId: parseInt(roleIdStr, 10),
        memberId,
      });
    }

    await fetch(`/api/schedules/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk_update", entries }),
    });

    setSaving(false);
    fetchData();
  };

  const handleCommit = async () => {
    if (!confirm("¿Crear este cronograma? Se finalizará y se generará un enlace compartido."))
      return;

    const res = await fetch(`/api/schedules/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "commit" }),
    });

    if (res.ok) {
      fetchData();
    }
  };

  const handleAddExtraDate = async () => {
    if (!extraDateValue) return;
    const res = await fetch(`/api/schedules/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_date",
        date: extraDateValue,
        type: extraDateType,
      }),
    });
    if (res.ok) {
      setExtraDateValue("");
      setShowAddDate(false);
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || "Error al agregar fecha");
    }
  };

  const handleRemoveExtraDate = async (date: string) => {
    if (!confirm("¿Eliminar esta fecha adicional y sus asignaciones?")) return;
    const res = await fetch(`/api/schedules/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_extra_date", date }),
    });
    if (res.ok) fetchData();
  };

  const handleRebuildPreview = async (mode: "overwrite" | "fill_empty") => {
    setRebuildMode(mode);
    setRebuildLoading(true);
    setRebuildPreview(null);
    const res = await fetch(`/api/schedules/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rebuild_preview", mode }),
    });
    const data = await res.json();
    if (res.ok) {
      setRebuildPreview(data.preview);
      setRebuildRemovedCount(data.removedCount);
    } else {
      alert(data.error || "Error al generar vista previa");
      setRebuildOpen(false);
    }
    setRebuildLoading(false);
  };

  const handleRebuildApply = async () => {
    if (!rebuildMode) return;
    setRebuildLoading(true);
    const res = await fetch(`/api/schedules/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rebuild_apply", mode: rebuildMode }),
    });
    setRebuildLoading(false);
    if (res.ok) {
      setRebuildOpen(false);
      setRebuildPreview(null);
      setRebuildMode(null);
      fetchData();
    }
  };

  const closeRebuild = () => {
    setRebuildOpen(false);
    setRebuildPreview(null);
    setRebuildMode(null);
  };

  // Check if there are future dates for the rebuild button
  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);
  const hasFutureDates = allDates.some((d) => d >= todayISO);
  const hasPastDates = allDates.some((d) => d < todayISO);
  const visibleDates = useMemo(() => {
    if (showPastDates) return allDates;
    return allDates.filter((d) => d >= todayISO);
  }, [allDates, showPastDates, todayISO]);

  const startEditNote = (date: string) => {
    const existing = schedule?.notes.find((n) => n.date === date);
    setNoteText(existing?.description ?? "");
    setEditingNote(date);
  };

  const saveNote = async (date: string) => {
    if (noteText.trim()) {
      await fetch(`/api/schedules/${params.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, description: noteText.trim() }),
      });
    } else {
      await fetch(`/api/schedules/${params.id}/notes?date=${date}`, {
        method: "DELETE",
      });
    }
    setEditingNote(null);
    setNoteText("");
    fetchData();
  };

  if (groupLoading || loading || !schedule) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  // Helper: check if a member is available on a given date
  const isMemberAvailable = (member: Member, date: string): boolean => {
    // If the member has no availability configured at all, consider them available everywhere
    if (member.availableDayIds.length === 0) return true;
    const dayName = getDayOfWeek(date);
    const scheduleDayId = dayOfWeekToId.get(dayName);
    if (scheduleDayId == null) return true; // day not configured, allow
    return member.availableDayIds.includes(scheduleDayId);
  };

  // Helper: get eligible members for a role slot
  const getEligibleMembers = (date: string, role: RoleInfo): Member[] => {
    if (role.dependsOnRoleId != null) {
      // Dependent role: only members assigned to the source role on this date
      // who also have this dependent role in their roleIds
      const sourceEntryMemberIds: number[] = [];
      for (const sourceRole of roleOrder) {
        if (sourceRole.id === role.dependsOnRoleId) {
          const slotCount = Math.max(
            sourceRole.requiredCount,
            schedule.entries.filter(
              (e) => e.date === date && e.roleId === sourceRole.id
            ).length
          );
          for (let i = 0; i < slotCount; i++) {
            const mid = editState.get(slotKey(date, sourceRole.id, i));
            if (mid != null) sourceEntryMemberIds.push(mid);
          }
        }
      }
      return members.filter(
        (m) =>
          sourceEntryMemberIds.includes(m.id) &&
          m.roleIds.includes(role.id)
      );
    }
    // For extra dates, skip availability check — admin explicitly added the date
    const isExtra = extraDateSet.has(date);
    return members.filter(
      (m) => m.roleIds.includes(role.id) && (isExtra || isMemberAvailable(m, date))
    );
  };

  // Render a single select for a slot
  const renderSlotSelect = (
    date: string,
    role: RoleInfo,
    slotIndex: number,
    totalSlots?: number
  ) => {
    const key = slotKey(date, role.id, slotIndex);
    const currentMemberId = editState.get(key) ?? null;
    const eligible = getEligibleMembers(date, role);

    // Collect member IDs already selected in OTHER slots of the same role on the same date
    const takenByOtherSlots = new Set<number>();
    const slots = totalSlots ?? role.requiredCount;
    for (let i = 0; i < slots; i++) {
      if (i === slotIndex) continue;
      const otherId = editState.get(slotKey(date, role.id, i));
      if (otherId != null) takenByOtherSlots.add(otherId);
    }

    const options = eligible.filter(
      (m) => !takenByOtherSlots.has(m.id) || m.id === currentMemberId
    );

    const showConflict =
      currentMemberId != null && conflictSet.has(`${date}-${currentMemberId}`);

    return (
      <div key={key} className="w-full">
        <select
          className={`rounded-md border bg-transparent px-3 py-2 text-sm w-full ${
            showConflict
              ? "border-amber-500"
              : "border-border"
          }`}
          value={currentMemberId ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            updateSlot(date, role.id, slotIndex, val ? parseInt(val, 10) : null);
          }}
        >
          <option value="">— Vacío —</option>
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {showConflict && (
          <p className="text-xs text-amber-500 mt-0.5">⚠ En vacaciones</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {schedule.prevScheduleId && (
              <a
                href={`/${slug}/config/schedules/${schedule.prevScheduleId}`}
                className="rounded-md border border-border px-3 py-2 text-sm hover:border-foreground transition-colors"
              >
                ← Anterior
              </a>
            )}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl uppercase">
              {MONTH_NAMES[schedule.month - 1]} {schedule.year}
            </h1>
            {schedule.nextScheduleId && (
              <a
                href={`/${slug}/config/schedules/${schedule.nextScheduleId}`}
                className="rounded-md border border-border px-3 py-2 text-sm hover:border-foreground transition-colors"
              >
                Siguiente →
              </a>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {hasFutureDates && (
              <button
                onClick={() => setRebuildOpen(true)}
                disabled={isDirty}
                className="flex-1 sm:flex-none rounded-md border border-border px-4 py-2.5 text-sm hover:border-foreground transition-colors disabled:opacity-50"
                title={isDirty ? "Guarda los cambios primero" : "Reconstruir desde hoy"}
              >
                Reconstruir
              </button>
            )}
            {schedule.status === "draft" && (
              <button
                onClick={handleCommit}
                disabled={isDirty}
                className="flex-1 sm:flex-none rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                title={isDirty ? "Guarda los cambios primero" : undefined}
              >
                Crear cronograma
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {schedule.status === "committed" ? (
            <>
              Cronograma creado.{" "}
              <a
                href={`/${slug}/cronograma/${schedule.year}/${schedule.month}`}
                className="text-accent hover:opacity-80 transition-opacity"
              >
                Ver enlace compartido
              </a>
            </>
          ) : (
            "Borrador — revisa y edita antes de crear."
          )}
        </p>
      </div>

      {/* Add extra date + past dates toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAddDate(!showAddDate)}
          className="text-sm text-accent hover:opacity-80 transition-opacity"
        >
          {showAddDate ? "Cancelar" : "+ Agregar fecha"}
        </button>
        {hasPastDates && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPastDates}
              onChange={(e) => setShowPastDates(e.target.checked)}
              className="rounded border-border"
            />
            Mostrar fechas pasadas
          </label>
        )}
      </div>
      {showAddDate && (
          <div className="mt-3 flex flex-wrap items-end gap-3 border border-border rounded-md p-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Fecha</label>
              <input
                type="date"
                value={extraDateValue}
                onChange={(e) => setExtraDateValue(e.target.value)}
                min={`${schedule.year}-${String(schedule.month).padStart(2, "0")}-01`}
                max={`${schedule.year}-${String(schedule.month).padStart(2, "0")}-${new Date(Date.UTC(schedule.year, schedule.month, 0)).getUTCDate()}`}
                className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Tipo</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setExtraDateType("regular")}
                  className={`rounded-md px-3 py-2 text-sm border transition-colors ${
                    extraDateType === "regular"
                      ? "border-foreground text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Asignación
                </button>
                <button
                  onClick={() => setExtraDateType("rehearsal")}
                  className={`rounded-md px-3 py-2 text-sm border transition-colors ${
                    extraDateType === "rehearsal"
                      ? "border-foreground text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Ensayo
                </button>
              </div>
            </div>
            <button
              onClick={handleAddExtraDate}
              disabled={!extraDateValue}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        )}

      {/* Sticky save bar */}
      {isDirty && (
        <div className="sticky top-0 z-20 bg-background border-b border-border py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Hay cambios sin guardar.
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      )}

      {/* Mobile card view */}
      <div className="md:hidden space-y-4">
        {visibleDates.map((date) => {
          const isRehearsal = rehearsalSet.has(date);
          const note = noteMap.get(date);

          return (
            <div
              key={date}
              className={`border border-border rounded-md overflow-hidden ${isRehearsal ? "bg-muted/30" : "bg-background"}`}
            >
              {/* Date header */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{formatDate(date)}</span>
                    {extraDateSet.has(date) && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Extra</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isRehearsal && (
                      <span className="text-xs text-muted-foreground italic">Ensayo</span>
                    )}
                    {extraDateSet.has(date) && (
                      <button
                        onClick={() => handleRemoveExtraDate(date)}
                        className="text-xs text-destructive hover:opacity-80"
                        title="Eliminar fecha extra"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {/* Note editing */}
                {editingNote === date ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-xs"
                      placeholder="Agregar nota..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveNote(date);
                        if (e.key === "Escape") setEditingNote(null);
                      }}
                    />
                    <button
                      onClick={() => saveNote(date)}
                      className="text-xs text-accent px-2 py-1.5 hover:opacity-80 transition-opacity"
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <div className="mt-1">
                    {note ? (
                      <span
                        className="text-xs text-accent cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => startEditNote(date)}
                      >
                        {note}
                      </span>
                    ) : (
                      <button
                        onClick={() => startEditNote(date)}
                        className="text-xs text-muted-foreground hover:text-accent transition-colors"
                      >
                        + nota
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Role entries */}
              {isRehearsal ? (
                <div className="px-4 py-3 text-sm text-muted-foreground italic text-center">
                  Ensayo
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {roleOrder.map((role) => {
                    const existingEntries = schedule.entries.filter(
                      (e) => e.date === date && e.roleId === role.id
                    );
                    const slotCount = Math.max(role.requiredCount, existingEntries.length);

                    return (
                      <div key={role.id} className="px-4 py-3">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
                          {role.name}
                        </div>
                        <div className={slotCount > 1 ? "grid grid-cols-2 gap-2" : ""}>
                          {Array.from({ length: slotCount }).map((_, i) =>
                            renderSlotSelect(date, role, i, slotCount)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Fecha
              </th>
              {roleOrder.map((role) => (
                <th
                  key={role.id}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground"
                >
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleDates.map((date) => {
              const isRehearsal = rehearsalSet.has(date);
              const note = noteMap.get(date);

              return (
                <tr
                  key={date}
                  className={`border-b border-border ${isRehearsal ? "bg-muted/20" : "hover:bg-muted/30"} transition-colors`}
                >
                  <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {formatDate(date)}
                      {isRehearsal && (
                        <span className="text-xs text-muted-foreground italic">
                          Ensayo
                        </span>
                      )}
                      {extraDateSet.has(date) && (
                        <>
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Extra</span>
                          <button
                            onClick={() => handleRemoveExtraDate(date)}
                            className="text-xs text-destructive hover:opacity-80"
                            title="Eliminar fecha extra"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                    {editingNote === date ? (
                      <div className="mt-1.5 flex gap-1">
                        <input
                          type="text"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-xs"
                          placeholder="Agregar nota..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveNote(date);
                            if (e.key === "Escape") setEditingNote(null);
                          }}
                        />
                        <button
                          onClick={() => saveNote(date)}
                          className="text-xs text-accent hover:opacity-80 transition-opacity"
                        >
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <div className="mt-0.5">
                        {note ? (
                          <span
                            className="text-xs text-accent cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => startEditNote(date)}
                          >
                            {note}
                          </span>
                        ) : (
                          <button
                            onClick={() => startEditNote(date)}
                            className="text-xs text-muted-foreground hover:text-accent transition-colors"
                          >
                            + nota
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  {isRehearsal ? (
                    <td
                      colSpan={roleOrder.length}
                      className="px-4 py-3 text-sm text-muted-foreground italic text-center"
                    >
                      Ensayo
                    </td>
                  ) : (
                    roleOrder.map((role) => {
                      const existingEntries = schedule.entries.filter(
                        (e) => e.date === date && e.roleId === role.id
                      );
                      const slotCount = Math.max(role.requiredCount, existingEntries.length);

                      return (
                        <td key={role.id} className="px-4 py-3 text-sm">
                          <div className={slotCount > 1 ? "grid grid-cols-2 gap-1.5" : ""}>
                            {Array.from({ length: slotCount }).map((_, i) =>
                              renderSlotSelect(date, role, i, slotCount)
                            )}
                          </div>
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

      {/* Audit log */}
      {schedule.auditLog && schedule.auditLog.length > 0 && (
        <div className="border border-border rounded-md">
          <button
            onClick={() => setLogOpen(!logOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Historial de cambios ({schedule.auditLog.length})</span>
            <span className="text-xs">{logOpen ? "▲" : "▼"}</span>
          </button>
          {logOpen && (
            <div className="border-t border-border divide-y divide-border">
              {schedule.auditLog.map((entry) => {
                const parsed = tryParseJson(entry.detail);
                const isStructured = parsed && (parsed.changes || parsed.added);

                return (
                  <div key={entry.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm">
                          {isStructured ? parsed.message : (entry.detail ?? entry.action)}
                        </p>
                        {entry.userName && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            por {entry.userName}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                    </div>
                    {isStructured && (
                      <div className="mt-1">
                        <button
                          onClick={() => setLogDetailOpen(logDetailOpen === entry.id ? null : entry.id)}
                          className="text-xs text-accent hover:opacity-80 transition-opacity"
                        >
                          {logDetailOpen === entry.id ? "Ocultar detalles" : "Ver detalles"}
                        </button>
                        {logDetailOpen === entry.id && (
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {parsed.changes?.map((c, i) => (
                              <div key={i} className="flex gap-2">
                                <span className="shrink-0">{c.date}</span>
                                <span className="shrink-0 uppercase tracking-wide">{c.role}</span>
                                <span>
                                  {c.from ?? "—"} → {c.to ?? "—"}
                                </span>
                              </div>
                            ))}
                            {parsed.added && (
                              <>
                                {(parsed.removedCount ?? 0) > 0 && (
                                  <p>{parsed.removedCount} asignacion{parsed.removedCount === 1 ? "" : "es"} reemplazada{parsed.removedCount === 1 ? "" : "s"}</p>
                                )}
                                {parsed.added.map((a, i) => (
                                  <div key={i} className="flex gap-2">
                                    <span className="shrink-0">{a.date}</span>
                                    <span className="shrink-0 uppercase tracking-wide">{a.roleName}</span>
                                    <span>{a.memberName}</span>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {!schedule.auditLog?.length && (
        <div className="text-sm text-muted-foreground text-center py-4">
          Sin cambios registrados.
        </div>
      )}

      {/* Rebuild modal */}
      {rebuildOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-border rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-[family-name:var(--font-display)] text-lg uppercase">
                Reconstruir cronograma
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Regenerar asignaciones desde hoy hasta fin de mes.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {!rebuildMode && (
                <div className="space-y-3">
                  <button
                    onClick={() => handleRebuildPreview("overwrite")}
                    className="w-full rounded-md border border-border p-4 text-left hover:border-foreground transition-colors"
                  >
                    <p className="text-sm font-medium">Regenerar todo desde hoy</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reemplaza todas las asignaciones futuras con nuevas generadas por el algoritmo.
                    </p>
                  </button>
                  <button
                    onClick={() => handleRebuildPreview("fill_empty")}
                    className="w-full rounded-md border border-border p-4 text-left hover:border-foreground transition-colors"
                  >
                    <p className="text-sm font-medium">Solo llenar vacíos desde hoy</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mantiene las asignaciones existentes y solo llena los espacios vacíos.
                    </p>
                  </button>
                </div>
              )}

              {rebuildLoading && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Generando vista previa...
                </p>
              )}

              {rebuildPreview && !rebuildLoading && (
                <div className="space-y-4">
                  {rebuildRemovedCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Se reemplazarán {rebuildRemovedCount} asignaciones existentes.
                    </p>
                  )}
                  {rebuildPreview.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No hay asignaciones nuevas para generar.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {(() => {
                        const grouped = new Map<string, typeof rebuildPreview>();
                        for (const entry of rebuildPreview!) {
                          const list = grouped.get(entry.date) ?? [];
                          list.push(entry);
                          grouped.set(entry.date, list);
                        }
                        return [...grouped.entries()].map(([date, entries]) => (
                          <div key={date} className="py-3 first:pt-0">
                            <p className="text-sm font-medium mb-1.5">{formatDate(date)}</p>
                            <div className="space-y-1">
                              {entries.map((e, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground text-xs uppercase tracking-wide">{e.roleName}</span>
                                  <span>{e.memberName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button
                onClick={closeRebuild}
                className="rounded-md border border-border px-4 py-2 text-sm hover:border-foreground transition-colors"
              >
                Cancelar
              </button>
              {rebuildPreview && rebuildPreview.length > 0 && (
                <button
                  onClick={handleRebuildApply}
                  disabled={rebuildLoading}
                  className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {rebuildLoading ? "Aplicando..." : "Aplicar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
