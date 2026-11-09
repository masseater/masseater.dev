CREATE TABLE `life_record` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`record` text NOT NULL,
	`source` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`about` text DEFAULT '' NOT NULL,
	`day_start` text DEFAULT '' NOT NULL,
	`day_end` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`search_text` text DEFAULT '' NOT NULL,
	`retracted_at` text DEFAULT '' NOT NULL,
	`retract_reason` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `memory` ADD `evidence` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `memory` ADD `retracted_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `memory` ADD `retract_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS `todo_status_idx`;--> statement-breakpoint
CREATE INDEX `life_record_record_day_idx` ON `life_record` (`record`,`day_end`);--> statement-breakpoint
CREATE INDEX `life_record_record_label_idx` ON `life_record` (`record`,`label`);--> statement-breakpoint
DROP TABLE `todo`;