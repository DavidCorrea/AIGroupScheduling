import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holidays, members } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireGroupAccess, apiError, parseBody } from "@/lib/api-helpers";
import { configHolidayCreateSchema } from "@/lib/schemas/holidays";
import { loadGroupHolidays } from "@/lib/data-access";

/**
 * Admin-managed member-level holidays for a group.
 * GET also returns user-scoped holidays for linked members.
 */

export async function GET(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const result = await loadGroupHolidays(groupId);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const raw = await request.json();
  const parsed = parseBody(configHolidayCreateSchema, raw);
  if (parsed.error) return parsed.error;
  const { memberId, startDate, endDate, description } = parsed.data;

  // Verify member belongs to this group
  const member = (await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.groupId, groupId))))[0];

  if (!member) {
    return apiError("Miembro no encontrado en este grupo", 404, "NOT_FOUND");
  }

  const holiday = (await db
    .insert(holidays)
    .values({
      memberId,
      startDate,
      endDate,
      description: description ?? null,
    })
    .returning())[0];

  return NextResponse.json(
    { ...holiday, memberName: member.name },
    { status: 201 }
  );
}

// DELETE by id: use DELETE /api/configuration/holidays/[id]?groupId= or ?slug=
