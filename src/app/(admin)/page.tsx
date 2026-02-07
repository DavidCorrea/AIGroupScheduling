import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome to Band Scheduler</h1>
        <p className="mt-2 text-muted-foreground">
          Generate fair, rotational schedules for your band. Configure members,
          roles, and availability, then generate schedules for any month.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/members"
          className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <h2 className="text-lg font-semibold">Members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add and manage band members. Assign roles and set availability.
          </p>
        </Link>

        <Link
          href="/configuration"
          className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <h2 className="text-lg font-semibold">Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure roles, active days, and manage member holidays.
          </p>
        </Link>

        <Link
          href="/schedules"
          className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <h2 className="text-lg font-semibold">Schedules</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate, preview, and share band schedules.
          </p>
        </Link>
      </div>
    </div>
  );
}
