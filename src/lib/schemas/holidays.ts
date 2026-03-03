import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const configHolidayCreateSchema = z
  .object({
    memberId: z.number().int(),
    startDate: dateString,
    endDate: dateString,
    description: z.string().nullable().optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "La fecha de inicio debe ser anterior o igual a la fecha de fin",
    path: ["endDate"],
  });
export type ConfigHolidayCreate = z.infer<typeof configHolidayCreateSchema>;
