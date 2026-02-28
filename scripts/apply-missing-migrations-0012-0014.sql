-- Run this in Neon SQL editor when migrations 0012–0014 did not apply (e.g. Vercel build).
-- Idempotent: safe to run multiple times.
-- After this, future migrations (0015+) work normally via npm run db:migrate or Vercel build;
-- the next migrate will re-run 0012–0014 (no-ops), record them, then apply newer ones.

-- 0012: recurring_events start_time_utc and end_time_utc
ALTER TABLE "recurring_events" ADD COLUMN IF NOT EXISTS "start_time_utc" text DEFAULT '00:00' NOT NULL;
ALTER TABLE "recurring_events" ADD COLUMN IF NOT EXISTS "end_time_utc" text DEFAULT '23:59' NOT NULL;

-- 0013: recurring_events.label required with default 'Evento'
UPDATE "recurring_events" SET "label" = 'Evento' WHERE "label" IS NULL;
ALTER TABLE "recurring_events" ALTER COLUMN "label" SET DEFAULT 'Evento';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recurring_events' AND column_name = 'label'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "recurring_events" ALTER COLUMN "label" SET NOT NULL;
  END IF;
END $$;

-- 0014: schedule_date optional recurring_event_id
ALTER TABLE "schedule_date" ADD COLUMN IF NOT EXISTS "recurring_event_id" integer
  REFERENCES "recurring_events"("id") ON DELETE SET NULL;
