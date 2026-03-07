import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, memberRoles, memberAvailability, users, scheduleDateAssignments } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth, hasGroupAccess, apiError, parseBody } from "@/lib/api-helpers";
import { memberUpdateSchema } from "@/lib/schemas/members";
import { loadMemberById } from "@/lib/data-access";

function normalizeHHMM(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const memberId = parseInt(id, 10);

  const member = await loadMemberById(memberId);
  if (!member) {
    return apiError("Miembro no encontrado", 404, "NOT_FOUND");
  }

  const access = await hasGroupAccess(authResult.user.id, member.groupId);
  if (!access) {
    return apiError("Forbidden", 403, "FORBIDDEN");
  }

  return NextResponse.json(member);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const memberId = parseInt(id, 10);
  const body = await request.json();
  const parsed = parseBody(memberUpdateSchema, body);
  if (parsed.error) return parsed.error;
  const { name, email, userId, roleIds, availableDayIds, availability: availabilityBody } = parsed.data;

  const existing = (await db
    .select()
    .from(members)
    .where(eq(members.id, memberId)))[0];

  if (!existing) {
    return apiError("Miembro no encontrado", 404, "NOT_FOUND");
  }

  const access = await hasGroupAccess(authResult.user.id, existing.groupId);
  if (!access) {
    return apiError("Forbidden", 403, "FORBIDDEN");
  }

  // Build update fields
  const updateFields: Record<string, unknown> = {};

  if (name !== undefined) {
    updateFields.name = name;
  }

  // email can be set or cleared
  if (email !== undefined) {
    const normalizedEmail = email && typeof email === "string" ? email.trim().toLowerCase() : null;
    updateFields.email = normalizedEmail;

    // If client didn't explicitly send userId, try to link member to a user by email (e.g. Google account)
    if (userId === undefined) {
      if (normalizedEmail) {
        const userByEmail = (await db.select().from(users).where(eq(users.email, normalizedEmail)))[0];
        if (userByEmail) {
          updateFields.userId = userByEmail.id;
          updateFields.email = userByEmail.email.toLowerCase().trim();
        } else {
          updateFields.userId = null;
        }
      } else {
        updateFields.userId = null;
      }
    }
  }

  // userId can be set (link), or null (unlink)
  if (userId !== undefined) {
    if (userId === null) {
      updateFields.userId = null;
    } else {
      const user = (await db
        .select()
        .from(users)
        .where(eq(users.id, userId)))[0];

      if (!user) {
        return apiError("Usuario no encontrado", 404, "NOT_FOUND");
      }
      updateFields.userId = userId;
      if (user.email) {
        updateFields.email = user.email.toLowerCase().trim();
      }
    }
  }

  // Check for duplicate email within the group
  const effectiveEmail = updateFields.email as string | null | undefined;
  if (effectiveEmail) {
    const duplicate = (await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.groupId, existing.groupId),
          eq(members.email, effectiveEmail),
          ne(members.id, memberId)
        )
      ))[0];
    if (duplicate) {
      return apiError("Ya existe un miembro con ese email en este grupo", 409, "CONFLICT");
    }
  }

  if (Object.keys(updateFields).length > 0) {
    await db.update(members)
      .set(updateFields)
      .where(eq(members.id, memberId));
  }

  if (roleIds !== undefined) {
    await db.delete(memberRoles)
      .where(eq(memberRoles.memberId, memberId));
    for (const roleId of roleIds) {
      await db.insert(memberRoles)
        .values({ memberId, roleId });
    }
  }

  if (availableDayIds !== undefined || availabilityBody !== undefined) {
    await db.delete(memberAvailability)
      .where(eq(memberAvailability.memberId, memberId));

    const toInsert: { memberId: number; weekdayId: number; startTimeUtc: string; endTimeUtc: string }[] = [];

    if (Array.isArray(availabilityBody) && availabilityBody.length > 0) {
      for (const a of availabilityBody) {
        const weekdayId = a.weekdayId != null ? Number(a.weekdayId) : NaN;
        if (!Number.isInteger(weekdayId) || weekdayId < 1) continue;
        const start = normalizeHHMM(a.startTimeUtc) ?? "00:00";
        const end = normalizeHHMM(a.endTimeUtc) ?? "23:59";
        toInsert.push({ memberId, weekdayId, startTimeUtc: start, endTimeUtc: end });
      }
    } else if (Array.isArray(availableDayIds)) {
      for (const dayId of availableDayIds) {
        const weekdayId = Number(dayId);
        if (!Number.isInteger(weekdayId) || weekdayId < 1) continue;
        toInsert.push({ memberId, weekdayId, startTimeUtc: "00:00", endTimeUtc: "23:59" });
      }
    }

    for (const row of toInsert) {
      await db.insert(memberAvailability)
        .values(row);
    }
  }

  // Return updated member with user info
  const updated = (await db
    .select({
      id: members.id,
      name: members.name,
      memberEmail: members.email,
      userId: members.userId,
      groupId: members.groupId,
      userEmail: users.email,
      userImage: users.image,
      userName: users.name,
    })
    .from(members)
    .leftJoin(users, eq(members.userId, users.id))
    .where(eq(members.id, memberId)))[0];

  const updatedRoles = await db
    .select()
    .from(memberRoles)
    .where(eq(memberRoles.memberId, memberId));

  const updatedAvailability = await db
    .select({
      weekdayId: memberAvailability.weekdayId,
      startTimeUtc: memberAvailability.startTimeUtc,
      endTimeUtc: memberAvailability.endTimeUtc,
    })
    .from(memberAvailability)
    .where(eq(memberAvailability.memberId, memberId));

  return NextResponse.json({
    id: updated?.id,
    name: updated?.name,
    memberEmail: updated?.memberEmail ?? null,
    userId: updated?.userId,
    groupId: updated?.groupId,
    email: updated?.userEmail ?? null,
    image: updated?.userImage ?? null,
    userName: updated?.userName ?? null,
    roleIds: updatedRoles.map((r) => r.roleId),
    availability: updatedAvailability.map((a) => ({
      weekdayId: a.weekdayId,
      startTimeUtc: a.startTimeUtc ?? "00:00",
      endTimeUtc: a.endTimeUtc ?? "23:59",
    })),
    availableDayIds: [...new Set(updatedAvailability.map((a) => a.weekdayId))],
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const memberId = parseInt(id, 10);

  const existing = (await db
    .select()
    .from(members)
    .where(eq(members.id, memberId)))[0];

  if (!existing) {
    return apiError("Miembro no encontrado", 404, "NOT_FOUND");
  }

  const access = await hasGroupAccess(authResult.user.id, existing.groupId);
  if (!access) {
    return apiError("Forbidden", 403, "FORBIDDEN");
  }

  // Check if member has schedule assignments
  const assignments = await db
    .select({ id: scheduleDateAssignments.id })
    .from(scheduleDateAssignments)
    .where(eq(scheduleDateAssignments.memberId, memberId))
    .limit(1);

  if (assignments.length > 0) {
    return apiError(
      "No se puede eliminar este miembro porque tiene asignaciones en cronogramas existentes. Edita los cronogramas primero.",
      409,
      "CONFLICT"
    );
  }

  await db.delete(members).where(eq(members.id, memberId));

  return NextResponse.json({ success: true });
}
