CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`namespace` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`value_bytes` integer NOT NULL,
	`blob_bytes` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `public_namespaces` (
	`name` text PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE `object_reads` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`day` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`day` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `entries_namespace_key_idx` ON `entries` (`namespace`,`key`,`id`);--> statement-breakpoint
CREATE INDEX `object_reads_day_idx` ON `object_reads` (`day`,`id`);--> statement-breakpoint
CREATE INDEX `uploads_day_idx` ON `uploads` (`day`,`id`);