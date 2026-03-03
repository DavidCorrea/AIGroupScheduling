import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles, scheduleDateAssignments, eventRolePriorities } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireGroupAccess, apiError, parseBody } from "@/lib/api-helpers";
import { roleCreateSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const allRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.groupId, groupId))
    .orderBy(roles.displayOrder);
  return NextResponse.json(allRoles);
}

export async function POST(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const raw = await request.json();
  const parsed = parseBody(roleCreateSchema, raw);
  if (parsed.error) return parsed.error;
  const { name, requiredCount = 1, dependsOnRoleId, exclusiveGroupId, isRelevant = false } = parsed.data;

  // Assign displayOrder = max(existing) + 1 so new roles appear at the end
  const maxResult = (await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${roles.displayOrder}), -1)` })
    .from(roles)
    .where(eq(roles.groupId, groupId)))[0];
  const nextOrder = (maxResult?.maxOrder ?? -1) + 1;

  const insertValues: Record<string, unknown> = {
    name,
    requiredCount,
    displayOrder: nextOrder,
    groupId,
    isRelevant,
  };
  if (dependsOnRoleId !== undefined) insertValues.dependsOnRoleId = dependsOnRoleId;
  if (exclusiveGroupId !== undefined) insertValues.exclusiveGroupId = exclusiveGroupId;

  const role = (await db
    .insert(roles)
    .values(insertValues as typeof roles.$inferInsert)
    .returning())[0];

  return NextResponse.json(role, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const body = await request.json();
  const { id, name, requiredCount, dependsOnRoleId, exclusiveGroupId, isRelevant } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Role id is required" },
      { status: 400 }
    );
  }

  const existing = (await db.select().from(roles).where(eq(roles.id, id)))[0];
  if (!existing) {
    return apiError("Role not found", 404, "NOT_FOUND");
  }
  if (existing.groupId !== groupId) {
    return apiError("Forbidden", 403, "FORBIDDEN");
  }

  const updates: Partial<{ name: string; requiredCount: number; dependsOnRoleId: number | null; exclusiveGroupId: number | null; isRelevant: boolean }> = {};
  if (name !== undefined) updates.name = name.trim();
  if (requiredCount !== undefined) updates.requiredCount = requiredCount;
  if (dependsOnRoleId !== undefined) updates.dependsOnRoleId = dependsOnRoleId;
  if (exclusiveGroupId !== undefined) updates.exclusiveGroupId = exclusiveGroupId;
  if (typeof isRelevant === "boolean") updates.isRelevant = isRelevant;

  await db.update(roles).set(updates).where(eq(roles.id, id));

  const updated = (await db.select().from(roles).where(eq(roles.id, id)))[0];
  return NextResponse.json(updated);
}

/**
 * PATCH: Batch reorder roles. Accepts an array of { id, displayOrder } pairs.
 */
export async function PATCH(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const body = await request.json();
  const { order } = body;

  if (!Array.isArray(order)) {
    return NextResponse.json(
      { error: "order array is required" },
      { status: 400 }
    );
  }

  for (const item of order) {
    if (typeof item.id !== "number" || typeof item.displayOrder !== "number") {
      return NextResponse.json(
        { error: "Each item must have id and displayOrder as numbers" },
        { status: 400 }
      );
    }
    await db.update(roles)
      .set({ displayOrder: item.displayOrder })
      .where(eq(roles.id, item.id));
  }

  const allRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.groupId, groupId))
    .orderBy(roles.displayOrder);
  return NextResponse.json(allRoles);
}

export async function DELETE(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Role id is required" },
      { status: 400 }
    );
  }

  const roleId = parseInt(id, 10);

  const existing = (await db.select().from(roles).where(eq(roles.id, roleId)))[0];
  if (!existing) {
    return apiError("Role not found", 404, "NOT_FOUND");
  }
  if (existing.groupId !== groupId) {
    return apiError("Forbidden", 403, "FORBIDDEN");
  }

  // Cascade: delete schedule entries referencing this role
  await db.delete(scheduleDateAssignments)
    .where(eq(scheduleDateAssignments.roleId, roleId));

  await db.delete(eventRolePriorities)
    .where(eq(eventRolePriorities.roleId, roleId));

  // Delete the role itself (member_roles cascade via schema)
  await db.delete(roles).where(eq(roles.id, roleId));

  return NextResponse.json({ success: true });
}
