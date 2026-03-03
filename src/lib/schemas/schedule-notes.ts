import { z } from "zod";

export const scheduleNoteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  description: z.string().min(1, "description is required").transform((s) => s.trim()),
});
