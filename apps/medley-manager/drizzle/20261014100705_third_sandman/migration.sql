CREATE TABLE `part` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`video_id` integer NOT NULL,
	`position` integer NOT NULL,
	`song_id` integer,
	`ref_video_id` integer,
	`label` text,
	`bpm` text,
	`bars` text,
	`start_sec` real,
	`end_sec` real,
	`note` text,
	`comment` text,
	CONSTRAINT `fk_part_video_id_video_id_fk` FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_part_song_id_song_id_fk` FOREIGN KEY (`song_id`) REFERENCES `song`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_part_ref_video_id_video_id_fk` FOREIGN KEY (`ref_video_id`) REFERENCES `video`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `part_staff` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`part_id` integer NOT NULL,
	`person_id` integer NOT NULL,
	`role` text NOT NULL,
	CONSTRAINT `fk_part_staff_part_id_part_id_fk` FOREIGN KEY (`part_id`) REFERENCES `part`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_part_staff_person_id_person_id_fk` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE,
	CONSTRAINT `part_staff_part_id_person_id_role_unique` UNIQUE(`part_id`,`person_id`,`role`)
);
--> statement-breakpoint
CREATE TABLE `person` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE `person_alias` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`person_id` integer NOT NULL,
	`alias` text NOT NULL,
	CONSTRAINT `fk_person_alias_person_id_person_id_fk` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE,
	CONSTRAINT `person_alias_person_id_alias_unique` UNIQUE(`person_id`,`alias`)
);
--> statement-breakpoint
CREATE TABLE `song` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`artist` text,
	`url` text,
	`genre` text,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `song_alias` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`song_id` integer NOT NULL,
	`alias` text NOT NULL,
	CONSTRAINT `fk_song_alias_song_id_song_id_fk` FOREIGN KEY (`song_id`) REFERENCES `song`(`id`) ON DELETE CASCADE,
	CONSTRAINT `song_alias_song_id_alias_unique` UNIQUE(`song_id`,`alias`)
);
--> statement-breakpoint
CREATE TABLE `video` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`kind` text DEFAULT 'medley' NOT NULL,
	`video_id` text,
	`url` text NOT NULL,
	`uploader` text,
	`published_at` text,
	`note` text,
	`comment` text
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `part_video_position_idx` ON `part` (`video_id`,`position`);--> statement-breakpoint
CREATE INDEX `part_song_idx` ON `part` (`song_id`);--> statement-breakpoint
CREATE INDEX `part_ref_video_idx` ON `part` (`ref_video_id`);--> statement-breakpoint
CREATE INDEX `part_staff_person_idx` ON `part_staff` (`person_id`);--> statement-breakpoint
CREATE INDEX `person_alias_alias_idx` ON `person_alias` (`alias`);--> statement-breakpoint
CREATE INDEX `song_alias_alias_idx` ON `song_alias` (`alias`);--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);