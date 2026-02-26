"use client";

import { useEffect, useState, useCallback } from "react";
import { useGroup } from "@/lib/group-context";

interface Role {
  id: number;
  name: string;
  requiredCount: number;
  displayOrder: number;
  dependsOnRoleId: number | null;
  exclusiveGroupId: number | null;
  isRelevant: boolean;
}

interface ExclusiveGroup {
  id: number;
  name: string;
}

export default function RolesPage() {
  const { groupId, loading: groupLoading } = useGroup();
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<ExclusiveGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // New group form
  const [newGroupName, setNewGroupName] = useState("");

  // New role form
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCount, setNewRoleCount] = useState(1);

  // Role name editing
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editingRoleName, setEditingRoleName] = useState("");

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    const [rolesRes, groupsRes] = await Promise.all([
      fetch(`/api/configuration/roles?groupId=${groupId}`),
      fetch(`/api/configuration/exclusive-groups?groupId=${groupId}`),
    ]);
    setRoles(await rolesRes.json());
    setGroups(await groupsRes.json());
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchData();
  }, [groupId, fetchData]);

  // ── Exclusive Groups ──

  const addGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !groupId) return;
    await fetch(`/api/configuration/exclusive-groups?groupId=${groupId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName.trim() }),
    });
    setNewGroupName("");
    fetchData();
  };

  const deleteGroup = async (group: ExclusiveGroup) => {
    if (
      !confirm(
        "¿Eliminar este grupo exclusivo? Los roles asociados perderán su grupo."
      )
    )
      return;
    if (!groupId) return;
    await fetch(
      `/api/configuration/exclusive-groups?id=${group.id}&groupId=${groupId}`,
      {
        method: "DELETE",
      }
    );
    fetchData();
  };

  // ── Roles ──

  const addRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || !groupId) return;
    await fetch(`/api/configuration/roles?groupId=${groupId}`, {
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

  const saveRoleName = async (role: Role) => {
    const trimmed = editingRoleName.trim();
    if (!trimmed || trimmed === role.name) {
      setEditingRoleId(null);
      return;
    }
    if (!groupId) return;
    await fetch(`/api/configuration/roles?groupId=${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id, name: trimmed }),
    });
    setEditingRoleId(null);
    fetchData();
  };

  const updateRoleCount = async (role: Role, newCount: number) => {
    if (!groupId) return;
    await fetch(`/api/configuration/roles?groupId=${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id, requiredCount: newCount }),
    });
    fetchData();
  };

  const updateRoleDependency = async (
    role: Role,
    dependsOnRoleId: number | null
  ) => {
    if (!groupId) return;
    await fetch(`/api/configuration/roles?groupId=${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id, dependsOnRoleId }),
    });
    fetchData();
  };

  const updateRoleExclusiveGroup = async (
    role: Role,
    exclusiveGroupId: number | null
  ) => {
    if (!groupId) return;
    await fetch(`/api/configuration/roles?groupId=${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id, exclusiveGroupId }),
    });
    fetchData();
  };

  const toggleRelevant = async (role: Role) => {
    if (!groupId) return;
    await fetch(`/api/configuration/roles?groupId=${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id, isRelevant: !role.isRelevant }),
    });
    fetchData();
  };

  const deleteRole = async (role: Role) => {
    if (
      !confirm(
        `¿Eliminar "${role.name}"? Esto también eliminará todas las entradas de cronograma para este rol.`
      )
    )
      return;
    if (!groupId) return;
    await fetch(`/api/configuration/roles?id=${role.id}&groupId=${groupId}`, {
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
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl uppercase">Roles</h1>
        <p className="mt-3 text-muted-foreground">
          Define los roles necesarios para cada fecha de servicio, cuántas
          personas se requieren y sus grupos exclusivos.
        </p>
      </div>

      <div className="border-t border-border pt-8 lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12">
        {/* Left column: Add forms + legend */}
        <div className="space-y-10">
          {/* Add role form */}
          <div>
            <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-6">
              Agregar rol
            </h2>
            <form onSubmit={addRole} className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">
                  Nombre del nuevo rol
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                  placeholder="ej. Saxofón"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">
                  Cantidad
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newRoleCount}
                  onChange={(e) => setNewRoleCount(parseInt(e.target.value, 10))}
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:border-foreground"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Agregar rol
              </button>
            </form>
          </div>

          {/* Add exclusive group form */}
          <div className="border-t border-border pt-8 lg:border-t-0 lg:pt-0">
            <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-6">
              Agregar grupo exclusivo
            </h2>
            <form onSubmit={addGroup} className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">
                  Nombre del nuevo grupo
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                  placeholder="ej. Instrumento"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Agregar
              </button>
            </form>
          </div>

          {/* Legend */}
          <div className="border border-border rounded-md p-5 text-sm text-muted-foreground space-y-2">
            <p>
              <span className="font-medium text-foreground">Depende de:</span>{" "}
              El rol no se asigna automáticamente. Al generar el cronograma, se
              elige manualmente entre los miembros asignados al rol del que depende.
            </p>
            <p>
              <span className="font-medium text-foreground">Grupo exclusivo:</span>{" "}
              Dos roles del mismo grupo no pueden asignarse a la misma persona en
              la misma fecha.
            </p>
            <p>
              <span className="font-medium text-foreground">Relevante:</span>{" "}
              Las fechas donde un miembro tiene un rol relevante se resaltan en la
              vista compartida al filtrar por esa persona.
            </p>
          </div>
        </div>

        {/* Right column: Lists */}
        <div className="border-t border-border pt-8 mt-12 lg:border-t-0 lg:pt-0 lg:mt-0 space-y-10">
          {/* Roles list */}
          <div>
            <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-6">
              Roles ({roles.length})
            </h2>
            <div className="divide-y divide-border">
              {roles.map((role) => (
                <div key={role.id} className="py-4 first:pt-0 space-y-3">
                  {/* Role name + delete */}
                  <div className="flex items-center justify-between gap-2">
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
                          className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:border-foreground w-full max-w-[200px]"
                        />
                      ) : (
                        <span
                          className="font-medium cursor-pointer hover:text-accent transition-colors truncate"
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
                    <button
                      onClick={() => deleteRole(role)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs text-destructive hover:border-destructive transition-colors shrink-0"
                      title="Eliminar rol"
                    >
                      Eliminar
                    </button>
                  </div>

                  {/* Controls */}
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">
                        Requeridos:
                      </label>
                      <select
                        value={role.requiredCount}
                        onChange={(e) =>
                          updateRoleCount(role, parseInt(e.target.value, 10))
                        }
                        className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm min-h-[36px]"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer select-none min-h-[36px]">
                      <input
                        type="checkbox"
                        checked={role.isRelevant}
                        onChange={() => toggleRelevant(role)}
                        className="rounded border-border w-4 h-4"
                      />
                      <span className="text-xs text-muted-foreground">Relevante</span>
                    </label>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-muted-foreground mb-1 block sm:hidden">
                        Depende de
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
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
                          className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm w-full sm:w-auto min-h-[36px]"
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
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-muted-foreground mb-1 block sm:hidden">
                        Grupo exclusivo
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                          Grupo exclusivo:
                        </label>
                        <select
                          value={role.exclusiveGroupId ?? ""}
                          onChange={(e) =>
                            updateRoleExclusiveGroup(
                              role,
                              e.target.value ? parseInt(e.target.value, 10) : null
                            )
                          }
                          className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm w-full sm:w-auto min-h-[36px]"
                        >
                          <option value="">Ninguno</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exclusive groups list */}
          <div className="border-t border-border pt-8">
            <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-6">
              Grupos Exclusivos ({groups.length})
            </h2>
            {groups.length === 0 ? (
              <div className="border-t border-dashed border-border py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No hay grupos exclusivos configurados.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {groups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between py-3 first:pt-0">
                    <span className="font-medium">{group.name}</span>
                    <button
                      onClick={() => deleteGroup(group)}
                      className="rounded-md border border-border px-3.5 py-1.5 text-sm text-destructive hover:border-destructive transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
