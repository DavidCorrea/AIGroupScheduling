import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { groupCollaborators, groups, users, members } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, hasGroupAccess } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id, 10);

  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const access = await hasGroupAccess(authResult.user.id, groupId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const collabs = await db
    .select({
      id: groupCollaborators.id,
      userId: groupCollaborators.userId,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(groupCollaborators)
    .innerJoin(users, eq(groupCollaborators.userId, users.id))
    .where(eq(groupCollaborators.groupId, groupId));

  // Also get the owner info
  const group = (await db
    .select({ ownerId: groups.ownerId })
    .from(groups)
    .where(eq(groups.id, groupId)))[0];

  const owner = group
    ? (await db
        .select({ id: users.id, name: users.name, email: users.email, image: users.image })
        .from(users)
        .where(eq(users.id, group.ownerId)))[0]
    : null;

  return NextResponse.json({ owner, collaborators: collabs });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id, 10);

  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const access = await hasGroupAccess(authResult.user.id, groupId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { userId } = body;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json(
      { error: "userId es obligatorio" },
      { status: 400 }
    );
  }

  // Verify user exists
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

  // Check not already a collaborator
  const existing = (await db
    .select()
    .from(groupCollaborators)
    .where(and(eq(groupCollaborators.groupId, groupId), eq(groupCollaborators.userId, userId))))[0];

  if (existing) {
    return NextResponse.json(
      { error: "El usuario ya es colaborador" },
      { status: 409 }
    );
  }

  // Check not the owner
  const group = (await db
    .select({ ownerId: groups.ownerId })
    .from(groups)
    .where(eq(groups.id, groupId)))[0];

  if (group && group.ownerId === userId) {
    return NextResponse.json(
      { error: "El usuario ya es dueño del grupo" },
      { status: 409 }
    );
  }

  // Must be a member of the group (linked by userId) to be added as collaborator
  const groupMember = (await db
    .select({ id: members.id })
    .from(members)
    .where(
      and(
        eq(members.groupId, groupId),
        eq(members.userId, userId)
      )
    ))[0];

  if (!groupMember) {
    return NextResponse.json(
      { error: "Solo se pueden agregar como colaboradores a miembros del grupo" },
      { status: 400 }
    );
  }

  const collab = (await db
    .insert(groupCollaborators)
    .values({ userId, groupId })
    .returning())[0];

  return NextResponse.json(
    { ...collab, userName: user.name, userEmail: user.email, userImage: user.image },
    { status: 201 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id, 10);

  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const access = await hasGroupAccess(authResult.user.id, groupId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const collabId = searchParams.get("collabId");

  if (!collabId) {
    return NextResponse.json(
      { error: "collabId query parameter is required" },
      { status: 400 }
    );
  }

  await db.delete(groupCollaborators).where(eq(groupCollaborators.id, parseInt(collabId, 10)));

  return NextResponse.json({ success: true });
}
