"use client";

import { useEffect, useState, useCallback } from "react";
import { useGroup } from "@/lib/group-context";

interface Role {
  id: number;
  name: string;
  requiredCount: number;
}

interface ScheduleDay {
  id: number;
  dayOfWeek: string;
  active: boolean;
}

interface Member {
  id: number;
  name: string;
  roleIds: number[];
  availableDayIds: number[];
}

export default function MembersPage() {
  const { groupId, loading: groupLoading } = useGroup();
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    const q = `?groupId=${groupId}`;
    const [membersRes, rolesRes, daysRes] = await Promise.all([
      fetch(`/api/members${q}`),
      fetch(`/api/configuration/roles${q}`),
      fetch(`/api/configuration/days${q}`),
    ]);
    setMembers(await membersRes.json());
    setRoles(await rolesRes.json());
    setDays(await daysRes.json());
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (groupId) fetchData();
  }, [groupId, fetchData]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setSelectedRoles([]);
    setSelectedDays([]);
  };

  const startEdit = (member: Member) => {
    setEditingId(member.id);
    setName(member.name);
    setSelectedRoles([...member.roleIds]);
    setSelectedDays([...member.availableDayIds]);
  };

  const toggleRole = (roleId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId)
        ? prev.filter((id) => id !== dayId)
        : [...prev, dayId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      roleIds: selectedRoles,
      availableDayIds: selectedDays,
    };

    if (editingId) {
      await fetch(`/api/members/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/members?groupId=${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    resetForm();
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este miembro?")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    fetchData();
  };

  const activeDays = days.filter((d) => d.active);

  if (groupLoading || loading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl uppercase">Miembros</h1>
        <p className="mt-3 text-muted-foreground">
          Agrega y gestiona los miembros del grupo. Asigna roles y configura disponibilidad.
        </p>
      </div>

      {/* Add / Edit form */}
      <div className="border-t border-border pt-8">
        <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-6">
          {editingId ? "Editar miembro" : "Agregar miembro"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
              placeholder="Nombre del miembro"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">
              Roles
            </label>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={`rounded-full px-3.5 py-1.5 text-sm border transition-colors ${
                    selectedRoles.includes(role.id)
                      ? "border-foreground text-foreground bg-transparent"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {role.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">
              Días disponibles
            </label>
            <div className="flex flex-wrap gap-2">
              {activeDays.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={`rounded-full px-3.5 py-1.5 text-sm border transition-colors ${
                    selectedDays.includes(day.id)
                      ? "border-foreground text-foreground bg-transparent"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {day.dayOfWeek}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {editingId ? "Actualizar" : "Agregar miembro"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-border px-5 py-2.5 text-sm hover:border-foreground transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Members list */}
      <div className="border-t border-border pt-8">
        <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-6">
          Miembros ({members.length})
        </h2>
        {members.length === 0 ? (
          <div className="border-t border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no se han agregado miembros.
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              Usa el formulario de arriba para agregar el primer miembro.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => (
              <div key={member.id} className="py-4 first:pt-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-2 min-w-0">
                    <h3 className="font-medium">{member.name}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {member.roleIds.map((roleId) => {
                        const role = roles.find((r) => r.id === roleId);
                        return (
                          <span
                            key={roleId}
                            className="rounded-full border border-border px-2.5 py-0.5 text-xs"
                          >
                            {role?.name ?? "Unknown"}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {member.availableDayIds.map((dayId) => {
                        const day = days.find((d) => d.id === dayId);
                        return (
                          <span
                            key={dayId}
                            className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
                          >
                            {day?.dayOfWeek ?? "Unknown"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(member)}
                      className="flex-1 sm:flex-none rounded-md border border-border px-3.5 py-2 text-sm hover:border-foreground transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="flex-1 sm:flex-none rounded-md border border-border px-3.5 py-2 text-sm text-destructive hover:border-destructive transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
