import { z } from "zod";

export const scheduleCreateSchema = z.object({
  months: z
    .array(
      z.object({
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2000).max(2100),
      })
    )
    .min(1, "months is required"),
});

const commitAction = z.object({ action: z.literal("commit") });

const swapAction = z.object({
  action: z.literal("swap"),
  entryId: z.number().int(),
  newMemberId: z.number().int(),
});

const removeAction = z.object({
  action: z.literal("remove"),
  entryId: z.number().int(),
});

const assignAction = z.object({
  action: z.literal("assign"),
  roleId: z.number().int(),
  memberId: z.number().int(),
  scheduleDateId: z.number().int().optional(),
  date: z.string().optional(),
});

const unassignAction = z.object({
  action: z.literal("unassign"),
  entryId: z.number().int(),
});

const bulkUpdateAction = z.object({
  action: z.literal("bulk_update"),
  entries: z.array(
    z.object({
      scheduleDateId: z.number().int().optional(),
      date: z.string().optional(),
      roleId: z.number().int(),
      memberId: z.number().int().nullable(),
    })
  ),
});

const rebuildPreviewAction = z.object({
  action: z.literal("rebuild_preview"),
  mode: z.enum(["overwrite", "fill_empty"]),
});

const rebuildApplyAction = z.object({
  action: z.literal("rebuild_apply"),
  mode: z.enum(["overwrite", "fill_empty"]),
});

const addDateAction = z.object({
  action: z.literal("add_date"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  type: z.enum(["assignable", "for_everyone"]).default("assignable"),
  label: z.string().optional(),
});

const hhmmPattern = z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM");

const updateDateAction = z.object({
  action: z.literal("update_date"),
  scheduleDateId: z.number().int().optional(),
  date: z.string().optional(),
  startTimeUtc: hhmmPattern.optional(),
  endTimeUtc: hhmmPattern.optional(),
  note: z.string().optional(),
});

const removeDateAction = z.object({
  action: z.literal("remove_date"),
  scheduleDateId: z.number().int().optional(),
  date: z.string().optional(),
});

export const scheduleActionSchema = z.discriminatedUnion("action", [
  commitAction,
  swapAction,
  removeAction,
  assignAction,
  unassignAction,
  bulkUpdateAction,
  rebuildPreviewAction,
  rebuildApplyAction,
  addDateAction,
  updateDateAction,
  removeDateAction,
]);

export type ScheduleAction = z.infer<typeof scheduleActionSchema>;
