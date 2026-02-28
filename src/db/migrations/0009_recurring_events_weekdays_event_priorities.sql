-- Migration: weekdays table, recurring_events (rename + type/label), member_availability by weekday_id, event_role_priorities

-- Step 1: Create weekdays reference table and seed 7 rows
CREATE TABLE "weekdays" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL UNIQUE,
  "display_order" integer NOT NULL DEFAULT 0
);

INSERT INTO "weekdays" ("id", "name", "display_order") VALUES
  (1, 'Lunes', 1),
  (2, 'Martes', 2),
  (3, 'Miércoles', 3),
  (4, 'Jueves', 4),
  (5, 'Viernes', 5),
  (6, 'Sábado', 6),
  (7, 'Domingo', 7);

-- Step 2: Add weekday_id to schedule_days, backfill, drop day_of_week
ALTER TABLE "schedule_days" ADD COLUMN "weekday_id" integer;

UPDATE "schedule_days" sd SET "weekday_id" = w.id
FROM "weekdays" w WHERE w.name = sd.day_of_week;

ALTER TABLE "schedule_days" ALTER COLUMN "weekday_id" SET NOT NULL;
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_weekday_id_weekdays_id_fk"
  FOREIGN KEY ("weekday_id") REFERENCES "public"."weekdays"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "schedule_days" DROP COLUMN "day_of_week";

-- Step 3: Add weekday_id to member_availability, backfill from schedule_days, drop schedule_day_id
ALTER TABLE "member_availability" ADD COLUMN "weekday_id" integer;

UPDATE "member_availability" ma SET "weekday_id" = sd.weekday_id
FROM "schedule_days" sd WHERE sd.id = ma.schedule_day_id;

ALTER TABLE "member_availability" ALTER COLUMN "weekday_id" SET NOT NULL;
ALTER TABLE "member_availability" DROP CONSTRAINT "member_availability_schedule_day_id_schedule_days_id_fk";
ALTER TABLE "member_availability" DROP COLUMN "schedule_day_id";
ALTER TABLE "member_availability" ADD CONSTRAINT "member_availability_weekday_id_weekdays_id_fk"
  FOREIGN KEY ("weekday_id") REFERENCES "public"."weekdays"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "member_availability_member_id_weekday_id_unique" ON "member_availability" ("member_id", "weekday_id");

-- Step 4: Rename schedule_days to recurring_events
ALTER TABLE "schedule_days" RENAME TO "recurring_events";

-- Step 5: Add type and label to recurring_events
ALTER TABLE "recurring_events" ADD COLUMN "type" text;
ALTER TABLE "recurring_events" ADD COLUMN "label" text;
UPDATE "recurring_events" SET "type" = 'assignable', "label" = null;
ALTER TABLE "recurring_events" ALTER COLUMN "type" SET NOT NULL;

-- Step 6: Rename day_role_priorities to event_role_priorities, column to recurring_event_id
ALTER TABLE "day_role_priorities" RENAME TO "event_role_priorities";
ALTER TABLE "event_role_priorities" RENAME COLUMN "schedule_day_id" TO "recurring_event_id";
ALTER TABLE "event_role_priorities" DROP CONSTRAINT "day_role_priorities_schedule_day_id_schedule_days_id_fk";
ALTER TABLE "event_role_priorities" ADD CONSTRAINT "event_role_priorities_recurring_event_id_recurring_events_id_fk"
  FOREIGN KEY ("recurring_event_id") REFERENCES "public"."recurring_events"("id") ON DELETE cascade ON UPDATE no action;
