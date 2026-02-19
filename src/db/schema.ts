import { pgTable, text, integer, serial, boolean, uniqueIndex, timestamp, primaryKey } from "drizzle-orm/pg-core";

// ── Auth.js tables ──

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  isAdmin: boolean("is_admin").notNull().default(false),
  canCreateGroups: boolean("can_create_groups").notNull().default(false),
});

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (table) => [
  primaryKey({ columns: [table.provider, table.providerAccountId] }),
]);

// ── App tables ──

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const groupCollaborators = pgTable("group_collaborators", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  groupId: integer("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  groupId: integer("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("members_group_email_unique").on(table.groupId, table.email),
]);

export const exclusiveGroups = pgTable("exclusive_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  groupId: integer("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  requiredCount: integer("required_count").notNull().default(1),
  displayOrder: integer("display_order").notNull().default(0),
  dependsOnRoleId: integer("depends_on_role_id"),
  exclusiveGroupId: integer("exclusive_group_id").references(() => exclusiveGroups.id, { onDelete: "set null" }),
  isRelevant: boolean("is_relevant").notNull().default(false),
  groupId: integer("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
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
  groupId: integer("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
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
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  memberId: integer("member_id")
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
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  groupId: integer("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("schedules_group_month_year_unique").on(table.groupId, table.month, table.year),
]);

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

export const scheduleExtraDates = pgTable("schedule_extra_dates", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id")
    .notNull()
    .references(() => schedules.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  type: text("type").notNull(), // "regular" | "rehearsal"
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
