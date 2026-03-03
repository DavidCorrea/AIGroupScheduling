import { z } from "zod";

export const exclusiveGroupCreateSchema = z.object({
  name: z.string().min(1, "Group name is required").transform((s) => s.trim()),
});
