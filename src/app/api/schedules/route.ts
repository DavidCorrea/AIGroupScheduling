import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  schedules,
  scheduleEntries,
  scheduleRehearsalDates,
  members,
  roles,
  memberRoles,
  memberAvailability,
  scheduleDays,
  holidays,
  dayRolePriorities,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateSchedule } from "@/lib/scheduler";
import { MemberInfo, RoleDefinition } from "@/lib/scheduler.types";
import { getScheduleDates, getRehearsalDates } from "@/lib/dates";
import { seedDefaults } from "@/lib/seed";

export async function GET() {
  const allSchedules = db
    .select()
    .from(schedules)
    .orderBy(schedules.year, schedules.month)
    .all();

  return NextResponse.json(allSchedules);
}

export async function POST(request: NextRequest) {
  seedDefaults();

  const body = await request.json();
  const { months } = body; // Array of { month, year }

  if (!months || !Array.isArray(months) || months.length === 0) {
    return NextResponse.json(
      { error: "months is required (array of { month, year })" },
      { status: 400 }
    );
  }

  // Get all schedule days
  const allDayRows = db.select().from(scheduleDays).all();
  const activeDayRows = allDayRows.filter((d) => d.active);
  const activeDayNames = activeDayRows.map((d) => d.dayOfWeek);
  const rehearsalDayNames = allDayRows
    .filter((d) => d.isRehearsal)
    .map((d) => d.dayOfWeek);

  if (activeDayNames.length === 0) {
    return NextResponse.json(
      { error: "No active schedule days configured" },
      { status: 400 }
    );
  }

  // Build day role priorities map
  const allPriorities = db.select().from(dayRolePriorities).all();
  const dayRolePriorityMap: Record<string, Record<number, number>> = {};
  for (const p of allPriorities) {
    const day = allDayRows.find((d) => d.id === p.scheduleDayId);
    if (day) {
      if (!dayRolePriorityMap[day.dayOfWeek]) {
        dayRolePriorityMap[day.dayOfWeek] = {};
      }
      dayRolePriorityMap[day.dayOfWeek][p.roleId] = p.priority;
    }
  }

  // Build role definitions (exclude dependent roles — they are manually assigned)
  const allRoles = db.select().from(roles).all();
  const roleDefinitions: RoleDefinition[] = allRoles
    .filter((r) => r.dependsOnRoleId == null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      requiredCount: r.requiredCount,
      exclusiveGroup: r.exclusiveGroup,
    }));

  // Build member info
  const allMembers = db.select().from(members).all();
  const allHolidays = db.select().from(holidays).all();

  const memberInfos: MemberInfo[] = allMembers.map((m) => {
    const mRoles = db
      .select()
      .from(memberRoles)
      .where(eq(memberRoles.memberId, m.id))
      .all();

    const mAvailability = db
      .select()
      .from(memberAvailability)
      .where(eq(memberAvailability.memberId, m.id))
      .all();

    // Map schedule day IDs to day-of-week names
    const availDayNames = mAvailability.map((a) => {
      const day = allDayRows.find((d) => d.id === a.scheduleDayId);
      return day?.dayOfWeek ?? "";
    }).filter(Boolean);

    const mHolidays = allHolidays
      .filter((h) => h.memberId === m.id)
      .map((h) => ({ startDate: h.startDate, endDate: h.endDate }));

    return {
      id: m.id,
      name: m.name,
      roleIds: mRoles.map((r) => r.roleId),
      availableDays: availDayNames,
      holidays: mHolidays,
    };
  });

  // Gather previous assignments from committed schedules for rotation continuity
  const committedSchedules = db
    .select()
    .from(schedules)
    .where(eq(schedules.status, "committed"))
    .all();

  const previousAssignments = committedSchedules.flatMap((s) =>
    db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.scheduleId, s.id))
      .all()
      .map((e) => ({
        date: e.date,
        roleId: e.roleId,
        memberId: e.memberId,
      }))
  );

  // Generate schedules for each requested month
  const createdSchedules = [];

  for (const { month, year } of months) {
    const dates = getScheduleDates(month, year, activeDayNames);
    const rehearsalDatesList = getRehearsalDates(month, year, rehearsalDayNames);

    if (dates.length === 0 && rehearsalDatesList.length === 0) continue;

    const result = generateSchedule({
      dates,
      roles: roleDefinitions,
      members: memberInfos,
      previousAssignments,
      dayRolePriorities:
        Object.keys(dayRolePriorityMap).length > 0
          ? dayRolePriorityMap
          : undefined,
    });

    // Save to database
    const schedule = db
      .insert(schedules)
      .values({ month, year, status: "draft" })
      .returning()
      .get();

    for (const assignment of result.assignments) {
      db.insert(scheduleEntries)
        .values({
          scheduleId: schedule.id,
          date: assignment.date,
          roleId: assignment.roleId,
          memberId: assignment.memberId,
        })
        .run();
    }

    // Save rehearsal dates
    for (const rehearsalDate of rehearsalDatesList) {
      db.insert(scheduleRehearsalDates)
        .values({ scheduleId: schedule.id, date: rehearsalDate })
        .run();
    }

    // Add these assignments to previousAssignments for subsequent months
    previousAssignments.push(...result.assignments);

    createdSchedules.push({
      ...schedule,
      assignments: result.assignments,
      unfilledSlots: result.unfilledSlots,
    });
  }

  return NextResponse.json(createdSchedules, { status: 201 });
}
