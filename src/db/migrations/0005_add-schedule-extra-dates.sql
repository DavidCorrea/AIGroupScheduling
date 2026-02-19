CREATE TABLE "schedule_extra_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"date" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedule_extra_dates" ADD CONSTRAINT "schedule_extra_dates_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;