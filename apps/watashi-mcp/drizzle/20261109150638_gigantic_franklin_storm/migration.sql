CREATE TABLE `api_token` (
	`id` text PRIMARY KEY,
	`scope` text NOT NULL,
	`label` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE TABLE `conversation_chunk` (
	`kind` text NOT NULL,
	`session_id` text NOT NULL,
	`file` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`redactions` integer NOT NULL,
	`stored_bytes` integer NOT NULL,
	`object_key` text NOT NULL,
	`at` text NOT NULL,
	CONSTRAINT `conversation_chunk_pk` PRIMARY KEY(`kind`, `session_id`, `file`, `start`)
);
--> statement-breakpoint
CREATE TABLE `conversation_session` (
	`kind` text NOT NULL,
	`session_id` text NOT NULL,
	`cwd` text NOT NULL,
	`source` text NOT NULL,
	`remote_session` text NOT NULL,
	`first_at` text NOT NULL,
	`last_at` text NOT NULL,
	CONSTRAINT `conversation_session_pk` PRIMARY KEY(`kind`, `session_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_token_hash_idx` ON `api_token` (`token_hash`);--> statement-breakpoint
CREATE INDEX `conversation_session_last_at_idx` ON `conversation_session` (`last_at`);