import { z } from "zod";

const timeString = z.string().regex(/^\d{1,2}:\d{2}$/, "Must be H:MM or HH:MM");

export const eventCreateSchema = z.object({
  dayOfWeek: z.string().min(1, "dayOfWeek is required").transform((s) => s.trim()),
  active: z.boolean().default(true),
  type: z
    .string()
    .transform((s) => s.toLowerCase())
    .pipe(z.enum(["assignable", "for_everyone"]))
    .default("assignable"),
  label: z.string().transform((s) => s.trim() || "Evento").default("Evento"),
  notes: z
    .string()
    .transform((s) => s.trim() || null)
    .nullable()
    .default(null),
  startTimeUtc: timeString.default("00:00"),
  endTimeUtc: timeString.default("23:59"),
});

export const eventUpdateSchema = z
  .object({
    id: z.number().int(),
    active: z.boolean().optional(),
    dayOfWeek: z
      .string()
      .transform((s) => s.trim())
      .optional(),
    type: z
      .string()
      .transform((s) => s.toLowerCase())
      .pipe(z.enum(["assignable", "for_everyone"]))
      .optional(),
    label: z
      .string()
      .transform((s) => s.trim() || "Evento")
      .optional(),
    notes: z
      .string()
      .transform((s) => s.trim() || null)
      .nullable()
      .optional(),
    startTimeUtc: timeString.optional(),
    endTimeUtc: timeString.optional(),
  });
