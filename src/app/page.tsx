import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadUserGroups } from "@/lib/data-access";
import { getAssignments } from "@/lib/user-assignments";
import { buildConflicts } from "@/lib/dashboard-conflicts";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RootLoadingSkeleton } from "@/components/Skeletons";
import DashboardClient from "./DashboardClient";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <Suspense fallback={<RootLoadingSkeleton />}>
      <DashboardContent userId={session.user.id} />
    </Suspense>
  );
}

async function DashboardContent({ userId }: { userId: string }) {
  const [userGroups, assignments, dbUser] = await Promise.all([
    loadUserGroups(userId),
    getAssignments(userId),
    db
      .select({ isAdmin: users.isAdmin, canCreateGroups: users.canCreateGroups })
      .from(users)
      .where(eq(users.id, userId))
      .then((rows) => rows[0]),
  ]);

  const conflicts = buildConflicts(assignments);

  const groups = userGroups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    ownerId: g.ownerId,
    role: g.role,
  }));

  return (
    <DashboardClient
      groups={groups}
      assignments={assignments}
      conflicts={conflicts}
      canCreate={dbUser?.isAdmin || dbUser?.canCreateGroups || false}
    />
  );
}
