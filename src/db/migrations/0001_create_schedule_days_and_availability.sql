CREATE TABLE "holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "member_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"schedule_day_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_of_week" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_rehearsal" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_availability" ADD CONSTRAINT "member_availability_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_availability" ADD CONSTRAINT "member_availability_schedule_day_id_schedule_days_id_fk" FOREIGN KEY ("schedule_day_id") REFERENCES "public"."schedule_days"("id") ON DELETE cascade ON UPDATE no action;