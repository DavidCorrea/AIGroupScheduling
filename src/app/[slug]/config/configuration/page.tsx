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

export default function ConfigurationPage() {
  const { groupId, loading: groupLoading } = useGroup();
  const [roles, setRoles] = useState<Role[]>([]);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [priorities, setPriorities] = useState<DayRolePriority[]>([]);
  const [loading, setLoading] = useState(true);

  // Priority editing
  const [editingPriorityDay, setEditingPriorityDay] = useState<number | null>(
    null
  );

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    const [rolesRes, daysRes, prioritiesRes] = await Promise.all([
      fetch(`/api/configuration/roles?groupId=${groupId}`),
      fetch(`/api/configuration/days?groupId=${groupId}`),
      fetch(`/api/configuration/priorities?groupId=${groupId}`),
    ]);
    setRoles(await rolesRes.json());
    setDays(await daysRes.json());
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
          Configura días activos, ensayos, prioridades y orden de columnas.
        </p>
      </div>

      {/* Schedule Days + Rehearsal Days side by side on desktop */}
      <div className="border-t border-border pt-8 lg:grid lg:grid-cols-2 lg:gap-12 space-y-12 lg:space-y-0">
        <section className="space-y-4">
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

        <section className="space-y-4">
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
      </div>

      {/* Column Order + Role Priorities side by side on desktop */}
      <div className="border-t border-border pt-8 lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12 space-y-12 lg:space-y-0">
        <section className="space-y-4">
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

        <section className="space-y-4">
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
      </div>

    </div>
  );
}
