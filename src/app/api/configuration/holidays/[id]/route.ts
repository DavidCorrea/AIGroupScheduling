import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { holidays, members } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireGroupAccess, apiError } from "@/lib/api-helpers";

/**
 * DELETE /api/configuration/holidays/[id]
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
  const holidayId = parseInt(id, 10);
  if (isNaN(holidayId)) {
    return apiError("id inválido", 400, "VALIDATION");
  }

  const existing = (await db
    .select()
    .from(holidays)
    .where(eq(holidays.id, holidayId)))[0];

  if (!existing) {
    return apiError("Fecha no encontrada", 404, "NOT_FOUND");
  }

  if (!existing.memberId) {
    return apiError("Esta fecha no es de un miembro", 400, "VALIDATION");
  }

  const member = (await db
    .select()
    .from(members)
    .where(and(eq(members.id, existing.memberId), eq(members.groupId, groupId))))[0];

  if (!member) {
    return apiError("Sin permiso", 403, "FORBIDDEN");
  }

  await db.delete(holidays).where(eq(holidays.id, holidayId));
  return new Response(null, { status: 204 });
}
