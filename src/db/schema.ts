import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const roles = sqliteTable("roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  requiredCount: integer("required_count").notNull().default(1),
  displayOrder: integer("display_order").notNull().default(0),
  dependsOnRoleId: integer("depends_on_role_id"),
  exclusiveGroup: text("exclusive_group"),
});

export const memberRoles = sqliteTable("member_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
});

export const scheduleDays = sqliteTable("schedule_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayOfWeek: text("day_of_week").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  isRehearsal: integer("is_rehearsal", { mode: "boolean" }).notNull().default(false),
});

export const memberAvailability = sqliteTable("member_availability", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  scheduleDayId: integer("schedule_day_id")
    .notNull()
    .references(() => scheduleDays.id, { onDelete: "cascade" }),
});

export const holidays = sqliteTable("holidays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  description: text("description"),
});

export const schedules = sqliteTable("schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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

export const scheduleEntries = sqliteTable("schedule_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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

export const scheduleDateNotes = sqliteTable("schedule_date_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scheduleId: integer("schedule_id")
    .notNull()
    .references(() => schedules.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  description: text("description").notNull(),
});

export const scheduleRehearsalDates = sqliteTable("schedule_rehearsal_dates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scheduleId: integer("schedule_id")
    .notNull()
    .references(() => schedules.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
});

export const dayRolePriorities = sqliteTable("day_role_priorities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scheduleDayId: integer("schedule_day_id")
    .notNull()
    .references(() => scheduleDays.id, { onDelete: "cascade" }),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  priority: integer("priority").notNull().default(0),
});
