CREATE TABLE `owner_trait` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`kind` text NOT NULL,
	`scope` text NOT NULL,
	`statement` text NOT NULL,
	`why` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`superseded_by` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `owner_trait_evidence` (
	`trait_id` integer NOT NULL,
	`source` text NOT NULL,
	`quote` text NOT NULL,
	`stance` text NOT NULL,
	`scope` text NOT NULL,
	`observed_at` text NOT NULL,
	CONSTRAINT `owner_trait_evidence_pk` PRIMARY KEY(`trait_id`, `source`)
);
--> statement-breakpoint
CREATE TABLE `owner_trait_vector` (
	`trait_id` integer PRIMARY KEY,
	`vector` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trait_cursor` (
	`origin` text PRIMARY KEY,
	`position` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `owner_trait_status_idx` ON `owner_trait` (`status`,`kind`);--> statement-breakpoint
CREATE INDEX `owner_trait_evidence_source_idx` ON `owner_trait_evidence` (`source`);