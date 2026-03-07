import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAssignments } from "@/lib/user-assignments";
import { buildConflicts } from "@/lib/dashboard-conflicts";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RootLoadingSkeleton } from "@/components/Skeletons";
import AssignmentsClient from "./AssignmentsClient";

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <Suspense fallback={<RootLoadingSkeleton />}>
      <AssignmentsContent userId={session.user.id} />
    </Suspense>
  );
}

async function AssignmentsContent({ userId }: { userId: string }) {
  const [assignments, dbUser] = await Promise.all([
    getAssignments(userId),
    db
      .select({ canExportCalendars: users.canExportCalendars })
      .from(users)
      .where(eq(users.id, userId))
      .then((rows) => rows[0]),
  ]);

  const conflicts = buildConflicts(assignments);

  return (
    <AssignmentsClient
      assignments={assignments}
      conflicts={conflicts}
      canExportCalendars={dbUser?.canExportCalendars ?? false}
    />
  );
}
