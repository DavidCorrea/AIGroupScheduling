-- Add recurring_event_id to schedule_date if missing.
-- Run against the same database your app uses, e.g.:
--   psql "$DATABASE_URL" -f scripts/add_recurring_event_id.sql
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE "schedule_date"
  ADD COLUMN IF NOT EXISTS "recurring_event_id" integer
  REFERENCES "recurring_events"("id") ON DELETE SET NULL;
