CREATE TABLE `marks` (
	`id` text PRIMARY KEY NOT NULL,
	`site` text NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`from_seconds` real NOT NULL,
	`to_seconds` real NOT NULL,
	`verb` text NOT NULL,
	`aspects` text NOT NULL,
	`words` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `marks_source` ON `marks` (`site`, `source_id`);
