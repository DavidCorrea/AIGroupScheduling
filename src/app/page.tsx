"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Group {
  id: number;
  name: string;
  slug: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  const fetchGroups = useCallback(async () => {
    const res = await fetch("/api/groups");
    setGroups(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

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
    fetchGroups();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Cronogramas</h1>
          <p className="mt-2 text-muted-foreground">
            Selecciona un grupo para gestionar o crea uno nuevo.
          </p>
        </div>

        {/* Create group form */}
        <form
          onSubmit={handleSubmit}
          className="mb-10 rounded-xl border border-border/50 bg-card p-6 shadow-[0_1px_3px_var(--shadow-color)]"
        >
          <h2 className="text-base font-semibold mb-4">Crear grupo</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="Nombre del grupo"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Slug (URL)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
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
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-110 transition-all"
          >
            Crear grupo
          </button>
        </form>

        {/* Groups list */}
        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No hay grupos creados aún.
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Usa el formulario de arriba para crear el primero.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-5 shadow-[0_1px_3px_var(--shadow-color)] hover:shadow-[0_4px_12px_var(--shadow-color)] hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{group.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">/{group.slug}</p>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <Link
                    href={`/${group.slug}/config`}
                    className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Configurar
                  </Link>
                  <Link
                    href={`/${group.slug}/cronograma`}
                    className="rounded-lg bg-primary/10 text-primary px-3.5 py-2 text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    Ver cronograma
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
