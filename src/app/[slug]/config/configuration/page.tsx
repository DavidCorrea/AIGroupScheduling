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
  // Initialize with existing or default ordering
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
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3.5 py-2 text-sm"
        >
          <span className="text-muted-foreground w-6 text-right text-xs">
            {index + 1}.
          </span>
          <span className="flex-1">{role.name}</span>
          <button
            onClick={() => moveUp(index)}
            disabled={index === 0}
            className="px-1.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            ↑
          </button>
          <button
            onClick={() => moveDown(index)}
            disabled={index === orderedRoles.length - 1}
            className="px-1.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            ↓
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onSave(orderedRoles.map((r, i) => ({ roleId: r.id, priority: i })))
        }
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-110 transition-all"
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

  // Sync when roles change from parent
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
          className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-3 text-sm shadow-[0_1px_2px_var(--shadow-color)]"
        >
          <span className="text-muted-foreground w-6 text-right text-xs">
            {index + 1}.
          </span>
          <span className="flex-1 font-medium">{role.name}</span>
          <button
            onClick={() => moveUp(index)}
            disabled={index === 0}
            className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            ↑
          </button>
          <button
            onClick={() => moveDown(index)}
            disabled={index === orderedRoles.length - 1}
            className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            ↓
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onSave(orderedRoles.map((r, i) => ({ id: r.id, displayOrder: i })))
        }
        className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-110 transition-all"
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

interface Holiday {
  id: number;
  memberId: number;
  startDate: string;
  endDate: string;
  description: string | null;
}

interface Member {
  id: number;
  name: string;
}

interface DayRolePriority {
  id: number;
  scheduleDayId: number;
  roleId: number;
  priority: number;
  dayOfWeek: string;
  roleName: string;
}

