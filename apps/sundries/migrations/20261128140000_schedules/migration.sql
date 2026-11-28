ALTER TABLE `claude_requests` ADD `project` text;
--> statement-breakpoint
ALTER TABLE `claude_requests` ADD `schedule_id` text;
--> statement-breakpoint
ALTER TABLE `claude_requests` ADD `slot` integer;
--> statement-breakpoint
ALTER TABLE `claude_requests` ADD `woken_at` integer;
--> statement-breakpoint
CREATE UNIQUE INDEX `claude_requests_schedule_slot_idx` ON `claude_requests` (`schedule_id`,`slot`);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`cron` text NOT NULL,
	`timezone` text NOT NULL,
	`project` text,
	`model` text,
	`prompt` text NOT NULL,
	`enabled` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedule_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`schedule_id` text NOT NULL,
	`definition` text NOT NULL,
	`changed_by` text NOT NULL,
	`changed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `schedule_revisions_schedule_id_idx` ON `schedule_revisions` (`schedule_id`);
