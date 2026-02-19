CREATE TABLE "schedule_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"detail" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedule_audit_log" ADD CONSTRAINT "schedule_audit_log_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_audit_log" ADD CONSTRAINT "schedule_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;