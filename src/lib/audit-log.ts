import { db } from "./db";
import { scheduleAuditLog } from "@/db/schema";

export async function logScheduleAction(
  scheduleId: number,
  userId: string,
  action: string,
  detail?: string | object
): Promise<void> {
  const detailStr =
    detail == null
      ? null
      : typeof detail === "string"
        ? detail
        : JSON.stringify(detail);

  await db.insert(scheduleAuditLog).values({
    scheduleId,
    userId,
    action,
    detail: detailStr,
  });
}
