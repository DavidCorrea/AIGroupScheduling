"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GroupProvider, useGroup } from "@/lib/group-context";

function AdminNav() {
  const { slug, groupName, loading, error } = useGroup();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: `/${slug}/config`, label: "Inicio", exact: true },
    { href: `/${slug}/config/members`, label: "Miembros" },
    { href: `/${slug}/config/roles`, label: "Roles" },
    { href: `/${slug}/config/configuration`, label: "Configuración" },
    { href: `/${slug}/config/schedules`, label: "Cronogramas" },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  if (loading) {
    return (
      <nav className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center">
            <span className="text-muted-foreground text-sm">Cargando...</span>
          </div>
        </div>
      </nav>
    );
  }

  if (error) {
    return (
      <nav className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center">
            <span className="text-destructive text-sm">Grupo no encontrado</span>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-border sticky top-0 z-40 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              ← Grupos
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium text-foreground truncate uppercase tracking-wide">
              {groupName}
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border py-2 pb-3">
            {navLinks.map((link) => {
              const active = isActive(link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
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
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {children}
      </main>
    </GroupProvider>
  );
}
