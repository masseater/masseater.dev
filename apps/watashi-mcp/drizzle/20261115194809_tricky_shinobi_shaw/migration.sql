CREATE TABLE `ledger_account` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`class` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ledger_balance` (
	`account_id` text NOT NULL,
	`date` text NOT NULL,
	`balance` integer NOT NULL,
	CONSTRAINT `ledger_balance_pk` PRIMARY KEY(`account_id`, `date`),
	CONSTRAINT `fk_ledger_balance_account_id_ledger_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `ledger_account`(`id`)
);
--> statement-breakpoint
CREATE TABLE `ledger_category_rule` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`pattern` text NOT NULL UNIQUE,
	`category` text NOT NULL,
	`label` text
);
--> statement-breakpoint
CREATE TABLE `ledger_import` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_ledger_import_account_id_ledger_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `ledger_account`(`id`)
);
--> statement-breakpoint
CREATE TABLE `ledger_transaction` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`account_id` text NOT NULL,
	`import_id` text NOT NULL,
	`date` text NOT NULL,
	`amount` integer NOT NULL,
	`description` text NOT NULL,
	`normalized` text NOT NULL,
	`memo` text,
	`category` text NOT NULL,
	`label` text,
	`manual` integer NOT NULL,
	`hash` text NOT NULL,
	CONSTRAINT `fk_ledger_transaction_account_id_ledger_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `ledger_account`(`id`),
	CONSTRAINT `fk_ledger_transaction_import_id_ledger_import_id_fk` FOREIGN KEY (`import_id`) REFERENCES `ledger_import`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_transaction_hash_idx` ON `ledger_transaction` (`hash`);--> statement-breakpoint
CREATE INDEX `ledger_transaction_date_idx` ON `ledger_transaction` (`date`);--> statement-breakpoint
CREATE INDEX `ledger_transaction_import_idx` ON `ledger_transaction` (`import_id`);