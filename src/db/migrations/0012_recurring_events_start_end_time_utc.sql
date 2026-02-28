-- Migration: recurring_events start_time_utc and end_time_utc for event time window
-- Algorithm uses these to select only members whose availability overlaps the event window.

ALTER TABLE "recurring_events" ADD COLUMN IF NOT EXISTS "start_time_utc" text DEFAULT '00:00' NOT NULL;
ALTER TABLE "recurring_events" ADD COLUMN IF NOT EXISTS "end_time_utc" text DEFAULT '23:59' NOT NULL;
