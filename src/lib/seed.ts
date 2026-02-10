import { db } from "./db";
import { roles, scheduleDays } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_ROLES = [
  { name: "Leader", requiredCount: 1, displayOrder: 0, dependsOn: "Voice" },
  { name: "Teclado Principal", requiredCount: 1, displayOrder: 1, exclusiveGroup: "Instrumento" },
  { name: "Teclado Auxiliar", requiredCount: 1, displayOrder: 2, exclusiveGroup: "Instrumento" },
  { name: "Electric Guitar", requiredCount: 1, displayOrder: 3, exclusiveGroup: "Instrumento" },
  { name: "Acoustic Guitar", requiredCount: 1, displayOrder: 4, exclusiveGroup: "Instrumento" },
  { name: "Bass", requiredCount: 1, displayOrder: 5, exclusiveGroup: "Instrumento" },
  { name: "Drums", requiredCount: 1, displayOrder: 6, exclusiveGroup: "Instrumento" },
  { name: "Voice", requiredCount: 4, displayOrder: 7 },
];

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
 * Seeds the database with default roles and schedule days if they don't already exist.
 */
export async function seedDefaults() {
  const existingRoles = await db.select().from(roles);
  if (existingRoles.length === 0) {
    for (const role of DEFAULT_ROLES) {
      const { dependsOn, exclusiveGroup, ...rest } = role as typeof role & { dependsOn?: string; exclusiveGroup?: string };
      await db.insert(roles).values({ ...rest, exclusiveGroup: exclusiveGroup ?? null });
    }
    // Set up role dependencies after all roles are inserted
    const insertedRoles = await db.select().from(roles);
    for (const roleDef of DEFAULT_ROLES) {
      const def = roleDef as typeof roleDef & { dependsOn?: string };
      if (def.dependsOn) {
        const dependentRole = insertedRoles.find((r) => r.name === def.name);
        const sourceRole = insertedRoles.find((r) => r.name === def.dependsOn);
        if (dependentRole && sourceRole) {
          await db.update(roles)
            .set({ dependsOnRoleId: sourceRole.id })
            .where(eq(roles.id, dependentRole.id));
        }
      }
    }
  }

  const existingDays = await db.select().from(scheduleDays);
  if (existingDays.length === 0) {
    for (const day of DEFAULT_DAYS) {
      await db.insert(scheduleDays).values(day);
    }
  }
}
