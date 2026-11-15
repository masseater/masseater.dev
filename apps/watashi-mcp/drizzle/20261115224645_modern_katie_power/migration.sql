CREATE TABLE `owner_profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`source_hash` text NOT NULL,
	`markdown` text NOT NULL,
	`markdown_ja` text NOT NULL,
	`built_at` text NOT NULL
);
