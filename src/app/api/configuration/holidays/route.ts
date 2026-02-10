import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holidays, members } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { extractGroupId } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const groupId = extractGroupId(request);
  if (groupId instanceof NextResponse) return groupId;

  // Get member IDs for this group, then filter holidays
  const groupMembers = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.groupId, groupId));

  const memberIds = groupMembers.map((m) => m.id);
  if (memberIds.length === 0) {
    return NextResponse.json([]);
  }

  const allHolidays = await db
    .select()
    .from(holidays)
    .where(inArray(holidays.memberId, memberIds));
  return NextResponse.json(allHolidays);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { memberId, startDate, endDate, description } = body;

  if (!memberId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "memberId, startDate, and endDate are required" },
      { status: 400 }
    );
  }

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "startDate must be before or equal to endDate" },
      { status: 400 }
    );
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

  return NextResponse.json(holiday, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Holiday id is required" },
      { status: 400 }
    );
  }

  const holidayId = parseInt(id, 10);
  const existing = (await db
    .select()
    .from(holidays)
    .where(eq(holidays.id, holidayId)))[0];

  if (!existing) {
    return NextResponse.json(
      { error: "Holiday not found" },
      { status: 404 }
    );
  }

  await db.delete(holidays).where(eq(holidays.id, holidayId));

  return NextResponse.json({ success: true });
}
