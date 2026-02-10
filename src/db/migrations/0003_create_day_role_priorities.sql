CREATE TABLE "day_role_priorities" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_day_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "day_role_priorities" ADD CONSTRAINT "day_role_priorities_schedule_day_id_schedule_days_id_fk" FOREIGN KEY ("schedule_day_id") REFERENCES "public"."schedule_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_role_priorities" ADD CONSTRAINT "day_role_priorities_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;