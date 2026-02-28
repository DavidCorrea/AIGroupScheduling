-- Migration: member_availability time range (UTC). Backfill existing rows as all-day (00:00–23:59 UTC).

ALTER TABLE "member_availability" ADD COLUMN "start_time_utc" text NOT NULL DEFAULT '00:00';
ALTER TABLE "member_availability" ADD COLUMN "end_time_utc" text NOT NULL DEFAULT '23:59';
