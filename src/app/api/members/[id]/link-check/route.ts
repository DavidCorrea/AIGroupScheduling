import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-helpers";

/**
 * GET /api/members/[id]/link-check
 * Returns whether this member can be linked to a user (Google account) by email.
 * Only returns canLink: true when member has email, no userId, and a user exists with that email.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const memberId = parseInt(id, 10);

  const member = (await db
    .select({ id: members.id, email: members.email, userId: members.userId })
    .from(members)
    .where(eq(members.id, memberId)))[0];

  if (!member) {
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  const hasEmail = member.email && member.email.trim().length > 0;
  const notLinked = member.userId == null;

  if (!hasEmail || !notLinked) {
    return NextResponse.json({ canLink: false });
  }

  const normalizedEmail = member.email!.trim().toLowerCase();
  const user = (await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, normalizedEmail)))[0];

  if (!user) {
    return NextResponse.json({ canLink: false });
  }

  return NextResponse.json({
    canLink: true,
    user: { id: user.id, name: user.name, email: user.email },
  });
}
