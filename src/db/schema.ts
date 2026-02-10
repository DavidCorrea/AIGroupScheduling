import { pgTable, text, integer, serial, boolean } from "drizzle-orm/pg-core";

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  requiredCount: integer("required_count").notNull().default(1),
  displayOrder: integer("display_order").notNull().default(0),
  dependsOnRoleId: integer("depends_on_role_id"),
  exclusiveGroup: text("exclusive_group"),
});

export const memberRoles = pgTable("member_roles", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
});

export const scheduleDays = pgTable("schedule_days", {
  id: serial("id").primaryKey(),
  dayOfWeek: text("day_of_week").notNull(),
  active: boolean("active").notNull().default(true),
  isRehearsal: boolean("is_rehearsal").notNull().default(false),
});

export const memberAvailability = pgTable("member_availability", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  scheduleDayId: integer("schedule_day_id")
    .notNull()
    .references(() => scheduleDays.id, { onDelete: "cascade" }),
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  description: text("description"),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  status: text("status", { enum: ["draft", "committed"] })
    .notNull()
    .default("draft"),
  shareToken: text("share_token"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const scheduleEntries = pgTable("schedule_entries", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id")
    .notNull()
    .references(() => schedules.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id),
});

export const scheduleDateNotes = pgTable("schedule_date_notes", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id")
    .notNull()
    .references(() => schedules.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  description: text("description").notNull(),
});

export const scheduleRehearsalDates = pgTable("schedule_rehearsal_dates", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id")
    .notNull()
    .references(() => schedules.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
});

export const dayRolePriorities = pgTable("day_role_priorities", {
  id: serial("id").primaryKey(),
  scheduleDayId: integer("schedule_day_id")
    .notNull()
    .references(() => scheduleDays.id, { onDelete: "cascade" }),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  priority: integer("priority").notNull().default(0),
});
