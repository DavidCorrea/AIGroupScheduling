import { z } from "zod";

export const adminAuthSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type AdminAuthBody = z.infer<typeof adminAuthSchema>;
