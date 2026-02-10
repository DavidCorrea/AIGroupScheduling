"use client";

import Link from "next/link";
import { useGroup } from "@/lib/group-context";

export default function AdminHome() {
  const { slug, groupName, loading, error } = useGroup();

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">Grupo no encontrado</p>;

  const cards = [
    {
      href: `/${slug}/config/members`,
      label: "Miembros",
      description: "Agrega y gestiona los miembros del grupo. Asigna roles y configura disponibilidad.",
    },
    {
      href: `/${slug}/config/roles`,
      label: "Roles",
      description: "Define roles, cantidades requeridas y grupos exclusivos.",
    },
    {
      href: `/${slug}/config/configuration`,
      label: "Configuración",
      description: "Configura días activos y gestiona vacaciones de miembros.",
    },
    {
      href: `/${slug}/config/schedules`,
      label: "Cronogramas",
      description: "Genera, previsualiza y comparte los cronogramas del grupo.",
    },
    {
      href: `/${slug}/cronograma`,
      label: "Vista Pública",
      description: "Ver el cronograma del mes actual como lo ven los miembros.",
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bienvenido a {groupName}</h1>
        <p className="mt-2 text-muted-foreground">
          Genera cronogramas justos y rotacionales para tu grupo. Configura miembros, roles y disponibilidad, luego genera cronogramas para cualquier mes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-xl border border-border/50 bg-card p-6 shadow-[0_1px_3px_var(--shadow-color)] hover:shadow-[0_4px_12px_var(--shadow-color)] hover:-translate-y-0.5 transition-all duration-200"
          >
            <h2 className="text-base font-semibold group-hover:text-primary transition-colors">
              {card.label}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
