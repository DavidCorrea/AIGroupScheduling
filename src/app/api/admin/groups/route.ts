import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, parseBody, apiError } from "@/lib/api-helpers";
import { loadAdminGroups } from "@/lib/data-access";
import { adminGroupPatchSchema } from "@/lib/schemas/admin";

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (adminResult.error) return adminResult.error;

  const result = await loadAdminGroups();
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (adminResult.error) return adminResult.error;

  const body = await request.json();
  const parsed = parseBody(adminGroupPatchSchema, body);
  if (parsed.error) return parsed.error;
  const { groupId, calendarExportEnabled } = parsed.data;

  const existing = (await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId)))[0];

  if (!existing) {
    return apiError("Grupo no encontrado", 404, "NOT_FOUND");
  }

  await db
    .update(groups)
    .set({ calendarExportEnabled })
    .where(eq(groups.id, groupId));

  const updated = (await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      ownerId: groups.ownerId,
      calendarExportEnabled: groups.calendarExportEnabled,
    })
    .from(groups)
    .where(eq(groups.id, groupId)))[0];

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (adminResult.error) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const groupIdParam = searchParams.get("groupId");
  const groupId = groupIdParam != null ? parseInt(groupIdParam, 10) : NaN;

  if (Number.isNaN(groupId) || groupId < 1) {
    return apiError("groupId es obligatorio y debe ser un número válido", 400, "VALIDATION");
  }

  const existing = (await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId)))[0];

  if (!existing) {
    return apiError("Grupo no encontrado", 404, "NOT_FOUND");
  }

  await db.delete(groups).where(eq(groups.id, groupId));
  return new NextResponse(null, { status: 204 });
}
