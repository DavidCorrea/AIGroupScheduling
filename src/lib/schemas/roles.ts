import { z } from "zod";

export const roleCreateSchema = z.object({
  name: z.string().min(1, "Role name is required").transform((s) => s.trim()),
  requiredCount: z.number().int().min(0).optional().default(1),
  dependsOnRoleId: z.number().int().nullable().optional(),
  exclusiveGroupId: z.number().int().nullable().optional(),
  isRelevant: z.boolean().optional().default(false),
});

export const roleUpdateSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).transform((s) => s.trim()).optional(),
  requiredCount: z.number().int().min(0).optional(),
  dependsOnRoleId: z.number().int().nullable().optional(),
  exclusiveGroupId: z.number().int().nullable().optional(),
  isRelevant: z.boolean().optional(),
});

const orderItemSchema = z.object({
  id: z.number(),
  displayOrder: z.number(),
});

export const roleReorderSchema = z.object({
  order: z.array(orderItemSchema).min(1, "order array is required"),
});
