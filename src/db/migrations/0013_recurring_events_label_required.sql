-- Migration: recurring_events.label required with default 'Evento'
-- Backfill existing NULLs then set NOT NULL and default.

UPDATE "recurring_events" SET "label" = 'Evento' WHERE "label" IS NULL;
ALTER TABLE "recurring_events" ALTER COLUMN "label" SET DEFAULT 'Evento';
ALTER TABLE "recurring_events" ALTER COLUMN "label" SET NOT NULL;
