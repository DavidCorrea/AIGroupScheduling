import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { groupCollaborators, groups, users, members } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, hasGroupAccess, apiError, parseBody } from "@/lib/api-helpers";
import { loadGroupCollaborators } from "@/lib/data-access";
import { collaboratorAddSchema } from "@/lib/schemas/groups";

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
    return apiError("Sin permiso", 403, "FORBIDDEN");
  }

  const result = await loadGroupCollaborators(groupId);
  return NextResponse.json(result);
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
    return apiError("Sin permiso", 403, "FORBIDDEN");
  }

  const body = await request.json();
  const parsed = parseBody(collaboratorAddSchema, body);
  if (parsed.error) return parsed.error;
  const { userId } = parsed.data;

  const user = (await db
    .select()
    .from(users)
    .where(eq(users.id, userId)))[0];

  if (!user) {
    return apiError("Usuario no encontrado", 404, "NOT_FOUND");
  }

  const existing = (await db
    .select()
    .from(groupCollaborators)
    .where(and(eq(groupCollaborators.groupId, groupId), eq(groupCollaborators.userId, userId))))[0];

  if (existing) {
    return apiError("El usuario ya es colaborador", 409, "CONFLICT");
  }

  const group = (await db
    .select({ ownerId: groups.ownerId })
    .from(groups)
    .where(eq(groups.id, groupId)))[0];

  if (group && group.ownerId === userId) {
    return apiError("El usuario ya es dueño del grupo", 409, "CONFLICT");
  }

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
    return apiError("Solo se pueden agregar como colaboradores a miembros del grupo", 400, "VALIDATION");
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
    return apiError("Sin permiso", 403, "FORBIDDEN");
  }

  const { searchParams } = new URL(request.url);
  const collabId = searchParams.get("collabId");

  if (!collabId) {
    return apiError("Parámetro collabId es obligatorio", 400, "VALIDATION");
  }

  const parsedId = parseInt(collabId, 10);
  if (isNaN(parsedId)) {
    return apiError("collabId debe ser un número", 400, "VALIDATION");
  }

  const deleted = await db
    .delete(groupCollaborators)
    .where(and(eq(groupCollaborators.id, parsedId), eq(groupCollaborators.groupId, groupId)))
    .returning({ id: groupCollaborators.id });

  if (deleted.length === 0) {
    return apiError("Colaborador no encontrado", 404, "NOT_FOUND");
  }

  return NextResponse.json({ success: true });
}
