import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, memberRoles, memberAvailability, users, scheduleEntries } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const memberId = parseInt(id, 10);

  const member = (await db
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

  if (!member) {
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  const roles = await db
    .select()
    .from(memberRoles)
    .where(eq(memberRoles.memberId, memberId));

  const availability = await db
    .select()
    .from(memberAvailability)
    .where(eq(memberAvailability.memberId, memberId));

  return NextResponse.json({
    id: member.id,
    name: member.name,
    memberEmail: member.memberEmail,
    userId: member.userId,
    groupId: member.groupId,
    email: member.userEmail,
    image: member.userImage,
    userName: member.userName,
    roleIds: roles.map((r) => r.roleId),
    availableDayIds: availability.map((a) => a.scheduleDayId),
  });
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
  const { name, email, userId, roleIds, availableDayIds } = body;

  const existing = (await db
    .select()
    .from(members)
    .where(eq(members.id, memberId)))[0];

  if (!existing) {
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  // Build update fields
  const updateFields: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre no puede estar vacío" },
        { status: 400 }
      );
    }
    updateFields.name = name.trim();
  }

  // email can be set or cleared
  if (email !== undefined) {
    updateFields.email = email && typeof email === "string" ? email.trim().toLowerCase() : null;
  }

  // userId can be set (link), or null (unlink)
  if (userId !== undefined) {
    if (userId === null) {
      // Unlink user
      updateFields.userId = null;
    } else if (typeof userId === "string") {
      // Link user — verify user exists
      const user = (await db
        .select()
        .from(users)
        .where(eq(users.id, userId)))[0];

      if (!user) {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }
      updateFields.userId = userId;
      // Auto-populate email from linked user
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
      return NextResponse.json(
        { error: "Ya existe un miembro con ese email en este grupo" },
        { status: 409 }
      );
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

  if (availableDayIds !== undefined) {
    await db.delete(memberAvailability)
      .where(eq(memberAvailability.memberId, memberId));
    for (const dayId of availableDayIds) {
      await db.insert(memberAvailability)
        .values({ memberId, scheduleDayId: dayId });
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
    .select()
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
    availableDayIds: updatedAvailability.map((a) => a.scheduleDayId),
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
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  // Check if member has schedule assignments
  const assignments = await db
    .select({ id: scheduleEntries.id })
    .from(scheduleEntries)
    .where(eq(scheduleEntries.memberId, memberId))
    .limit(1);

  if (assignments.length > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar este miembro porque tiene asignaciones en cronogramas existentes. Edita los cronogramas primero." },
      { status: 409 }
    );
  }

  await db.delete(members).where(eq(members.id, memberId));

  return NextResponse.json({ success: true });
}
