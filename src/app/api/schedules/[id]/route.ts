import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schedules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, hasGroupAccess, apiError, parseBody } from "@/lib/api-helpers";
import { scheduleActionSchema } from "@/lib/schemas/schedules";
import { loadScheduleDetail } from "@/lib/data-access";
import { revalidateCronograma } from "@/lib/public-schedule";
import {
  commitSchedule,
  swapAssignment,
  removeAssignment,
  assignMember,
  unassignMember,
  bulkUpdateAssignments,
  rebuildSchedule,
  addScheduleDate,
  updateScheduleDate,
  removeScheduleDate,
} from "@/lib/schedule-actions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const scheduleId = parseInt(id, 10);

  const detail = await loadScheduleDetail(scheduleId);
  if (!detail) {
    return apiError("Cronograma no encontrado", 404, "NOT_FOUND");
  }

  const access = await hasGroupAccess(authResult.user.id, detail.groupId);
  if (!access) {
    return apiError("Sin permiso", 403, "FORBIDDEN");
  }

  return NextResponse.json(detail);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const scheduleId = parseInt(id, 10);
  const rawBody = await request.json();
  const parsed = parseBody(scheduleActionSchema, rawBody);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const schedule = (await db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId)))[0];

  if (!schedule) {
    return apiError("Cronograma no encontrado", 404, "NOT_FOUND");
  }

  const putAccess = await hasGroupAccess(authResult.user.id, schedule.groupId);
  if (!putAccess) {
    return apiError("Sin permiso", 403, "FORBIDDEN");
  }

  const ctx = {
    scheduleId,
    schedule: { groupId: schedule.groupId, month: schedule.month, year: schedule.year },
    userId: authResult.user.id,
  };

  switch (body.action) {
    case "commit":          return commitSchedule(ctx);
    case "swap":            return swapAssignment(ctx, body);
    case "remove":          return removeAssignment(ctx, body);
    case "assign":          return assignMember(ctx, body);
    case "unassign":        return unassignMember(ctx, body);
    case "bulk_update":     return bulkUpdateAssignments(ctx, body);
    case "rebuild_preview":
    case "rebuild_apply":   return rebuildSchedule(ctx, body);
    case "add_date":        return addScheduleDate(ctx, body);
    case "update_date":     return updateScheduleDate(ctx, body);
    case "remove_date":     return removeScheduleDate(ctx, body);
    default:                return apiError("Acción inválida", 400, "VALIDATION");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const scheduleId = parseInt(id, 10);

  const existing = (await db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId)))[0];

  if (!existing) {
    return apiError("Cronograma no encontrado", 404, "NOT_FOUND");
  }

  const delAccess = await hasGroupAccess(authResult.user.id, existing.groupId);
  if (!delAccess) {
    return apiError("Sin permiso", 403, "FORBIDDEN");
  }

  await db.delete(schedules).where(eq(schedules.id, scheduleId));
  await revalidateCronograma(existing.groupId, existing.month, existing.year);
  return NextResponse.json({ success: true });
}
