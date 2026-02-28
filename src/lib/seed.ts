import { db } from "./db";
import { recurringEvents, weekdays } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const DEFAULT_DAYS = [
  { dayOfWeek: "Lunes", active: false },
  { dayOfWeek: "Martes", active: false },
  { dayOfWeek: "Miércoles", active: true },
  { dayOfWeek: "Jueves", active: false },
  { dayOfWeek: "Viernes", active: true },
  { dayOfWeek: "Sábado", active: false },
  { dayOfWeek: "Domingo", active: true },
];

/**
 * Ensures the group has a recurring_events row for every weekday.
 * - If the group has no recurring events, inserts all 7 with default active/type.
 * - If the group has some but not all weekdays (e.g. after migration or partial config), inserts missing weekdays as inactive.
 * This way the config UI always shows all 7 days and schedule creation can include any weekday the user activates.
 */
export async function seedDefaults(groupId: number) {
  const weekdayRows = await db.select().from(weekdays).orderBy(weekdays.displayOrder);
  const nameToId = new Map(weekdayRows.map((w) => [w.name, w.id]));

  const existing = await db
    .select({ weekdayId: recurringEvents.weekdayId })
    .from(recurringEvents)
    .where(eq(recurringEvents.groupId, groupId));

  const existingWeekdayIds = new Set(existing.map((r) => r.weekdayId));
  const allWeekdayIds = new Set(weekdayRows.map((w) => w.id));
  const missingWeekdayIds = [...allWeekdayIds].filter((id) => !existingWeekdayIds.has(id));

  // Ensure for_everyone days are active so they appear in schedules (fixes existing data too)
  await db
    .update(recurringEvents)
    .set({ active: true })
    .where(
      and(
        eq(recurringEvents.groupId, groupId),
        eq(recurringEvents.type, "for_everyone")
      )
    );

  if (missingWeekdayIds.length === 0) return;

  if (existing.length === 0) {
    for (const day of DEFAULT_DAYS) {
      const weekdayId = nameToId.get(day.dayOfWeek);
      if (weekdayId != null) {
        await db.insert(recurringEvents).values({
          weekdayId,
          active: day.active,
          type: "assignable",
          label: "Evento",
          groupId,
        });
      }
    }
    return;
  }

  for (const weekdayId of missingWeekdayIds) {
    await db.insert(recurringEvents).values({
      weekdayId,
      active: false,
      type: "assignable",
      label: "Evento",
      groupId,
    });
  }
}
