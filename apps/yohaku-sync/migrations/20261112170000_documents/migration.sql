CREATE TABLE `documents` (
	`revision` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted` integer NOT NULL,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_kind_id_idx` ON `documents` (`kind`,`id`);
