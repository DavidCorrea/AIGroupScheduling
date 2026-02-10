"use client";

import { useEffect, useState, useCallback } from "react";
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

export default function SchedulePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { groupId, slug, loading: groupLoading } = useGroup();
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState<{
    entryId: number;
    roleId: number;
  } | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const fetchData = useCallback(async () => {
    if (!groupId) return;

    const [scheduleRes, membersRes] = await Promise.all([
      fetch(`/api/schedules/${params.id}`),
      fetch(`/api/members?groupId=${groupId}`),
    ]);

    if (!scheduleRes.ok) {
      router.push("/schedules");
      return;
    }

    setSchedule(await scheduleRes.json());
    setMembers(await membersRes.json());
    setLoading(false);
  }, [params.id, router, groupId]);

  useEffect(() => {
    if (groupId) fetchData();
  }, [groupId, fetchData]);

  const handleSwap = async (entryId: number, newMemberId: number) => {
    await fetch(`/api/schedules/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "swap",
        entryId,
        newMemberId,
      }),
    });
    setSwapping(null);
    fetchData();
  };

  const handleRemove = async (entryId: number) => {
    await fetch(`/api/schedules/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", entryId }),
    });
    setSwapping(null);
    fetchData();
  };

  const handleAssign = async (date: string, roleId: number, memberId: number | null) => {
    if (memberId === null) {
      // Unassign: find the existing entry for this dependent role on this date
      const entry = schedule?.entries.find(
        (e) => e.date === date && e.roleId === roleId
      );
      if (entry) {
        await fetch(`/api/schedules/${params.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unassign", entryId: entry.id }),
        });
      }
    } else {
      await fetch(`/api/schedules/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", date, roleId, memberId }),
      });
    }
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

  // Group entries by date, also include rehearsal dates
  const entryDates = [...new Set(schedule.entries.map((e) => e.date))];
  const allDates = [...new Set([...entryDates, ...schedule.rehearsalDates])].sort();

  // Get unique roles ordered by displayOrder
  // Include both roles with entries AND dependent roles (which may have no entries yet)
  const entryRoleIds = new Set(schedule.entries.map((e) => e.roleId));
  const dependentRoleIds = new Set(
    (schedule.roles ?? [])
      .filter((r) => r.dependsOnRoleId != null)
      .map((r) => r.id)
  );
  const roleOrder = (schedule.roles ?? [])
    .filter((r) => entryRoleIds.has(r.id) || dependentRoleIds.has(r.id))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((r) => ({ id: r.id, name: r.name, dependsOnRoleId: r.dependsOnRoleId }));

  const noteMap = new Map(schedule.notes.map((n) => [n.date, n.description]));
  const rehearsalSet = new Set(schedule.rehearsalDates);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {schedule.prevScheduleId && (
            <a
              href={`/${slug}/config/schedules/${schedule.prevScheduleId}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              ← Anterior
            </a>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {MONTH_NAMES[schedule.month - 1]} {schedule.year}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {schedule.status === "committed" ? (
                <>
                  Cronograma creado.{" "}
                  <a
                    href={`/${slug}/cronograma/${schedule.year}/${schedule.month}`}
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    Ver enlace compartido
                  </a>
                </>
              ) : (
                "Borrador — revisa y edita antes de crear."
              )}
            </p>
          </div>
          {schedule.nextScheduleId && (
            <a
              href={`/${slug}/config/schedules/${schedule.nextScheduleId}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Siguiente →
            </a>
          )}
        </div>
        {schedule.status === "draft" && (
          <button
            onClick={handleCommit}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-110 transition-all"
          >
            Crear cronograma
          </button>
        )}
      </div>

      {/* Schedule grid */}
      <div className="overflow-x-auto rounded-xl border border-border/50 shadow-[0_1px_3px_var(--shadow-color)]">
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
            {allDates.map((date, dateIndex) => {
              const isRehearsal = rehearsalSet.has(date);
              const entriesOnDate = schedule.entries.filter(
                (e) => e.date === date
              );
              const note = noteMap.get(date);

              return (
                <tr
                  key={date}
                  className={`${isRehearsal ? "bg-muted/30" : dateIndex % 2 === 0 ? "bg-card" : "bg-muted/10"} hover:bg-accent/30 transition-colors`}
                >
                  <td className="border-b border-r border-border/30 px-4 py-3 text-sm font-medium whitespace-nowrap">
                    <div>
                      {formatDate(date)}
                      {isRehearsal && (
                        <span className="ml-2 text-xs text-muted-foreground italic">
                          Ensayo
                        </span>
                      )}
                    </div>
                    {/* Date note */}
                    {editingNote === date ? (
                      <div className="mt-1.5 flex gap-1">
                        <input
                          type="text"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                          placeholder="Agregar nota..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveNote(date);
                            if (e.key === "Escape") setEditingNote(null);
                          }}
                        />
                        <button
                          onClick={() => saveNote(date)}
                          className="text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <div className="mt-0.5">
                        {note ? (
                          <span
                            className="text-xs text-primary cursor-pointer hover:text-primary/80 transition-colors"
                            onClick={() => startEditNote(date)}
                          >
                            {note}
                          </span>
                        ) : (
                          <button
                            onClick={() => startEditNote(date)}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
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
                      className="border-b border-border/30 px-4 py-3 text-sm text-muted-foreground italic text-center"
                    >
                      Ensayo
                    </td>
                  ) : (
                    roleOrder.map((role) => {
                      const roleEntries = entriesOnDate.filter(
                        (e) => e.roleId === role.id
                      );
                      const isDependentRole = role.dependsOnRoleId != null;

                      // For dependent roles, show a dropdown of source role members
                      if (isDependentRole) {
                        const sourceMembers = entriesOnDate
                          .filter((e) => e.roleId === role.dependsOnRoleId)
                          .filter((e) => {
                            const member = members.find((m) => m.id === e.memberId);
                            return member?.roleIds.includes(role.id);
                          });
                        const currentEntry = roleEntries[0] ?? null;
                        return (
                          <td
                            key={role.id}
                            className="border-b border-r border-border/30 px-4 py-3 text-sm"
                          >
                            <select
                              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm w-full"
                              value={currentEntry?.memberId ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleAssign(
                                  date,
                                  role.id,
                                  val ? parseInt(val, 10) : null
                                );
                              }}
                            >
                              <option value="">Seleccionar...</option>
                              {sourceMembers.map((sm) => (
                                <option key={sm.memberId} value={sm.memberId}>
                                  {sm.memberName}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={role.id}
                          className="border-b border-r border-border/30 px-4 py-3 text-sm"
                        >
                          {roleEntries.length === 0 ? (
                            <span className="text-muted-foreground/50">
                              —
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {roleEntries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="flex items-center gap-1"
                                >
                                  {swapping?.entryId === entry.id ? (
                                    <select
                                      autoFocus
                                      className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                                      defaultValue=""
                                      onChange={(e) => {
                                        if (e.target.value === "__remove__") {
                                          handleRemove(entry.id);
                                        } else if (e.target.value) {
                                          handleSwap(
                                            entry.id,
                                            parseInt(e.target.value, 10)
                                          );
                                        }
                                      }}
                                      onBlur={() => setSwapping(null)}
                                    >
                                      <option value="">Seleccionar...</option>
                                      <option value="__remove__">— Vaciar —</option>
                                      {members
                                        .filter((m) =>
                                          m.roleIds.includes(role.id)
                                        )
                                        .map((m) => (
                                          <option key={m.id} value={m.id}>
                                            {m.name}
                                          </option>
                                        ))}
                                    </select>
                                  ) : (
                                    <>
                                      <span>{entry.memberName}</span>
                                      <button
                                        onClick={() =>
                                          setSwapping({
                                            entryId: entry.id,
                                            roleId: role.id,
                                          })
                                        }
                                        className="text-xs text-primary hover:text-primary/80 ml-1 transition-colors"
                                        title="Cambiar miembro"
                                      >
                                        cambiar
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
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
    </div>
  );
}
