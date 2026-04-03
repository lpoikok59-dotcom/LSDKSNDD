CREATE TABLE `page_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`label` varchar(200) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `page_content_id` PRIMARY KEY(`id`),
	CONSTRAINT `page_content_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `page_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`label` varchar(200) NOT NULL,
	`url` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `page_images_id` PRIMARY KEY(`id`),
	CONSTRAINT `page_images_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`ip` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `submissions_phone_unique` UNIQUE(`phone`)
);
