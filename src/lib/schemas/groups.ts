import { z } from "zod";

export const groupCreateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").transform((s) => s.trim()),
  slug: z.string().min(1, "El slug es obligatorio").regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones").transform((s) => s.trim()),
  days: z.array(z.object({
    weekdayId: z.number().optional(),
    dayOfWeek: z.string().optional(),
    active: z.boolean().optional(),
    type: z.enum(["assignable", "for_everyone"]).optional(),
    label: z.string().optional(),
  })).optional(),
  roles: z.array(z.object({ name: z.string() })).optional(),
  collaboratorUserIds: z.array(z.string()).optional(),
});