export default function ConfigurationPage() {
  const { groupId, loading: groupLoading } = useGroup();
  const [roles, setRoles] = useState<Role[]>([]);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [priorities, setPriorities] = useState<DayRolePriority[]>([]);
  const [loading, setLoading] = useState(true);

  // Holiday form
  const [holidayMemberId, setHolidayMemberId] = useState<number | "">("");
  const [holidayStart, setHolidayStart] = useState("");
  const [holidayEnd, setHolidayEnd] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");

  // Priority editing
  const [editingPriorityDay, setEditingPriorityDay] = useState<number | null>(
    null
  );

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    const [rolesRes, daysRes, holidaysRes, membersRes, prioritiesRes] =
      await Promise.all([
        fetch(`/api/configuration/roles?groupId=${groupId}`),
        fetch(`/api/configuration/days?groupId=${groupId}`),
        fetch(`/api/configuration/holidays?groupId=${groupId}`),
        fetch(`/api/members?groupId=${groupId}`),
        fetch(`/api/configuration/priorities?groupId=${groupId}`),
      ]);
    setRoles(await rolesRes.json());
    setDays(await daysRes.json());
    setHolidays(await holidaysRes.json());
    setMembers(await membersRes.json());
    setPriorities(await prioritiesRes.json());
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

  const addHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayMemberId || !holidayStart || !holidayEnd) return;
    await fetch(`/api/configuration/holidays?groupId=${groupId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: holidayMemberId,
        startDate: holidayStart,
        endDate: holidayEnd,
        description: holidayDescription || null,
      }),
    });
    setHolidayMemberId("");
    setHolidayStart("");
    setHolidayEnd("");
    setHolidayDescription("");
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

  const deleteHoliday = async (id: number) => {
    await fetch(`/api/configuration/holidays?id=${id}&groupId=${groupId}`, {
      method: "DELETE",
    });
    fetchData();
  };

  if (groupLoading || loading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1.5 text-muted-foreground">
          Configura días activos, orden de columnas, prioridades de roles y gestiona vacaciones de miembros.
        </p>
      </div>

      {/* Schedule Days */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Días activos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecciona qué días de la semana se incluyen en el cronograma.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => toggleDay(day)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition-all duration-150 ${
                day.active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {day.dayOfWeek}
            </button>
          ))}
        </div>
      </section>

      {/* Rehearsal Days */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Días de ensayo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecciona qué días de la semana son días de ensayo. Las fechas de ensayo aparecen en el cronograma pero no tienen asignaciones de miembros.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => toggleRehearsal(day)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition-all duration-150 ${
                day.isRehearsal
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {day.dayOfWeek}
            </button>
          ))}
        </div>
      </section>

      {/* Column Order */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Orden de columnas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura el orden de visualización de las columnas de roles en todas las vistas de cronogramas. Usa las flechas para reordenar, luego haz clic en &quot;Guardar orden&quot; para aplicar.
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
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Prioridades de roles por día</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura el orden de prioridad de roles para cada día activo. Los roles con números de prioridad más bajos se llenan primero. Esto es útil cuando un miembro puede tocar múltiples roles y quieres asegurar que un rol específico se llene primero en ciertos días.
          </p>
        </div>

        <div className="space-y-3">
          {days
            .filter((d) => d.active)
            .map((day) => {
              const dayPriorities = priorities.filter(
                (p) => p.scheduleDayId === day.id
              );
              const isEditing = editingPriorityDay === day.id;

              return (
                <div
                  key={day.id}
                  className="rounded-xl border border-border/50 bg-card p-5 shadow-[0_1px_2px_var(--shadow-color)]"
                >
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
                            className="text-sm text-primary hover:text-primary/80 transition-colors"
                          >
                            {dayPriorities.length > 0 ? "Editar" : "Establecer prioridades"}
                          </button>
                          {dayPriorities.length > 0 && (
                            <button
                              onClick={() => clearPriorities(day.id)}
                              className="text-sm text-destructive hover:text-destructive/80 transition-colors"
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
                            className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium"
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

      {/* Holidays */}
      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Vacaciones</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura rangos de fechas cuando los miembros no están disponibles. Se omitirán durante la generación de cronogramas.
          </p>
        </div>

        <form
          onSubmit={addHoliday}
          className="rounded-xl border border-border/50 bg-card p-5 space-y-4 shadow-[0_1px_2px_var(--shadow-color)]"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Miembro
              </label>
              <select
                value={holidayMemberId}
                onChange={(e) =>
                  setHolidayMemberId(
                    e.target.value ? parseInt(e.target.value, 10) : ""
                  )
                }
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm"
                required
              >
                <option value="">Seleccionar miembro...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Fecha inicio
              </label>
              <input
                type="date"
                value={holidayStart}
                onChange={(e) => setHolidayStart(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Fecha fin
              </label>
              <input
                type="date"
                value={holidayEnd}
                onChange={(e) => setHolidayEnd(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Descripción
              </label>
              <input
                type="text"
                value={holidayDescription}
                onChange={(e) => setHolidayDescription(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60"
                placeholder="Nota opcional"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-110 transition-all"
          >
            Agregar vacación
          </button>
        </form>

        {holidays.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay vacaciones configuradas.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {holidays.map((holiday) => {
              const member = members.find((m) => m.id === holiday.memberId);
              return (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-5 py-3.5 shadow-[0_1px_2px_var(--shadow-color)]"
                >
                  <div>
                    <span className="font-medium">
                      {member?.name ?? "Unknown"}
                    </span>
                    <span className="mx-2 text-muted-foreground/50">—</span>
                    <span className="text-sm text-muted-foreground">
                      {holiday.startDate} to {holiday.endDate}
                    </span>
                    {holiday.description && (
                      <span className="ml-2 text-sm text-muted-foreground italic">
                        ({holiday.description})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteHoliday(holiday.id)}
                    className="rounded-lg border border-destructive/30 px-3.5 py-1.5 text-sm font-medium text-destructive hover:bg-destructive hover:text-white transition-colors"
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
