import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { groups, groupCollaborators, members, users, scheduleDays, roles } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { seedDefaults } from "@/lib/seed";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;
  const userId = authResult.user.id;

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (slug) {
    const group = (await db
      .select()
      .from(groups)
      .where(eq(groups.slug, slug)))[0];

    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    return NextResponse.json(group);
  }

  // Get groups the user owns
  const ownedGroups = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.ownerId, userId));

  // Get groups the user collaborates on
  const collabGroups = await db
    .select({ groupId: groupCollaborators.groupId })
    .from(groupCollaborators)
    .where(eq(groupCollaborators.userId, userId));

  // Get groups the user is a member of
  const memberGroups = await db
    .select({ groupId: members.groupId })
    .from(members)
    .where(eq(members.userId, userId));

  const groupIds = [
    ...new Set([
      ...ownedGroups.map((g) => g.id),
      ...collabGroups.map((g) => g.groupId),
      ...memberGroups.map((g) => g.groupId),
    ]),
  ];

  if (groupIds.length === 0) {
    return NextResponse.json([]);
  }

  const allGroups = await db
    .select()
    .from(groups)
    .where(inArray(groups.id, groupIds))
    .orderBy(groups.name);

  // Annotate each group with the user's role
  const result = allGroups.map((g) => ({
    ...g,
    role: g.ownerId === userId
      ? "owner"
      : collabGroups.some((c) => c.groupId === g.id)
        ? "collaborator"
        : "member",
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;
  const userId = authResult.user.id;

  // Check if user has permission to create groups
  const dbUser = (await db
    .select({ isAdmin: users.isAdmin, canCreateGroups: users.canCreateGroups })
    .from(users)
    .where(eq(users.id, userId)))[0];

  if (!dbUser || (!dbUser.isAdmin && !dbUser.canCreateGroups)) {
    return NextResponse.json(
      { error: "No tienes permisos para crear grupos" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, slug, days, roles: rolesList, collaboratorUserIds } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "El nombre es obligatorio" },
      { status: 400 }
    );
  }

  if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
    return NextResponse.json(
      { error: "El slug es obligatorio" },
      { status: 400 }
    );
  }

  if (!/^[a-z0-9-]+$/.test(slug.trim())) {
    return NextResponse.json(
      { error: "El slug solo puede contener letras minúsculas, números y guiones" },
      { status: 400 }
    );
  }

  const existing = (await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug.trim())))[0];

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un grupo con ese slug" },
      { status: 409 }
    );
  }

  const group = (await db
    .insert(groups)
    .values({ name: name.trim(), slug: slug.trim(), ownerId: userId })
    .returning())[0];

  if (Array.isArray(days) && days.length > 0) {
    for (const d of days) {
      await db.insert(scheduleDays).values({
        dayOfWeek: d.dayOfWeek,
        active: d.active,
        isRehearsal: d.isRehearsal,
        groupId: group.id,
      });
    }
  } else {
    await seedDefaults(group.id);
  }

  if (Array.isArray(rolesList) && rolesList.length > 0) {
    for (let i = 0; i < rolesList.length; i++) {
      const r = rolesList[i];
      if (r.name && typeof r.name === "string" && r.name.trim()) {
        await db.insert(roles).values({
          name: r.name.trim(),
          requiredCount: r.requiredCount ?? 1,
          displayOrder: i,
          groupId: group.id,
        });
      }
    }
  }

  if (Array.isArray(collaboratorUserIds) && collaboratorUserIds.length > 0) {
    for (const uid of collaboratorUserIds) {
      if (uid !== userId) {
        await db.insert(groupCollaborators).values({
          userId: uid,
          groupId: group.id,
        });
      }
    }
  }

  return NextResponse.json(group, { status: 201 });
}
