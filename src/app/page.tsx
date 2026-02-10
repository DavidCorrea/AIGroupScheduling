"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Group {
  id: number;
  name: string;
  slug: string;
  ownerId: string;
  role: "owner" | "collaborator" | "member";
}

interface Assignment {
  date: string;
  roleName: string;
  groupName: string;
  groupSlug: string;
  groupId: number;
}

interface Conflict {
  date: string;
  groups: string[];
}

interface DashboardData {
  assignments: Assignment[];
  conflicts: Conflict[];
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Dueño",
  collaborator: "Colaborador",
  member: "Miembro",
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default function HomePage() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  const canCreate = session?.user?.isAdmin || session?.user?.canCreateGroups || false;

  const fetchData = useCallback(async () => {
    const [groupsRes, dashboardRes] = await Promise.all([
      fetch("/api/groups"),
      fetch("/api/user/dashboard"),
    ]);
    setGroups(await groupsRes.json());
    setDashboard(await dashboardRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !slug.trim()) return;

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al crear el grupo");
      return;
    }

    setName("");
    setSlug("");
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  const conflictDates = new Set(dashboard?.conflicts.map((c) => c.date) ?? []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {/* Header */}
        <div className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl uppercase">
              Cronogramas
            </h1>
            <p className="mt-3 text-muted-foreground">
              Tus grupos y próximas asignaciones.
            </p>
          </div>
          <Link
            href="/settings"
            className="shrink-0 rounded-md border border-border px-4 py-2 text-sm hover:border-foreground transition-colors"
          >
            Ajustes
          </Link>
        </div>

        {/* Create group form */}
        {canCreate ? (
          <div className="mb-12 border-t border-border pt-8">
            <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-6">
              Crear grupo
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">
                    Nombre
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

              {error && (
                <p className="mt-3 text-sm text-destructive">{error}</p>
              )}

              <button
                type="submit"
                className="mt-5 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Crear grupo
              </button>
            </form>
          </div>
        ) : null}

        {/* Groups list */}
        <div className="mb-12">
          <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-6">
            Mis grupos
          </h2>
          {groups.length === 0 ? (
            <div className="border-t border-dashed border-border py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No perteneces a ningún grupo aún.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {groups.map((group) => (
                <div key={group.id} className="py-5 first:pt-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{group.name}</h3>
                        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {ROLE_LABELS[group.role]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        /{group.slug}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {(group.role === "owner" || group.role === "collaborator") && (
                        <Link
                          href={`/${group.slug}/config`}
                          className="flex-1 sm:flex-none text-center rounded-md border border-border px-4 py-2 text-sm hover:border-foreground transition-colors"
                        >
                          Configurar
                        </Link>
                      )}
                      <Link
                        href={`/${group.slug}/cronograma`}
                        className="flex-1 sm:flex-none text-center rounded-md border border-foreground px-4 py-2 text-sm font-medium hover:bg-foreground hover:text-background transition-colors"
                      >
                        Ver cronograma
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming assignments */}
        {dashboard && dashboard.assignments.length > 0 && (
          <div>
            <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-6">
              Próximas asignaciones
            </h2>

            {dashboard.conflicts.length > 0 && (
              <div className="mb-6 border border-destructive/30 rounded-md p-4">
                <p className="text-sm font-medium text-destructive mb-2">
                  Conflictos detectados
                </p>
                <ul className="space-y-1">
                  {dashboard.conflicts.map((conflict) => (
                    <li
                      key={conflict.date}
                      className="text-sm text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">
                        {formatDate(conflict.date)}
                      </span>{" "}
                      — {conflict.groups.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="divide-y divide-border">
              {dashboard.assignments.slice(0, 20).map((assignment, idx) => (
                <div
                  key={`${assignment.date}-${assignment.roleName}-${idx}`}
                  className={`py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${
                    conflictDates.has(assignment.date) ? "text-destructive" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium min-w-[120px]">
                      {formatDate(assignment.date)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {assignment.roleName}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {assignment.groupName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
