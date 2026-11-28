ALTER TABLE `person` ADD `search_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `person_alias` ADD `search_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `song` ADD `search_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `song_alias` ADD `search_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `video` ADD `search_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `person` SET `search_key` = replace(replace(`name`, '%', '％'), '_', '＿');--> statement-breakpoint
CREATE TRIGGER `person_search_key_insert` AFTER INSERT ON `person` BEGIN UPDATE `person` SET `search_key` = replace(replace(NEW.`name`, '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;--> statement-breakpoint
CREATE TRIGGER `person_search_key_update` AFTER UPDATE OF `name` ON `person` BEGIN UPDATE `person` SET `search_key` = replace(replace(NEW.`name`, '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;--> statement-breakpoint
UPDATE `person_alias` SET `search_key` = replace(replace(`alias`, '%', '％'), '_', '＿');--> statement-breakpoint
CREATE TRIGGER `person_alias_search_key_insert` AFTER INSERT ON `person_alias` BEGIN UPDATE `person_alias` SET `search_key` = replace(replace(NEW.`alias`, '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;--> statement-breakpoint
CREATE TRIGGER `person_alias_search_key_update` AFTER UPDATE OF `alias` ON `person_alias` BEGIN UPDATE `person_alias` SET `search_key` = replace(replace(NEW.`alias`, '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;--> statement-breakpoint
UPDATE `song` SET `search_key` = replace(replace(`title` || char(10) || coalesce(`artist`, ''), '%', '％'), '_', '＿');--> statement-breakpoint
CREATE TRIGGER `song_search_key_insert` AFTER INSERT ON `song` BEGIN UPDATE `song` SET `search_key` = replace(replace(NEW.`title` || char(10) || coalesce(NEW.`artist`, ''), '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;--> statement-breakpoint
CREATE TRIGGER `song_search_key_update` AFTER UPDATE OF `title`, `artist` ON `song` BEGIN UPDATE `song` SET `search_key` = replace(replace(NEW.`title` || char(10) || coalesce(NEW.`artist`, ''), '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;--> statement-breakpoint
UPDATE `song_alias` SET `search_key` = replace(replace(`alias`, '%', '％'), '_', '＿');--> statement-breakpoint
CREATE TRIGGER `song_alias_search_key_insert` AFTER INSERT ON `song_alias` BEGIN UPDATE `song_alias` SET `search_key` = replace(replace(NEW.`alias`, '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;--> statement-breakpoint
CREATE TRIGGER `song_alias_search_key_update` AFTER UPDATE OF `alias` ON `song_alias` BEGIN UPDATE `song_alias` SET `search_key` = replace(replace(NEW.`alias`, '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;--> statement-breakpoint
UPDATE `video` SET `search_key` = replace(replace(`title` || char(10) || coalesce(`video_id`, '') || char(10) || coalesce(`uploader`, ''), '%', '％'), '_', '＿');--> statement-breakpoint
CREATE TRIGGER `video_search_key_insert` AFTER INSERT ON `video` BEGIN UPDATE `video` SET `search_key` = replace(replace(NEW.`title` || char(10) || coalesce(NEW.`video_id`, '') || char(10) || coalesce(NEW.`uploader`, ''), '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;--> statement-breakpoint
CREATE TRIGGER `video_search_key_update` AFTER UPDATE OF `title`, `video_id`, `uploader` ON `video` BEGIN UPDATE `video` SET `search_key` = replace(replace(NEW.`title` || char(10) || coalesce(NEW.`video_id`, '') || char(10) || coalesce(NEW.`uploader`, ''), '%', '％'), '_', '＿') WHERE `id` = NEW.`id`; END;
