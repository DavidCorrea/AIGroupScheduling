import { db } from "./db";
import { scheduleDays } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_DAYS = [
  { dayOfWeek: "Lunes", active: false, isRehearsal: false },
  { dayOfWeek: "Martes", active: false, isRehearsal: false },
  { dayOfWeek: "Miércoles", active: true, isRehearsal: false },
  { dayOfWeek: "Jueves", active: false, isRehearsal: false },
  { dayOfWeek: "Viernes", active: true, isRehearsal: false },
  { dayOfWeek: "Sábado", active: false, isRehearsal: false },
  { dayOfWeek: "Domingo", active: true, isRehearsal: false },
];

/**
 * Seeds the database with default schedule days for a given group
 * if that group doesn't already have any.
 */
export async function seedDefaults(groupId: number) {
  const existingDays = await db
    .select()
    .from(scheduleDays)
    .where(eq(scheduleDays.groupId, groupId));

  if (existingDays.length === 0) {
    for (const day of DEFAULT_DAYS) {
      await db.insert(scheduleDays).values({ ...day, groupId });
    }
  }
}
