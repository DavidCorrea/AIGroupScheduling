import { z } from "zod";

export const adminAuthSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type AdminAuthBody = z.infer<typeof adminAuthSchema>;

export const adminImpersonateSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

export type AdminImpersonateBody = z.infer<typeof adminImpersonateSchema>;

export const adminUserUpdateSchema = z.object({
  userId: z.string().min(1, "userId es obligatorio"),
  isAdmin: z.boolean().optional(),
  canCreateGroups: z.boolean().optional(),
  canExportCalendars: z.boolean().optional(),
});

export const adminGroupPatchSchema = z.object({
  groupId: z.number().int({ message: "groupId es obligatorio y debe ser un número" }),
  calendarExportEnabled: z.boolean({ message: "calendarExportEnabled debe ser true o false" }),
});
