import { db } from "./db";
import { scheduleDays } from "@/db/schema";

const DEFAULT_DAYS = [
  { dayOfWeek: "Monday", active: false, isRehearsal: false },
  { dayOfWeek: "Tuesday", active: false, isRehearsal: false },
  { dayOfWeek: "Wednesday", active: true, isRehearsal: false },
  { dayOfWeek: "Thursday", active: false, isRehearsal: false },
  { dayOfWeek: "Friday", active: true, isRehearsal: false },
  { dayOfWeek: "Saturday", active: false, isRehearsal: false },
  { dayOfWeek: "Sunday", active: true, isRehearsal: false },
];

/**
 * Seeds the database with default schedule days if they don't already exist.
 */
export async function seedDefaults() {
  const existingDays = await db.select().from(scheduleDays);
  if (existingDays.length === 0) {
    for (const day of DEFAULT_DAYS) {
      await db.insert(scheduleDays).values(day);
    }
  }
}
