ALTER TABLE `life_record` ADD `search_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `memory` ADD `search_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `life_record` SET `search_key` = replace(replace(`search_text`, '%', '％'), '_', '＿');--> statement-breakpoint
CREATE TRIGGER `life_record_search_key_insert` AFTER INSERT ON `life_record` BEGIN UPDATE `life_record` SET `search_key` = replace(replace(NEW.`search_text`, '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;--> statement-breakpoint
CREATE TRIGGER `life_record_search_key_update` AFTER UPDATE OF `search_text` ON `life_record` BEGIN UPDATE `life_record` SET `search_key` = replace(replace(NEW.`search_text`, '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;--> statement-breakpoint
UPDATE `memory` SET `search_key` = replace(replace(`name` || char(10) || `description` || char(10) || `content`, '%', '％'), '_', '＿');--> statement-breakpoint
CREATE TRIGGER `memory_search_key_insert` AFTER INSERT ON `memory` BEGIN UPDATE `memory` SET `search_key` = replace(replace(NEW.`name` || char(10) || NEW.`description` || char(10) || NEW.`content`, '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;--> statement-breakpoint
CREATE TRIGGER `memory_search_key_update` AFTER UPDATE OF `name`, `description`, `content` ON `memory` BEGIN UPDATE `memory` SET `search_key` = replace(replace(NEW.`name` || char(10) || NEW.`description` || char(10) || NEW.`content`, '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;
