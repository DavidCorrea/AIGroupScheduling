-- Step 1: Create schedule_date table
CREATE TABLE "schedule_date" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"date" text NOT NULL,
	"type" text NOT NULL,
	"label" text,
	"note" text,
	CONSTRAINT "schedule_date_schedule_id_date_unique" UNIQUE("schedule_id","date")
);
--> statement-breakpoint
ALTER TABLE "schedule_date" ADD CONSTRAINT "schedule_date_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Step 2: Populate schedule_date from entries, rehearsal_dates, extra_dates (type/label/note)
INSERT INTO "schedule_date" ("schedule_id", "date", "type", "label", "note")
SELECT
  d.schedule_id,
  d.date,
  CASE
    WHEN EXISTS (SELECT 1 FROM schedule_rehearsal_dates r WHERE r.schedule_id = d.schedule_id AND r.date = d.date)
      OR EXISTS (SELECT 1 FROM schedule_extra_dates e WHERE e.schedule_id = d.schedule_id AND e.date = d.date AND e.type = 'rehearsal')
    THEN 'for_everyone'
    ELSE 'assignable'
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM schedule_rehearsal_dates r WHERE r.schedule_id = d.schedule_id AND r.date = d.date)
      OR EXISTS (SELECT 1 FROM schedule_extra_dates e WHERE e.schedule_id = d.schedule_id AND e.date = d.date AND e.type = 'rehearsal')
    THEN 'Ensayo'
    ELSE NULL
  END,
  (SELECT n.description FROM schedule_date_notes n WHERE n.schedule_id = d.schedule_id AND n.date = d.date LIMIT 1)
FROM (
  SELECT DISTINCT schedule_id, date FROM schedule_entries
  UNION
  SELECT schedule_id, date FROM schedule_rehearsal_dates
  UNION
  SELECT schedule_id, date FROM schedule_extra_dates
) d;
--> statement-breakpoint
-- Step 2b: Backfill from isRehearsal (rehearsal weekdays per group -> dates in each schedule's month)
INSERT INTO "schedule_date" ("schedule_id", "date", "type", "label", "note")
SELECT dim.schedule_id, dim.date_str, 'for_everyone', 'Ensayo', NULL
FROM (
  SELECT
    s.id AS schedule_id,
    s.group_id,
    to_char((s.year || '-' || lpad(s.month::text, 2, '0') || '-' || lpad(gs.d::text, 2, '0'))::date, 'YYYY-MM-DD') AS date_str,
    extract(dow FROM (s.year || '-' || lpad(s.month::text, 2, '0') || '-' || lpad(gs.d::text, 2, '0'))::date)::int AS dow
  FROM schedules s
  CROSS JOIN LATERAL generate_series(1, (SELECT extract(day FROM (date_trunc('month', (s.year || '-' || lpad(s.month::text, 2, '0') || '-01')::date) + interval '1 month' - interval '1 day'))::int)) gs(d)
) dim
JOIN (SELECT 0 AS dow, 'Domingo' AS day_name UNION ALL SELECT 1, 'Lunes' UNION ALL SELECT 2, 'Martes' UNION ALL SELECT 3, 'Miércoles' UNION ALL SELECT 4, 'Jueves' UNION ALL SELECT 5, 'Viernes' UNION ALL SELECT 6, 'Sábado') dm ON dm.dow = dim.dow
JOIN (SELECT group_id, day_of_week FROM schedule_days WHERE is_rehearsal = true) rw ON rw.group_id = dim.group_id AND rw.day_of_week = dm.day_name
ON CONFLICT (schedule_id, date) DO NOTHING;
--> statement-breakpoint
-- Step 3: Add schedule_date_id to schedule_entries, backfill, then drop old columns
ALTER TABLE "schedule_entries" ADD COLUMN "schedule_date_id" integer;
--> statement-breakpoint
UPDATE schedule_entries e SET schedule_date_id = (SELECT sd.id FROM schedule_date sd WHERE sd.schedule_id = e.schedule_id AND sd.date = e.date LIMIT 1);
--> statement-breakpoint
ALTER TABLE "schedule_entries" ALTER COLUMN "schedule_date_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "schedule_entries" DROP CONSTRAINT "schedule_entries_schedule_id_schedules_id_fk";
--> statement-breakpoint
ALTER TABLE "schedule_entries" DROP COLUMN "schedule_id";
--> statement-breakpoint
ALTER TABLE "schedule_entries" DROP COLUMN "date";
--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_schedule_date_id_schedule_date_id_fk" FOREIGN KEY ("schedule_date_id") REFERENCES "public"."schedule_date"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Step 4: Drop old tables
DROP TABLE "schedule_rehearsal_dates";
--> statement-breakpoint
DROP TABLE "schedule_extra_dates";
--> statement-breakpoint
DROP TABLE "schedule_date_notes";
--> statement-breakpoint
-- Step 5: Remove is_rehearsal from schedule_days
ALTER TABLE "schedule_days" DROP COLUMN "is_rehearsal";
