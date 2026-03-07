import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/api-helpers";
import { loadAdminGroups } from "@/lib/data-access";

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
  const { groupId, calendarExportEnabled } = body;

  if (!groupId || typeof groupId !== "number") {
    return NextResponse.json(
      { error: "groupId es obligatorio y debe ser un número" },
      { status: 400 }
    );
  }

  const existing = (await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId)))[0];

  if (!existing) {
    return NextResponse.json(
      { error: "Grupo no encontrado" },
      { status: 404 }
    );
  }

  if (typeof calendarExportEnabled !== "boolean") {
    return NextResponse.json(
      { error: "calendarExportEnabled debe ser true o false" },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: "groupId es obligatorio y debe ser un número válido" },
      { status: 400 }
    );
  }

  const existing = (await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId)))[0];

  if (!existing) {
    return NextResponse.json(
      { error: "Grupo no encontrado" },
      { status: 404 }
    );
  }

  await db.delete(groups).where(eq(groups.id, groupId));
  return new NextResponse(null, { status: 204 });
}
