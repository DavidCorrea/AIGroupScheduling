CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "groups_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
INSERT INTO "groups" ("name", "slug") VALUES ('Default', 'default');--> statement-breakpoint
DROP INDEX "schedules_month_year_unique";--> statement-breakpoint
ALTER TABLE "exclusive_groups" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "schedule_days" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "group_id" integer;--> statement-breakpoint
UPDATE "exclusive_groups" SET "group_id" = (SELECT "id" FROM "groups" WHERE "slug" = 'default');--> statement-breakpoint
UPDATE "members" SET "group_id" = (SELECT "id" FROM "groups" WHERE "slug" = 'default');--> statement-breakpoint
UPDATE "roles" SET "group_id" = (SELECT "id" FROM "groups" WHERE "slug" = 'default');--> statement-breakpoint
UPDATE "schedule_days" SET "group_id" = (SELECT "id" FROM "groups" WHERE "slug" = 'default');--> statement-breakpoint
UPDATE "schedules" SET "group_id" = (SELECT "id" FROM "groups" WHERE "slug" = 'default');--> statement-breakpoint
ALTER TABLE "exclusive_groups" ALTER COLUMN "group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_days" ALTER COLUMN "group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "exclusive_groups" ADD CONSTRAINT "exclusive_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "schedules_group_month_year_unique" ON "schedules" USING btree ("group_id","month","year");
