"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useGroup } from "@/lib/group-context";
import { useUnsavedConfig } from "@/lib/unsaved-config-context";
import { OptionToggleGroup } from "@/components/OptionToggleGroup";

function PriorityEditor({
  roles,
  existingPriorities,
  onApply,
}: {
  roles: Role[];
  existingPriorities: DayRolePriority[];
  onApply: (priorities: { roleId: number; priority: number }[]) => void;
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
          onApply(orderedRoles.map((r, i) => ({ roleId: r.id, priority: i })))
        }
        className="mt-2 w-full sm:w-auto rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Aplicar
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
  const { setDirty } = useUnsavedConfig();
  const [roles, setRoles] = useState<Role[]>([]);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [priorities, setPriorities] = useState<DayRolePriority[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial state (last saved) for dirty check
  const [initialDays, setInitialDays] = useState<ScheduleDay[]>([]);
  const [initialPrioritiesByDay, setInitialPrioritiesByDay] = useState<
    Record<number, { roleId: number; priority: number }[]>
  >({});

  // Local editable state
  const [localDays, setLocalDays] = useState<ScheduleDay[]>([]);
  const [localPrioritiesByDay, setLocalPrioritiesByDay] = useState<
    Record<number, { roleId: number; priority: number }[]>
  >({});

  // Priority editing UI
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
    const rolesData = await rolesRes.json();
    const daysData = await daysRes.json();
    const prioritiesData = await prioritiesRes.json();
    setRoles(rolesData);
    setDays(daysData);
    setPriorities(prioritiesData);

    setInitialDays(daysData);
    setInitialPrioritiesByDay(() => {
      const byDay: Record<number, { roleId: number; priority: number }[]> = {};
      for (const p of prioritiesData) {
        if (!byDay[p.scheduleDayId]) byDay[p.scheduleDayId] = [];
        byDay[p.scheduleDayId].push({ roleId: p.roleId, priority: p.priority });
      }
      return byDay;
    });

    setLocalDays(daysData);
    setLocalPrioritiesByDay(() => {
      const byDay: Record<number, { roleId: number; priority: number }[]> = {};
      for (const p of prioritiesData) {
        if (!byDay[p.scheduleDayId]) byDay[p.scheduleDayId] = [];
        byDay[p.scheduleDayId].push({ roleId: p.roleId, priority: p.priority });
      }
      return byDay;
    });
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (groupId) fetchData();
  }, [groupId, fetchData]);

  const dirty = useMemo(() => {
    const daysEqual =
      localDays.length === initialDays.length &&
      localDays.every(
        (d, i) =>
          initialDays[i] &&
          d.id === initialDays[i].id &&
          d.active === initialDays[i].active &&
          d.isRehearsal === initialDays[i].isRehearsal
      );
    const prioritiesEqual = (() => {
      const dayIds = new Set([
        ...Object.keys(initialPrioritiesByDay).map(Number),
        ...Object.keys(localPrioritiesByDay).map(Number),
      ]);
      for (const dayId of dayIds) {
        const a = initialPrioritiesByDay[dayId] ?? [];
        const b = localPrioritiesByDay[dayId] ?? [];
        if (
          a.length !== b.length ||
          a.some((p, i) => p.roleId !== b[i]?.roleId || p.priority !== b[i]?.priority)
        )
          return false;
      }
      return true;
    })();
    return !daysEqual || !prioritiesEqual;
  }, [
    localDays,
    initialDays,
    localPrioritiesByDay,
    initialPrioritiesByDay,
  ]);

  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const toggleDay = (day: ScheduleDay) => {
    setLocalDays((prev) =>
      prev.map((d) =>
        d.id === day.id ? { ...d, active: !d.active } : d
      )
    );
  };

  const toggleRehearsal = (day: ScheduleDay) => {
    setLocalDays((prev) =>
      prev.map((d) =>
        d.id === day.id ? { ...d, isRehearsal: !d.isRehearsal } : d
      )
    );
  };

  const handlePrioritiesApply = (
    scheduleDayId: number,
    rolePriorities: { roleId: number; priority: number }[]
  ) => {
    setLocalPrioritiesByDay((prev) => ({
      ...prev,
      [scheduleDayId]: rolePriorities,
    }));
    setEditingPriorityDay(null);
  };

  const clearPrioritiesLocal = (scheduleDayId: number) => {
    setLocalPrioritiesByDay((prev) => {
      const next = { ...prev };
      next[scheduleDayId] = [];
      return next;
    });
    setEditingPriorityDay(null);
  };

  const saveAll = async () => {
    if (!groupId) return;
    for (const day of localDays) {
      const initial = initialDays.find((d) => d.id === day.id);
      if (!initial) continue;
      if (day.active !== initial.active || day.isRehearsal !== initial.isRehearsal) {
        await fetch(`/api/configuration/days?groupId=${groupId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: day.id,
            active: day.active,
            isRehearsal: day.isRehearsal,
          }),
        });
      }
    }
    const allDayIds = new Set([
      ...Object.keys(initialPrioritiesByDay).map(Number),
      ...Object.keys(localPrioritiesByDay).map(Number),
    ]);
    for (const scheduleDayId of allDayIds) {
      const initialP = initialPrioritiesByDay[scheduleDayId] ?? [];
      const localP = localPrioritiesByDay[scheduleDayId] ?? [];
      const same =
        initialP.length === localP.length &&
        initialP.every(
          (p, i) => p.roleId === localP[i]?.roleId && p.priority === localP[i]?.priority
        );
      if (same) continue;
      await fetch(`/api/configuration/priorities?groupId=${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleDayId, priorities: localP }),
      });
    }
    await fetchData();
  };

  if (groupLoading || loading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl uppercase">Configuración</h1>
        <p className="mt-3 text-muted-foreground">
          Configura días activos, ensayos y prioridades.
        </p>
      </div>

      {/* Schedule Days: separate sections, shared OptionToggleGroup component */}
      <div className="border-t border-border pt-8 space-y-8">
        <OptionToggleGroup
          items={localDays}
          getKey={(day) => day.id}
          getLabel={(day) => day.dayOfWeek}
          isSelected={(day) => day.active}
          onToggle={toggleDay}
          title="Días activos"
          description="Selecciona qué días de la semana se incluyen en el cronograma."
        />
        <OptionToggleGroup
          items={localDays}
          getKey={(day) => day.id}
          getLabel={(day) => day.dayOfWeek}
          isSelected={(day) => day.isRehearsal}
          onToggle={toggleRehearsal}
          title="Días de ensayo"
          description="Selecciona qué días de la semana son días de ensayo. Las fechas de ensayo aparecen en el cronograma pero no tienen asignaciones de miembros."
        />
      </div>

      {/* Prioridades de roles por día: own section */}
      <div className="border-t border-border pt-8">
        <section className="space-y-4">
          <div>
            <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-2">Prioridades de roles por día</h2>
            <p className="text-sm text-muted-foreground">
              Configura el orden de prioridad de roles para cada día activo. Los roles con números de prioridad más bajos se llenan primero.
            </p>
          </div>

          <div className="divide-y divide-border">
            {localDays
              .filter((d) => d.active)
              .map((day) => {
                const dayPrioritiesRaw = localPrioritiesByDay[day.id] ?? [];
                const dayPriorities: DayRolePriority[] = dayPrioritiesRaw
                  .sort((a, b) => a.priority - b.priority)
                  .map((p, i) => ({
                    id: i,
                    scheduleDayId: day.id,
                    roleId: p.roleId,
                    priority: p.priority,
                    dayOfWeek: day.dayOfWeek,
                    roleName: roles.find((r) => r.id === p.roleId)?.name ?? "",
                  }));
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
                                onClick={() => clearPrioritiesLocal(day.id)}
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
                        onApply={(rp) => handlePrioritiesApply(day.id, rp)}
                      />
                    ) : dayPriorities.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {dayPriorities
                          .sort((a, b) => a.priority - b.priority)
                          .map((p) => (
                            <span
                              key={`${p.roleId}-${p.priority}`}
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

      <div className="border-t border-border pt-8 flex justify-end">
        <button
          type="button"
          onClick={saveAll}
          disabled={!dirty}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
        >
          Guardar cambios
        </button>
      </div>

    </div>
  );
}
