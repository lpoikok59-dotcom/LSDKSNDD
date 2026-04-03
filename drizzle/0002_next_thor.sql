CREATE TABLE `admin_auth` (
	`id` int AUTO_INCREMENT NOT NULL,
	`password` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_auth_id` PRIMARY KEY(`id`)
);
