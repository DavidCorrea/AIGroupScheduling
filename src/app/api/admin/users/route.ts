import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, parseBody, apiError } from "@/lib/api-helpers";
import { loadAdminUsers } from "@/lib/data-access";
import { adminUserUpdateSchema } from "@/lib/schemas/admin";

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (adminResult.error) return adminResult.error;

  const allUsers = await loadAdminUsers();
  return NextResponse.json(allUsers);
}

export async function PUT(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (adminResult.error) return adminResult.error;

  const body = await request.json();
  const parsed = parseBody(adminUserUpdateSchema, body);
  if (parsed.error) return parsed.error;
  const { userId, isAdmin, canCreateGroups, canExportCalendars } = parsed.data;

  const existing = (await db
    .select()
    .from(users)
    .where(eq(users.id, userId)))[0];

  if (!existing) {
    return apiError("Usuario no encontrado", 404, "NOT_FOUND");
  }

  const updateFields: Record<string, unknown> = {};
  if (typeof isAdmin === "boolean") updateFields.isAdmin = isAdmin;
  if (typeof canCreateGroups === "boolean") updateFields.canCreateGroups = canCreateGroups;
  if (typeof canExportCalendars === "boolean") updateFields.canExportCalendars = canExportCalendars;

  if (Object.keys(updateFields).length === 0) {
    return apiError("No hay campos para actualizar", 400, "VALIDATION");
  }

  await db.update(users)
    .set(updateFields)
    .where(eq(users.id, userId));

  const updated = (await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      isAdmin: users.isAdmin,
      canCreateGroups: users.canCreateGroups,
      canExportCalendars: users.canExportCalendars,
    })
    .from(users)
    .where(eq(users.id, userId)))[0];

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (adminResult.error) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return apiError("id es obligatorio", 400, "VALIDATION");
  }

  const existing = (await db
    .select()
    .from(users)
    .where(eq(users.id, userId)))[0];

  if (!existing) {
    return apiError("Usuario no encontrado", 404, "NOT_FOUND");
  }

  await db.delete(users).where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
