"use client";

import { useEffect, useState, useCallback } from "react";

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
          className="flex items-center gap-2 rounded border border-border bg-background px-3 py-1.5 text-sm"
        >
          <span className="text-muted-foreground w-6 text-right">
            {index + 1}.
          </span>
          <span className="flex-1">{role.name}</span>
          <button
            onClick={() => moveUp(index)}
            disabled={index === 0}
            className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            ↑
          </button>
          <button
            onClick={() => moveDown(index)}
            disabled={index === orderedRoles.length - 1}
            className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            ↓
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onSave(orderedRoles.map((r, i) => ({ roleId: r.id, priority: i })))
        }
        className="mt-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
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
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
        >
          <span className="text-muted-foreground w-6 text-right">
            {index + 1}.
          </span>
          <span className="flex-1 font-medium">{role.name}</span>
          <button
            onClick={() => moveUp(index)}
            disabled={index === 0}
            className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            ↑
          </button>
          <button
            onClick={() => moveDown(index)}
            disabled={index === orderedRoles.length - 1}
            className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            ↓
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onSave(orderedRoles.map((r, i) => ({ id: r.id, displayOrder: i })))
        }
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
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
  const [roles, setRoles] = useState<Role[]>([]);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [priorities, setPriorities] = useState<DayRolePriority[]>([]);
  const [loading, setLoading] = useState(true);

  // New role form
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCount, setNewRoleCount] = useState(1);

  // Holiday form
  const [holidayMemberId, setHolidayMemberId] = useState<number | "">("");
  const [holidayStart, setHolidayStart] = useState("");
  const [holidayEnd, setHolidayEnd] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");

  // Role editing
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editingRoleName, setEditingRoleName] = useState("");

  // Priority editing
  const [editingPriorityDay, setEditingPriorityDay] = useState<number | null>(
    null
  );

  const fetchData = useCallback(async () => {
    const [rolesRes, daysRes, holidaysRes, membersRes, prioritiesRes] =
      await Promise.all([
        fetch("/api/configuration/roles"),
        fetch("/api/configuration/days"),
        fetch("/api/configuration/holidays"),
        fetch("/api/members"),
        fetch("/api/configuration/priorities"),
      ]);
    setRoles(await rolesRes.json());
    setDays(await daysRes.json());
    setHolidays(await holidaysRes.json());
    setMembers(await membersRes.json());
    setPriorities(await prioritiesRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleDay = async (day: ScheduleDay) => {
    await fetch("/api/configuration/days", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: day.id, active: !day.active }),
    });
    fetchData();
  };

  const toggleRehearsal = async (day: ScheduleDay) => {
    await fetch("/api/configuration/days", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: day.id, isRehearsal: !day.isRehearsal }),
    });
    fetchData();
  };

  const addRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    await fetch("/api/configuration/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newRoleName.trim(),
        requiredCount: newRoleCount,
      }),
    });
    setNewRoleName("");
    setNewRoleCount(1);
    fetchData();
  };

  const updateRoleCount = async (role: Role, newCount: number) => {
    await fetch("/api/configuration/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id, requiredCount: newCount }),
    });
    fetchData();
  };

  const saveRoleName = async (role: Role) => {
    const trimmed = editingRoleName.trim();
    if (!trimmed || trimmed === role.name) {
      setEditingRoleId(null);
      return;
    }
    await fetch("/api/configuration/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id, name: trimmed }),
    });
    setEditingRoleId(null);
    fetchData();
  };

  const updateRoleDependency = async (role: Role, dependsOnRoleId: number | null) => {
    await fetch("/api/configuration/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id, dependsOnRoleId }),
    });
    fetchData();
  };

  const updateRoleExclusiveGroup = async (role: Role, exclusiveGroup: string | null) => {
    await fetch("/api/configuration/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id, exclusiveGroup }),
    });
    fetchData();
  };

  const deleteRole = async (role: Role) => {
    if (
      !confirm(
        `¿Eliminar "${role.name}"? Esto también eliminará todas las entradas de cronograma para este rol de cada cronograma.`
      )
    )
      return;
    await fetch(`/api/configuration/roles?id=${role.id}`, {
      method: "DELETE",
    });
    fetchData();
  };

  const addHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayMemberId || !holidayStart || !holidayEnd) return;
    await fetch("/api/configuration/holidays", {
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
    await fetch("/api/configuration/priorities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleDayId, priorities: rolePriorities }),
    });
    setEditingPriorityDay(null);
    fetchData();
  };

  const clearPriorities = async (scheduleDayId: number) => {
    await fetch(`/api/configuration/priorities?scheduleDayId=${scheduleDayId}`, {
      method: "DELETE",
    });
    setEditingPriorityDay(null);
    fetchData();
  };

  const deleteHoliday = async (id: number) => {
    await fetch(`/api/configuration/holidays?id=${id}`, {
      method: "DELETE",
    });
    fetchData();
  };

  if (loading) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="mt-1 text-muted-foreground">
          Configura roles, días activos y gestiona vacaciones de miembros.
        </p>
      </div>

      {/* Schedule Days */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Días activos</h2>
        <p className="text-sm text-muted-foreground">
          Selecciona qué días de la semana se incluyen en el cronograma.
        </p>
        <div className="flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => toggleDay(day)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                day.active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary"
              }`}
            >
              {day.dayOfWeek}
            </button>
          ))}
        </div>
      </section>

      {/* Rehearsal Days */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Días de ensayo</h2>
        <p className="text-sm text-muted-foreground">
          Selecciona qué días de la semana son días de ensayo. Las fechas de ensayo aparecen en el cronograma pero no tienen asignaciones de miembros.
        </p>
        <div className="flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => toggleRehearsal(day)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                day.isRehearsal
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary"
              }`}
            >
              {day.dayOfWeek}
            </button>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Roles</h2>
        <p className="text-sm text-muted-foreground">
          Define los roles necesarios para cada fecha de servicio y cuántas personas se requieren por rol.
        </p>

        <div className="space-y-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {editingRoleId === role.id ? (
                  <input
                    type="text"
                    value={editingRoleName}
                    onChange={(e) => setEditingRoleName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRoleName(role);
                      if (e.key === "Escape") setEditingRoleId(null);
                    }}
                    onBlur={() => saveRoleName(role)}
                    autoFocus
                    className="rounded-md border border-border bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary w-48"
                  />
                ) : (
                  <span
                    className="font-medium cursor-pointer hover:text-primary transition-colors"
                    onClick={() => {
                      setEditingRoleId(role.id);
                      setEditingRoleName(role.name);
                    }}
                    title="Clic para renombrar"
                  >
                    {role.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">
                    Requeridos:
                  </label>
                  <select
                    value={role.requiredCount}
                    onChange={(e) =>
                      updateRoleCount(role, parseInt(e.target.value, 10))
                    }
                    className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">
                    Depende de:
                  </label>
                  <select
                    value={role.dependsOnRoleId ?? ""}
                    onChange={(e) =>
                      updateRoleDependency(
                        role,
                        e.target.value ? parseInt(e.target.value, 10) : null
                      )
                    }
                    className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                  >
                    <option value="">Ninguno</option>
                    {roles
                      .filter((r) => r.id !== role.id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">
                    Grupo exclusivo:
                  </label>
                  <input
                    type="text"
                    defaultValue={role.exclusiveGroup ?? ""}
                    onBlur={(e) => {
                      const val = e.target.value.trim() || null;
                      if (val !== (role.exclusiveGroup ?? null)) {
                        updateRoleExclusiveGroup(role, val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    placeholder="Ninguno"
                    className="rounded-md border border-border bg-background px-2 py-1 text-sm w-32"
                  />
                </div>
                <button
                  onClick={() => deleteRole(role)}
                  className="rounded-md border border-destructive px-2 py-1 text-xs text-destructive hover:bg-destructive hover:text-white transition-colors"
                  title="Delete role"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={addRole} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              Nombre del nuevo rol
            </label>
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="ej. Saxofón"
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium mb-1">Cantidad</label>
            <input
              type="number"
              min={1}
              max={10}
              value={newRoleCount}
              onChange={(e) => setNewRoleCount(parseInt(e.target.value, 10))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Agregar rol
          </button>
        </form>
      </section>

      {/* Column Order */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Orden de columnas</h2>
        <p className="text-sm text-muted-foreground">
          Configura el orden de visualización de las columnas de roles en todas las vistas de cronogramas. Usa las flechas para reordenar, luego haz clic en &quot;Guardar orden&quot; para aplicar.
        </p>
        <ColumnOrderEditor
          roles={roles}
          onSave={async (order) => {
            await fetch("/api/configuration/roles", {
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
        <h2 className="text-lg font-semibold">Prioridades de roles por día</h2>
        <p className="text-sm text-muted-foreground">
          Configura el orden de prioridad de roles para cada día activo. Los roles con números de prioridad más bajos se llenan primero. Esto es útil cuando un miembro puede tocar múltiples roles y quieres asegurar que un rol específico se llene primero en ciertos días.
        </p>

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
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{day.dayOfWeek}</h3>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <button
                          onClick={() => setEditingPriorityDay(null)}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingPriorityDay(day.id)}
                            className="text-sm text-primary hover:underline"
                          >
                            {dayPriorities.length > 0 ? "Editar" : "Establecer prioridades"}
                          </button>
                          {dayPriorities.length > 0 && (
                            <button
                              onClick={() => clearPriorities(day.id)}
                              className="text-sm text-destructive hover:underline"
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
                            className="rounded-full bg-accent px-3 py-1 text-xs font-medium"
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
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Vacaciones</h2>
        <p className="text-sm text-muted-foreground">
          Configura rangos de fechas cuando los miembros no están disponibles. Se omitirán durante la generación de cronogramas.
        </p>

        <form
          onSubmit={addHoliday}
          className="rounded-lg border border-border bg-card p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-1">Miembro</label>
              <select
                value={holidayMemberId}
                onChange={(e) =>
                  setHolidayMemberId(
                    e.target.value ? parseInt(e.target.value, 10) : ""
                  )
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
              <label className="block text-sm font-medium mb-1">
                Fecha inicio
              </label>
              <input
                type="date"
                value={holidayStart}
                onChange={(e) => setHolidayStart(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Fecha fin
              </label>
              <input
                type="date"
                value={holidayEnd}
                onChange={(e) => setHolidayEnd(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={holidayDescription}
                onChange={(e) => setHolidayDescription(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Nota opcional"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Agregar vacación
          </button>
        </form>

        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay vacaciones configuradas.
          </p>
        ) : (
          <div className="space-y-2">
            {holidays.map((holiday) => {
              const member = members.find((m) => m.id === holiday.memberId);
              return (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div>
                    <span className="font-medium">
                      {member?.name ?? "Unknown"}
                    </span>
                    <span className="mx-2 text-muted-foreground">—</span>
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
                    className="rounded-md border border-destructive px-3 py-1 text-sm text-destructive hover:bg-destructive hover:text-white transition-colors"
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
