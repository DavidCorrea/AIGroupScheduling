CREATE TABLE `day_role_priorities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`schedule_day_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`schedule_day_id`) REFERENCES `schedule_days`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schedule_date_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`schedule_id` integer NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schedule_rehearsal_dates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`schedule_id` integer NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `schedule_days` ADD `is_rehearsal` integer DEFAULT false NOT NULL;