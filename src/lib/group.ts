import { db } from "./db";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Resolve a group by its slug. Returns the group or null if not found.
 */
export async function resolveGroupBySlug(slug: string) {
  const group = (await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug)))[0];
  return group ?? null;
}
