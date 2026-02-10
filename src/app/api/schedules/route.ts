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
import { eq, and, inArray } from "drizzle-orm";
import { generateSchedule } from "@/lib/scheduler";
import { MemberInfo, RoleDefinition } from "@/lib/scheduler.types";
import { getScheduleDates, getRehearsalDates } from "@/lib/dates";
import { seedDefaults } from "@/lib/seed";
import { extractGroupId } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const groupId = extractGroupId(request);
  if (groupId instanceof NextResponse) return groupId;

  const allSchedules = await db
    .select()
    .from(schedules)
    .where(eq(schedules.groupId, groupId))
    .orderBy(schedules.year, schedules.month);

  return NextResponse.json(allSchedules);
}

export async function POST(request: NextRequest) {
  const groupId = extractGroupId(request);
  if (groupId instanceof NextResponse) return groupId;

  await seedDefaults(groupId);

  const body = await request.json();
  const { months } = body; // Array of { month, year }

  if (!months || !Array.isArray(months) || months.length === 0) {
    return NextResponse.json(
      { error: "months is required (array of { month, year })" },
      { status: 400 }
    );
  }

  // Get all schedule days for this group
  const allDayRows = await db
    .select()
    .from(scheduleDays)
    .where(eq(scheduleDays.groupId, groupId));
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
  const dayIds = allDayRows.map((d) => d.id);
  const allPriorities = dayIds.length > 0
    ? await db.select().from(dayRolePriorities).where(inArray(dayRolePriorities.scheduleDayId, dayIds))
    : [];
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
  const allRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.groupId, groupId));
  const roleDefinitions: RoleDefinition[] = allRoles
    .filter((r) => r.dependsOnRoleId == null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      requiredCount: r.requiredCount,
      exclusiveGroupId: r.exclusiveGroupId,
    }));

  // Build member info
  const allMembers = await db
    .select()
    .from(members)
    .where(eq(members.groupId, groupId));
  const memberIds = allMembers.map((m) => m.id);
  const allHolidays = memberIds.length > 0
    ? await db.select().from(holidays).where(inArray(holidays.memberId, memberIds))
    : [];

  const memberInfos: MemberInfo[] = [];
  for (const m of allMembers) {
    const mRoles = await db
      .select()
      .from(memberRoles)
      .where(eq(memberRoles.memberId, m.id));

    const mAvailability = await db
      .select()
      .from(memberAvailability)
      .where(eq(memberAvailability.memberId, m.id));

    // Map schedule day IDs to day-of-week names
    const availDayNames = mAvailability.map((a) => {
      const day = allDayRows.find((d) => d.id === a.scheduleDayId);
      return day?.dayOfWeek ?? "";
    }).filter(Boolean);

    const mHolidays = allHolidays
      .filter((h) => h.memberId === m.id)
      .map((h) => ({ startDate: h.startDate, endDate: h.endDate }));

    memberInfos.push({
      id: m.id,
      name: m.name,
      roleIds: mRoles.map((r) => r.roleId),
      availableDays: availDayNames,
      holidays: mHolidays,
    });
  }

  // Gather previous assignments from committed schedules for this group
  const committedSchedules = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.groupId, groupId), eq(schedules.status, "committed")));

  const previousAssignments: { date: string; roleId: number; memberId: number }[] = [];
  for (const s of committedSchedules) {
    const entries = await db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.scheduleId, s.id));

    previousAssignments.push(
      ...entries.map((e) => ({
        date: e.date,
        roleId: e.roleId,
        memberId: e.memberId,
      }))
    );
  }

  // Generate schedules for each requested month
  const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const createdSchedules = [];

  for (const { month, year } of months) {
    // Enforce one schedule per month/year per group
    const existing = (await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.groupId, groupId), eq(schedules.month, month), eq(schedules.year, year))))[0];
    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un cronograma para ${MONTH_NAMES[month - 1]} ${year}.` },
        { status: 409 }
      );
    }

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
    const schedule = (await db
      .insert(schedules)
      .values({ month, year, status: "draft", groupId })
      .returning())[0];

    for (const assignment of result.assignments) {
      await db.insert(scheduleEntries)
        .values({
          scheduleId: schedule.id,
          date: assignment.date,
          roleId: assignment.roleId,
          memberId: assignment.memberId,
        });
    }

    // Save rehearsal dates
    for (const rehearsalDate of rehearsalDatesList) {
      await db.insert(scheduleRehearsalDates)
        .values({ scheduleId: schedule.id, date: rehearsalDate });
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
