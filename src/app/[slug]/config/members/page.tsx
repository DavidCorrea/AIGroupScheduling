"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  memberEmail: string | null;
  userId: string | null;
  email: string | null;
  image: string | null;
  userName: string | null;
  roleIds: number[];
  availableDayIds: number[];
}

interface UserSearchResult {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export default function MembersPage() {
  const { groupId, loading: groupLoading } = useGroup();
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [linkedUser, setLinkedUser] = useState<UserSearchResult | null>(null);
  const [emailSearchResults, setEmailSearchResults] = useState<UserSearchResult[]>([]);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [formError, setFormError] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced user search by email for linking
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    // Don't search if already linked or email too short
    if (linkedUser || memberEmail.length < 3) {
      setEmailSearchResults([]);
      setShowEmailDropdown(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(memberEmail)}`);
      const results: UserSearchResult[] = await res.json();
      // Exclude users whose email is already used by a member in this group (except the one being edited)
      const existingEmails = new Set(
        members
          .filter((m) => m.id !== editingId)
          .map((m) => m.memberEmail?.toLowerCase())
          .filter(Boolean)
      );
      const filtered = results.filter((u) => !existingEmails.has(u.email.toLowerCase()));
      setEmailSearchResults(filtered);
      setShowEmailDropdown(filtered.length > 0);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [memberEmail, linkedUser]);

  const resetForm = () => {
    setEditingId(null);
    setMemberName("");
    setMemberEmail("");
    setLinkedUser(null);
    setEmailSearchResults([]);
    setShowEmailDropdown(false);
    setSelectedRoles([]);
    setSelectedDays([]);
    setFormError("");
  };

  const startEdit = (member: Member) => {
    setEditingId(member.id);
    setMemberName(member.name);
    setMemberEmail(member.memberEmail ?? "");
    if (member.userId) {
      setLinkedUser({
        id: member.userId,
        name: member.userName,
        email: member.email ?? "",
        image: member.image,
      });
    } else {
      setLinkedUser(null);
    }
    setEmailSearchResults([]);
    setShowEmailDropdown(false);
    setSelectedRoles([...member.roleIds]);
    setSelectedDays([...member.availableDayIds]);
  };

  const selectUserToLink = (user: UserSearchResult) => {
    setLinkedUser(user);
    setMemberEmail(user.email);
    setEmailSearchResults([]);
    setShowEmailDropdown(false);
  };

  const unlinkUser = () => {
    setLinkedUser(null);
    // Keep email editable but don't clear it
  };

  const toggleRole = (roleId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((id) => id !== dayId) : [...prev, dayId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!memberName.trim()) return;

    let res: Response;

    if (editingId) {
      res = await fetch(`/api/members/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: memberName.trim(),
          email: memberEmail.trim() || null,
          userId: linkedUser?.id ?? null,
          roleIds: selectedRoles,
          availableDayIds: selectedDays,
        }),
      });
    } else {
      res = await fetch(`/api/members?groupId=${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: memberName.trim(),
          email: memberEmail.trim() || null,
          userId: linkedUser?.id ?? undefined,
          roleIds: selectedRoles,
          availableDayIds: selectedDays,
        }),
      });
    }

    if (!res.ok) {
      const data = await res.json();
      setFormError(data.error || "Error al guardar el miembro");
      return;
    }

    resetForm();
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este miembro?")) return;
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Error al eliminar el miembro");
      return;
    }
    fetchData();
  };

  const activeDays = days.filter((d) => d.active);

  if (groupLoading || loading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl uppercase">
          Miembros
        </h1>
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
          {/* Name input (always shown, primary field) */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              Nombre
            </label>
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
              placeholder="Nombre del miembro"
              required
            />
          </div>

          {/* Unified email + user linking */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              Email <span className="text-muted-foreground/50">(opcional)</span>
            </label>
            {linkedUser ? (
              <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
                {linkedUser.image && (
                  <img
                    src={linkedUser.image}
                    alt=""
                    className="h-6 w-6 rounded-full"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-sm block truncate">
                    {linkedUser.name ?? linkedUser.email}
                  </span>
                  <span className="text-xs text-muted-foreground block truncate">
                    {linkedUser.email} — cuenta vinculada
                  </span>
                </div>
                <button
                  type="button"
                  onClick={unlinkUser}
                  className="shrink-0 text-sm text-destructive hover:opacity-80 transition-opacity"
                >
                  Desvincular
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  onFocus={() => emailSearchResults.length > 0 && setShowEmailDropdown(true)}
                  onBlur={() => setTimeout(() => setShowEmailDropdown(false), 200)}
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                  placeholder="correo@ejemplo.com"
                />
                {showEmailDropdown && (
                  <div className="absolute z-10 top-full mt-1 w-full rounded-md border border-border bg-background shadow-sm max-h-60 overflow-y-auto">
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/50">
                      Usuarios encontrados — clic para vincular
                    </p>
                    {emailSearchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => selectUserToLink(user)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
                      >
                        {user.image && (
                          <img
                            src={user.image}
                            alt=""
                            className="h-6 w-6 rounded-full"
                          />
                        )}
                        <div>
                          <span className="text-sm block">{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground/60">
              Si el usuario ya existe, podrás vincularlo. Si no, se vinculará automáticamente cuando inicie sesión.
            </p>
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

          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!memberName.trim()}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div className="flex items-center gap-2">
                      {member.image && (
                        <img
                          src={member.image}
                          alt=""
                          className="h-7 w-7 rounded-full"
                        />
                      )}
                      <div>
                        <h3 className="font-medium">{member.name}</h3>
                        {member.memberEmail && (
                          <p className="text-xs text-muted-foreground">
                            {member.memberEmail}
                          </p>
                        )}
                        {member.userId ? (
                          <p className="text-xs text-muted-foreground/50">
                            Cuenta vinculada
                          </p>
                        ) : member.memberEmail ? (
                          <p className="text-xs text-muted-foreground/50 italic">
                            Pendiente de vincular
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/50 italic">
                            Sin cuenta vinculada
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {member.roleIds.map((roleId) => {
                        const role = roles.find((r) => r.id === roleId);
                        return (
                          <span
                            key={roleId}
                            className="rounded-full border border-border px-2.5 py-0.5 text-xs"
                          >
                            {role?.name ?? "Desconocido"}
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
                            {day?.dayOfWeek ?? "Desconocido"}
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
