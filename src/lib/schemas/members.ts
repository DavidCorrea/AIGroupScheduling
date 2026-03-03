import { z } from "zod";

const availabilitySlotSchema = z.object({
  weekdayId: z.number(),
  startTimeUtc: z.string().optional(),
  endTimeUtc: z.string().optional(),
});

export const memberCreateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").transform((s) => s.trim()),
  email: z.string().optional(),
  roleIds: z.array(z.number()).optional().default([]),
  availableDayIds: z.array(z.number()).optional().default([]),
  availability: z.array(availabilitySlotSchema).optional().default([]),
});

export const memberUpdateSchema = z.object({
  name: z.string().min(1, "El nombre no puede estar vacío").transform((s) => s.trim()).optional(),
  email: z.string().optional(),
  userId: z.string().uuid().nullable().optional(),
  roleIds: z.array(z.number()).optional(),
  availableDayIds: z.array(z.number()).optional(),
  availability: z.array(availabilitySlotSchema).optional(),
});
