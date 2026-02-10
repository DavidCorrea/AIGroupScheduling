ALTER TABLE "members" DROP CONSTRAINT "members_user_id_users_id_fk";
ALTER TABLE "holidays" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "members" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "holidays" ADD COLUMN "member_id" integer;
ALTER TABLE "members" ADD COLUMN "name" text NOT NULL;
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;