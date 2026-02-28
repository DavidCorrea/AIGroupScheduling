-- Migration: schedule_date optional reference to recurring_events
-- Allows tracking which recurring event a schedule date was generated from.

ALTER TABLE "schedule_date" ADD COLUMN IF NOT EXISTS "recurring_event_id" integer
  REFERENCES "recurring_events"("id") ON DELETE SET NULL;
