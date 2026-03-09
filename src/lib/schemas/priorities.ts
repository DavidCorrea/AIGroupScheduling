import { z } from "zod";

export const priorityCreateSchema = z.object({
  recurringEventId: z.number().int(),
  roleId: z.number().int(),
  priority: z.number().int(),
});

export const priorityBulkUpdateSchema = z.object({
  recurringEventId: z.number().int(),
  priorities: z
    .array(
      z.object({
        roleId: z.number().int(),
        priority: z.number().int(),
      })
    ),
});
