CREATE TABLE `claude_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`sender` text NOT NULL,
	`created_at` integer NOT NULL,
	`taken_at` integer,
	`thread_url` text,
	`reply` text,
	`replied_at` integer
);
--> statement-breakpoint
CREATE INDEX `claude_requests_taken_at_idx` ON `claude_requests` (`taken_at`);
