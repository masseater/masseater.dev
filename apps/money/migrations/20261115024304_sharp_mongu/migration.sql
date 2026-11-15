CREATE TABLE `accounts` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`class` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `balances` (
	`account_id` text NOT NULL,
	`date` text NOT NULL,
	`balance` integer NOT NULL,
	CONSTRAINT `balances_pk` PRIMARY KEY(`account_id`, `date`),
	CONSTRAINT `fk_balances_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`)
);
--> statement-breakpoint
CREATE TABLE `category_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`pattern` text NOT NULL UNIQUE,
	`category` text NOT NULL,
	`label` text
);
--> statement-breakpoint
CREATE TABLE `imports` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_imports_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
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
	CONSTRAINT `fk_transactions_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`),
	CONSTRAINT `fk_transactions_import_id_imports_id_fk` FOREIGN KEY (`import_id`) REFERENCES `imports`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_hash_idx` ON `transactions` (`hash`);--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);--> statement-breakpoint
CREATE INDEX `transactions_import_idx` ON `transactions` (`import_id`);