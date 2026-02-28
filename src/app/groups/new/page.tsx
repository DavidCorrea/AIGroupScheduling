"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserSearchResult {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface RoleEntry {
  name: string;
  requiredCount: number;
}

const ALL_DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function NewGroupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Days
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());

  // Roles
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCount, setNewRoleCount] = useState(1);

  // Collaborators
  const [collaborators, setCollaborators] = useState<UserSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(generateSlug(value));
  };

  const toggleActive = (day: string) => {
    setActiveDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const addRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setRoles((prev) => [
      ...prev,
      { name: newRoleName.trim(), requiredCount: newRoleCount },
    ]);
    setNewRoleName("");
    setNewRoleCount(1);
  };

  const removeRole = (index: number) => {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  };

  // Debounced collaborator search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(searchQuery)}`
      );
      const results: UserSearchResult[] = await res.json();
      const existingIds = new Set(collaborators.map((c) => c.id));
      const filtered = results.filter((u) => !existingIds.has(u.id));
      setSearchResults(filtered);
      setShowDropdown(filtered.length > 0);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, collaborators]);

  const selectCollaborator = (user: UserSearchResult) => {
    setCollaborators((prev) => [...prev, user]);
    setSearchQuery("");
    setShowDropdown(false);
    setSearchResults([]);
  };

  const removeCollaborator = (userId: string) => {
    setCollaborators((prev) => prev.filter((c) => c.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !slug.trim()) return;
    setSubmitting(true);

    const hasDayConfig = activeDays.size > 0;

    const body: Record<string, unknown> = {
      name: name.trim(),
      slug: slug.trim(),
    };

    if (hasDayConfig) {
      body.days = ALL_DAYS.map((d) => ({
        dayOfWeek: d,
        active: activeDays.has(d),
      }));
    }

    if (roles.length > 0) {
      body.roles = roles;
    }

    if (collaborators.length > 0) {
      body.collaboratorUserIds = collaborators.map((c) => c.id);
    }

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al crear el grupo");
      setSubmitting(false);
      return;
    }

    const group = await res.json();
    router.push(`/${group.slug}/config`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl uppercase">
            Nuevo grupo
          </h1>
          <p className="mt-3 text-muted-foreground">
            Configura lo básico de tu grupo. Todo excepto el nombre es opcional y
            puede cambiarse después.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Group Info */}
          <section>
            <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-6">
              Información del grupo
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                  placeholder="Nombre del grupo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                  placeholder="slug-del-grupo"
                  required
                />
              </div>
            </div>
          </section>

          {/* Active Days */}
          <section className="border-t border-border pt-8">
            <div>
              <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-2">
                Días activos
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Días de la semana que se incluyen en el cronograma.
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleActive(day)}
                    className={`rounded-full px-4 py-2 text-sm border transition-colors ${
                      activeDays.has(day)
                        ? "border-foreground text-foreground bg-transparent"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Roles */}
          <section className="border-t border-border pt-8">
            <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-2">
              Roles
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Define los roles que se asignarán en el cronograma. Puedes agregar
              más y configurar dependencias después.
            </p>
            <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-muted-foreground mb-1.5">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                    placeholder="Ej: Voz, Guitarra..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRole(e);
                      }
                    }}
                  />
                </div>
                <div className="w-20">
                  <label className="block text-sm text-muted-foreground mb-1.5">
                    Cant.
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newRoleCount}
                    onChange={(e) =>
                      setNewRoleCount(parseInt(e.target.value) || 1)
                    }
                    className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:border-foreground"
                  />
                </div>
                <button
                  type="button"
                  onClick={addRole}
                  className="shrink-0 rounded-md border border-border px-4 py-2.5 text-sm hover:border-foreground transition-colors"
                >
                  Agregar
                </button>
              </div>

              <div className="mt-6 lg:mt-0">
                {roles.length === 0 ? (
                  <div className="border-t border-dashed border-border py-8 text-center lg:border-t-0">
                    <p className="text-sm text-muted-foreground">
                      Sin roles aún. Puedes agregarlos ahora o después.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {roles.map((role, i) => (
                      <div
                        key={i}
                        className="py-3 first:pt-0 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-medium">
                            {role.name}
                          </span>
                          {role.requiredCount > 1 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ×{role.requiredCount}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRole(i)}
                          className="shrink-0 text-xs text-destructive hover:opacity-80 transition-opacity"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Collaborators */}
          <section className="border-t border-border pt-8">
            <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-2">
              Colaboradores
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Agrega personas que puedan administrar este grupo. Deben tener una
              cuenta existente.
            </p>
            <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() =>
                    searchResults.length > 0 && setShowDropdown(true)
                  }
                  onBlur={() =>
                    setTimeout(() => setShowDropdown(false), 200)
                  }
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                  placeholder="Buscar usuario por email o nombre..."
                />
                {showDropdown && (
                  <div className="absolute z-10 top-full mt-1 w-full rounded-md border border-border bg-background shadow-sm max-h-60 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => selectCollaborator(user)}
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

              <div className="mt-6 lg:mt-0">
                {collaborators.length === 0 ? (
                  <div className="border-t border-dashed border-border py-8 text-center lg:border-t-0">
                    <p className="text-sm text-muted-foreground">
                      Sin colaboradores. Solo tú tendrás acceso de
                      administración.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {collaborators.map((user) => (
                      <div
                        key={user.id}
                        className="py-3 first:pt-0 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {user.image && (
                            <img
                              src={user.image}
                              alt=""
                              className="h-7 w-7 rounded-full shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.name ?? "Sin nombre"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCollaborator(user.id)}
                          className="shrink-0 text-xs text-destructive hover:opacity-80 transition-opacity"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Submit */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="border-t border-border pt-8 flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting || !name.trim() || !slug.trim()}
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Creando..." : "Crear grupo"}
            </button>
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
