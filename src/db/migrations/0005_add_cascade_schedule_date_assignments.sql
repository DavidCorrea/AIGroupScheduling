-- Add ON DELETE CASCADE so group delete can cascade through members/roles to assignments.
-- Use IF EXISTS so both legacy (schedule_entries_*) and current (schedule_date_assignments_*) constraint names work.
ALTER TABLE "schedule_date_assignments" DROP CONSTRAINT IF EXISTS "schedule_date_assignments_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "schedule_date_assignments" DROP CONSTRAINT IF EXISTS "schedule_entries_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "schedule_date_assignments" DROP CONSTRAINT IF EXISTS "schedule_date_assignments_member_id_members_id_fk";
--> statement-breakpoint
ALTER TABLE "schedule_date_assignments" DROP CONSTRAINT IF EXISTS "schedule_entries_member_id_members_id_fk";
--> statement-breakpoint
ALTER TABLE "schedule_date_assignments" ADD CONSTRAINT "schedule_date_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_date_assignments" ADD CONSTRAINT "schedule_date_assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;