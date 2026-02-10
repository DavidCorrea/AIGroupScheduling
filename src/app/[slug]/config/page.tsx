"use client";

import Link from "next/link";
import { useGroup } from "@/lib/group-context";

export default function AdminHome() {
  const { slug, groupName, loading, error } = useGroup();

  if (loading) return <p className="text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-destructive">Grupo no encontrado</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Bienvenido a {groupName}</h1>
        <p className="mt-2 text-muted-foreground">
          Genera cronogramas justos y rotacionales para tu grupo. Configura miembros, roles y disponibilidad, luego genera cronogramas para cualquier mes.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={`/${slug}/config/members`}
          className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <h2 className="text-lg font-semibold">Miembros</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Agrega y gestiona los miembros del grupo. Asigna roles y configura disponibilidad.
          </p>
        </Link>

        <Link
          href={`/${slug}/config/roles`}
          className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <h2 className="text-lg font-semibold">Roles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define roles, cantidades requeridas y grupos exclusivos.
          </p>
        </Link>

        <Link
          href={`/${slug}/config/configuration`}
          className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <h2 className="text-lg font-semibold">Configuración</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura días activos y gestiona vacaciones de miembros.
          </p>
        </Link>

        <Link
          href={`/${slug}/config/schedules`}
          className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <h2 className="text-lg font-semibold">Cronogramas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Genera, previsualiza y comparte los cronogramas del grupo.
          </p>
        </Link>

        <Link
          href={`/${slug}/cronograma`}
          className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <h2 className="text-lg font-semibold">Vista Pública</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ver el cronograma del mes actual como lo ven los miembros.
          </p>
        </Link>
      </div>
    </div>
  );
}
