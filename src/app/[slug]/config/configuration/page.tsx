"use client";

import { useEffect, useState, useCallback } from "react";
import { useGroup } from "@/lib/group-context";

function PriorityEditor({
  roles,
  existingPriorities,
  onSave,
}: {
  roles: Role[];
  existingPriorities: DayRolePriority[];
  onSave: (priorities: { roleId: number; priority: number }[]) => void;
}) {
  const [orderedRoles, setOrderedRoles] = useState(() => {
    if (existingPriorities.length > 0) {
      return roles
        .map((r) => ({
          ...r,
          priority:
            existingPriorities.find((p) => p.roleId === r.id)?.priority ??
            roles.length,
        }))
        .sort((a, b) => a.priority - b.priority);
    }
    return roles.map((r, i) => ({ ...r, priority: i }));
  });

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...orderedRoles];
    [newOrder[index - 1], newOrder[index]] = [
      newOrder[index],
      newOrder[index - 1],
    ];
    setOrderedRoles(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === orderedRoles.length - 1) return;
    const newOrder = [...orderedRoles];
    [newOrder[index], newOrder[index + 1]] = [
      newOrder[index + 1],
      newOrder[index],
    ];
    setOrderedRoles(newOrder);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-2">
        Reordena los roles usando las flechas. El rol superior se llena primero.
      </p>
      {orderedRoles.map((role, index) => (
        <div
          key={role.id}
          className="flex items-center gap-2 border-b border-border px-3.5 py-2 text-sm last:border-b-0"
        >
          <span className="text-muted-foreground w-6 text-right text-xs">
            {index + 1}.
          </span>
          <span className="flex-1">{role.name}</span>
          <button
            onClick={() => moveUp(index)}
            disabled={index === 0}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            ↑
          </button>
          <button
            onClick={() => moveDown(index)}
            disabled={index === orderedRoles.length - 1}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            ↓
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onSave(orderedRoles.map((r, i) => ({ roleId: r.id, priority: i })))
        }
        className="mt-2 w-full sm:w-auto rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Guardar orden
      </button>
    </div>
  );
}

