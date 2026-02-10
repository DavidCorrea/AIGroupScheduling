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
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Cronogramas</h1>
          <p className="mt-2 text-muted-foreground">
            Selecciona un grupo para gestionar o crea uno nuevo.
          </p>
        </div>

        {/* Create group form */}
        <form
          onSubmit={handleSubmit}
          className="mb-8 space-y-4 rounded-lg border border-border bg-card p-6"
        >
          <h2 className="text-lg font-semibold">Crear grupo</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nombre del grupo"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug (URL)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="slug-del-grupo"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Crear grupo
          </button>
        </form>

        {/* Groups list */}
        <div className="space-y-3">
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay grupos creados. Usa el formulario de arriba para crear el primero.
            </p>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div>
                  <h3 className="font-semibold">{group.name}</h3>
                  <p className="text-sm text-muted-foreground">/{group.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/${group.slug}/config`}
                    className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    Configurar
                  </Link>
                  <Link
                    href={`/${group.slug}/cronograma`}
                    className="rounded-md border border-primary text-primary px-3 py-1.5 text-sm hover:bg-accent transition-colors"
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
