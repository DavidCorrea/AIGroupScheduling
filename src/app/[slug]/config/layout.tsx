"use client";

import Link from "next/link";
import { GroupProvider, useGroup } from "@/lib/group-context";

function AdminNav() {
  const { slug, groupName, loading, error } = useGroup();

  const navLinks = [
    { href: `/${slug}/config`, label: "Inicio" },
    { href: `/${slug}/config/members`, label: "Miembros" },
    { href: `/${slug}/config/roles`, label: "Roles" },
    { href: `/${slug}/config/configuration`, label: "Configuración" },
    { href: `/${slug}/config/schedules`, label: "Cronogramas" },
  ];

  if (loading) {
    return (
      <nav className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <span className="text-muted-foreground">Cargando...</span>
          </div>
        </div>
      </nav>
    );
  }

  if (error) {
    return (
      <nav className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <span className="text-destructive">Grupo no encontrado</span>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Grupos
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-xl font-bold text-primary">
              {groupName}
            </span>
          </div>
          <div className="flex gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GroupProvider>
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </GroupProvider>
  );
}