function ColumnOrderEditor({
  roles,
  onSave,
}: {
  roles: Role[];
  onSave: (order: { id: number; displayOrder: number }[]) => void;
}) {
  const [orderedRoles, setOrderedRoles] = useState(() =>
    [...roles].sort((a, b) => a.displayOrder - b.displayOrder)
  );

  useEffect(() => {
    setOrderedRoles([...roles].sort((a, b) => a.displayOrder - b.displayOrder));
  }, [roles]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...orderedRoles];
    [newOrder[index - 1], newOrder[index]] = [
      newOrder[index],
      newOrder[index - 1],
    ];
    setOrderedRoles(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === orderedRoles.length - 1) return;
    const newOrder = [...orderedRoles];
    [newOrder[index], newOrder[index + 1]] = [
      newOrder[index + 1],
      newOrder[index],
    ];
    setOrderedRoles(newOrder);
  };

  return (
    <div className="space-y-2">
      {orderedRoles.map((role, index) => (
        <div
          key={role.id}
          className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm last:border-b-0"
        >
          <span className="text-muted-foreground w-6 text-right text-xs">
            {index + 1}.
          </span>
          <span className="flex-1 font-medium">{role.name}</span>
          <button
            onClick={() => moveUp(index)}
            disabled={index === 0}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            ↑
          </button>
          <button
            onClick={() => moveDown(index)}
            disabled={index === orderedRoles.length - 1}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            ↓
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onSave(orderedRoles.map((r, i) => ({ id: r.id, displayOrder: i })))
        }
        className="mt-2 w-full sm:w-auto rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Guardar orden
      </button>
    </div>
  );
}

interface Role {
  id: number;
  name: string;
  requiredCount: number;
  displayOrder: number;
  dependsOnRoleId: number | null;
  exclusiveGroup: string | null;
}

interface ScheduleDay {
  id: number;
  dayOfWeek: string;
  active: boolean;
  isRehearsal: boolean;
}

interface DayRolePriority {
  id: number;
  scheduleDayId: number;
  roleId: number;
  priority: number;
  dayOfWeek: string;
  roleName: string;
}

interface MemberOption {
  id: number;
  name: string;
}

interface MemberHoliday {
  id: number;
  memberId: number;
  memberName: string;
  startDate: string;
  endDate: string;
  description: string | null;
}

export default function ConfigurationPage() {
  const { groupId, loading: groupLoading } = useGroup();
  const [roles, setRoles] = useState<Role[]>([]);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [priorities, setPriorities] = useState<DayRolePriority[]>([]);
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [memberHolidays, setMemberHolidays] = useState<MemberHoliday[]>([]);
  const [loading, setLoading] = useState(true);

  // Priority editing
  const [editingPriorityDay, setEditingPriorityDay] = useState<number | null>(
    null
  );

  // Holiday form state
  const [holidayMemberId, setHolidayMemberId] = useState<number | "">("");
  const [holidayStart, setHolidayStart] = useState("");
  const [holidayEnd, setHolidayEnd] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");
  const [holidayError, setHolidayError] = useState("");

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    const [rolesRes, daysRes, prioritiesRes, membersRes, holidaysRes] = await Promise.all([
      fetch(`/api/configuration/roles?groupId=${groupId}`),
      fetch(`/api/configuration/days?groupId=${groupId}`),
      fetch(`/api/configuration/priorities?groupId=${groupId}`),
      fetch(`/api/members?groupId=${groupId}`),
      fetch(`/api/configuration/holidays?groupId=${groupId}`),
    ]);
    setRoles(await rolesRes.json());
    setDays(await daysRes.json());
    setPriorities(await prioritiesRes.json());
    const membersData = await membersRes.json();
    setMemberOptions(membersData.map((m: { id: number; name: string }) => ({ id: m.id, name: m.name })));
    setMemberHolidays(await holidaysRes.json());
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (groupId) fetchData();
  }, [groupId, fetchData]);

  const toggleDay = async (day: ScheduleDay) => {
    await fetch(`/api/configuration/days?groupId=${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: day.id, active: !day.active }),
    });
    fetchData();
  };

  const toggleRehearsal = async (day: ScheduleDay) => {
    await fetch(`/api/configuration/days?groupId=${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: day.id, isRehearsal: !day.isRehearsal }),
    });
    fetchData();
  };

  const savePriorities = async (
    scheduleDayId: number,
    rolePriorities: { roleId: number; priority: number }[]
  ) => {
    await fetch(`/api/configuration/priorities?groupId=${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleDayId, priorities: rolePriorities }),
    });
    setEditingPriorityDay(null);
    fetchData();
  };

  const clearPriorities = async (scheduleDayId: number) => {
    await fetch(`/api/configuration/priorities?scheduleDayId=${scheduleDayId}&groupId=${groupId}`, {
      method: "DELETE",
    });
    setEditingPriorityDay(null);
    fetchData();
  };

  if (groupLoading || loading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl uppercase">Configuración</h1>
        <p className="mt-3 text-muted-foreground">
          Configura días activos, orden de columnas y prioridades de roles.
        </p>
      </div>

      {/* Schedule Days */}
      <section className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-2">Días activos</h2>
          <p className="text-sm text-muted-foreground">
            Selecciona qué días de la semana se incluyen en el cronograma.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => toggleDay(day)}
              className={`rounded-full px-4 py-2 text-sm border transition-colors ${
                day.active
                  ? "border-foreground text-foreground bg-transparent"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {day.dayOfWeek}
            </button>
          ))}
        </div>
      </section>

      {/* Rehearsal Days */}
      <section className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-2">Días de ensayo</h2>
          <p className="text-sm text-muted-foreground">
            Selecciona qué días de la semana son días de ensayo. Las fechas de ensayo aparecen en el cronograma pero no tienen asignaciones de miembros.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => toggleRehearsal(day)}
              className={`rounded-full px-4 py-2 text-sm border transition-colors ${
                day.isRehearsal
                  ? "border-foreground text-foreground bg-transparent"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {day.dayOfWeek}
            </button>
          ))}
        </div>
      </section>

      {/* Column Order */}
      <section className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-2">Orden de columnas</h2>
          <p className="text-sm text-muted-foreground">
            Configura el orden de visualización de las columnas de roles en todas las vistas de cronogramas.
          </p>
        </div>
        <ColumnOrderEditor
          roles={roles}
          onSave={async (order) => {
            await fetch(`/api/configuration/roles?groupId=${groupId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order }),
            });
            fetchData();
          }}
        />
      </section>

      {/* Role Priorities per Day */}
      <section className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-2">Prioridades de roles por día</h2>
          <p className="text-sm text-muted-foreground">
            Configura el orden de prioridad de roles para cada día activo. Los roles con números de prioridad más bajos se llenan primero.
          </p>
        </div>

        <div className="divide-y divide-border">
          {days
            .filter((d) => d.active)
            .map((day) => {
              const dayPriorities = priorities.filter(
                (p) => p.scheduleDayId === day.id
              );
              const isEditing = editingPriorityDay === day.id;

              return (
                <div key={day.id} className="py-5 first:pt-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{day.dayOfWeek}</h3>
                    <div className="flex gap-3">
                      {isEditing ? (
                        <button
                          onClick={() => setEditingPriorityDay(null)}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingPriorityDay(day.id)}
                            className="text-sm text-accent hover:opacity-80 transition-opacity"
                          >
                            {dayPriorities.length > 0 ? "Editar" : "Establecer prioridades"}
                          </button>
                          {dayPriorities.length > 0 && (
                            <button
                              onClick={() => clearPriorities(day.id)}
                              className="text-sm text-destructive hover:opacity-80 transition-opacity"
                            >
                              Limpiar
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <PriorityEditor
                      roles={roles}
                      existingPriorities={dayPriorities}
                      onSave={(rp) => savePriorities(day.id, rp)}
                    />
                  ) : dayPriorities.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {dayPriorities
                        .sort((a, b) => a.priority - b.priority)
                        .map((p) => (
                          <span
                            key={p.id}
                            className="rounded-full border border-border px-3 py-1 text-xs"
                          >
                            {p.priority + 1}. {p.roleName}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Usando el orden de roles predeterminado.
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      </section>

      {/* Member Holidays */}
      <section className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-2">
            Vacaciones de miembros
          </h2>
          <p className="text-sm text-muted-foreground">
            Configura fechas de ausencia para los miembros del grupo. Los miembros vinculados a un usuario
            también pueden gestionar sus propias ausencias desde{" "}
            <a href="/settings" className="text-accent hover:opacity-80 transition-opacity">Ajustes personales</a>.
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setHolidayError("");

            if (!holidayMemberId || !holidayStart || !holidayEnd) {
              setHolidayError("Todos los campos son obligatorios");
              return;
            }

            if (holidayStart > holidayEnd) {
              setHolidayError("La fecha de inicio debe ser anterior o igual a la fecha de fin");
              return;
            }

            const res = await fetch(`/api/configuration/holidays?groupId=${groupId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                memberId: Number(holidayMemberId),
                startDate: holidayStart,
                endDate: holidayEnd,
                description: holidayDescription.trim() || null,
              }),
            });

            if (!res.ok) {
              const data = await res.json();
              setHolidayError(data.error || "Error al crear la fecha");
              return;
            }

            setHolidayMemberId("");
            setHolidayStart("");
            setHolidayEnd("");
            setHolidayDescription("");
            fetchData();
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">
                Miembro
              </label>
              <select
                value={holidayMemberId}
                onChange={(e) => setHolidayMemberId(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:border-foreground"
                required
              >
                <option value="">Seleccionar miembro...</option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">
                Descripción
              </label>
              <input
                type="text"
                value={holidayDescription}
                onChange={(e) => setHolidayDescription(e.target.value)}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">
                Desde
              </label>
              <input
                type="date"
                value={holidayStart}
                onChange={(e) => setHolidayStart(e.target.value)}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:border-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">
                Hasta
              </label>
              <input
                type="date"
                value={holidayEnd}
                onChange={(e) => setHolidayEnd(e.target.value)}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:border-foreground"
                required
              />
            </div>
          </div>

          {holidayError && <p className="text-sm text-destructive">{holidayError}</p>}

          <button
            type="submit"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Agregar
          </button>
        </form>

        {memberHolidays.length === 0 ? (
          <div className="border-t border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No hay fechas de ausencia configuradas para los miembros.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {memberHolidays.map((h) => {
              const formatDate = (d: string) => {
                const [y, m, day] = d.split("-").map(Number);
                return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                });
              };
              return (
                <div key={h.id} className="py-4 first:pt-0 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {h.memberName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {h.startDate === h.endDate
                        ? formatDate(h.startDate)
                        : `${formatDate(h.startDate)} — ${formatDate(h.endDate)}`}
                    </p>
                    {h.description && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{h.description}</p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      await fetch(`/api/configuration/holidays?id=${h.id}&groupId=${groupId}`, {
                        method: "DELETE",
                      });
                      fetchData();
                    }}
                    className="shrink-0 rounded-md border border-border px-3.5 py-2 text-sm text-destructive hover:border-destructive transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
