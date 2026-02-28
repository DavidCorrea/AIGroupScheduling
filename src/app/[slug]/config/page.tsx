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
      href: `/${slug}/config/events`,
      label: "Eventos",
      description: "Configura días activos, ensayos, prioridades y orden de columnas.",
    },
    {
      href: `/${slug}/config/holidays`,
      label: "Vacaciones",
      description: "Gestiona fechas de ausencia de los miembros del grupo.",
    },
    {
      href: `/${slug}/config/collaborators`,
      label: "Colaboradores",
      description: "Gestiona quién puede administrar este grupo.",
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
    <div className="space-y-12">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl uppercase">
          {groupName}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Genera cronogramas rotacionales para tu grupo.
        </p>
      </div>

      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 border border-border rounded-md overflow-hidden">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group p-6 border border-border -m-px bg-background hover:bg-muted transition-colors"
          >
            <h2 className="text-sm font-medium group-hover:text-accent transition-colors">
              {card.label}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
