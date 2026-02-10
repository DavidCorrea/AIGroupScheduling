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
        <div className="mb-12">
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl uppercase">Cronogramas</h1>
          <p className="mt-3 text-muted-foreground">
            Selecciona un grupo para gestionar o crea uno nuevo.
          </p>
        </div>

        {/* Create group form */}
        <div className="mb-12 border-t border-border pt-8">
          <h2 className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-6">Crear grupo</h2>
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

        {/* Groups list */}
        <div>
          {groups.length === 0 ? (
            <div className="border-t border-dashed border-border py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No hay grupos creados aún.
              </p>
              <p className="text-muted-foreground/50 text-xs mt-1">
                Usa el formulario de arriba para crear el primero.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="py-5 first:pt-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{group.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">/{group.slug}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link
                        href={`/${group.slug}/config`}
                        className="flex-1 sm:flex-none text-center rounded-md border border-border px-4 py-2 text-sm hover:border-foreground transition-colors"
                      >
                        Configurar
                      </Link>
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
      </div>
    </div>
  );
}
