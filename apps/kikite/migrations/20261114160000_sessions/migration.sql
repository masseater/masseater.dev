CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`theme` text NOT NULL,
	`entries` integer NOT NULL,
	`record` text NOT NULL
);
