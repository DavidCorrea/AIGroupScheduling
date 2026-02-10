import { db } from "./db";
import { scheduleDays } from "@/db/schema";

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
