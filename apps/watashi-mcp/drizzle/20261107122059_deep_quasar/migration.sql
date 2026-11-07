CREATE TABLE `revision` (
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`rev` integer NOT NULL,
	`op` text NOT NULL,
	`body` text NOT NULL,
	`actor` text NOT NULL,
	`at` text NOT NULL,
	CONSTRAINT `revision_pk` PRIMARY KEY(`entity`, `entity_id`, `rev`)
);
