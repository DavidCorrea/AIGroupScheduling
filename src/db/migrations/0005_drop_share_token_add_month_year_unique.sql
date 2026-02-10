CREATE UNIQUE INDEX "schedules_month_year_unique" ON "schedules" USING btree ("month","year");--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "share_token";