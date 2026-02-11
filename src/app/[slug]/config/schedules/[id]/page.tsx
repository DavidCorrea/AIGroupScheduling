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
  const noteMap = useMemo(
    () => new Map((schedule?.notes ?? []).map((n) => [n.date, n.description])),
    [schedule]
  );
  const allDates = useMemo(() => {
    if (!schedule) return [];
    const entryDates = [...new Set(schedule.entries.map((e) => e.date))];
    return [...new Set([...entryDates, ...schedule.rehearsalDates])].sort();
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
    // Regular role: members that have this role AND are available on this day
    return members.filter(
      (m) => m.roleIds.includes(role.id) && isMemberAvailable(m, date)
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

    return (
      <select
        key={key}
        className="rounded-md border border-border bg-transparent px-3 py-2 text-sm w-full"
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
        {allDates.map((date) => {
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
                  <span className="font-medium text-sm">{formatDate(date)}</span>
                  {isRehearsal && (
                    <span className="text-xs text-muted-foreground italic">Ensayo</span>
                  )}
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
            {allDates.map((date) => {
              const isRehearsal = rehearsalSet.has(date);
              const note = noteMap.get(date);

              return (
                <tr
                  key={date}
                  className={`border-b border-border ${isRehearsal ? "bg-muted/20" : "hover:bg-muted/30"} transition-colors`}
                >
                  <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                    <div>
                      {formatDate(date)}
                      {isRehearsal && (
                        <span className="ml-2 text-xs text-muted-foreground italic">
                          Ensayo
                        </span>
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
    </div>
  );
}
