import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Bienvenido a Cronogramas</h1>
        <p className="mt-2 text-muted-foreground">
          Genera cronogramas justos y rotacionales para tu banda. Configura miembros, roles y disponibilidad, luego genera cronogramas para cualquier mes.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/members"
          className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <h2 className="text-lg font-semibold">Miembros</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Agrega y gestiona los miembros de la banda. Asigna roles y configura disponibilidad.
          </p>
        </Link>

        <Link
          href="/configuration"
          className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <h2 className="text-lg font-semibold">Configuración</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura roles, días activos y gestiona vacaciones de miembros.
          </p>
        </Link>

        <Link
          href="/schedules"
          className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <h2 className="text-lg font-semibold">Cronogramas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Genera, previsualiza y comparte los cronogramas de la banda.
          </p>
        </Link>
      </div>
    </div>
  );
}
