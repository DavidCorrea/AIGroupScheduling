import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { exclusiveGroups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireGroupAccess, apiError } from "@/lib/api-helpers";

/**
 * DELETE /api/configuration/exclusive-groups/[id]
 * Query: ?groupId=N or ?slug=xxx (required for auth and group scope).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const { id } = await params;
  const exGroupId = parseInt(id, 10);
  if (isNaN(exGroupId)) {
    return apiError("id inválido", 400, "VALIDATION");
  }

  const existing = (await db
    .select()
    .from(exclusiveGroups)
    .where(eq(exclusiveGroups.id, exGroupId)))[0];

  if (!existing) {
    return apiError("Grupo no encontrado", 404, "NOT_FOUND");
  }

  if (existing.groupId !== groupId) {
    return apiError("Sin permiso", 403, "FORBIDDEN");
  }

  await db.delete(exclusiveGroups).where(eq(exclusiveGroups.id, exGroupId));
  return new Response(null, { status: 204 });
}
