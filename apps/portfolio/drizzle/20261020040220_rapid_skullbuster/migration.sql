CREATE TABLE `star` (
	`category` text NOT NULL,
	`slug` text NOT NULL,
	`visitor` text NOT NULL,
	CONSTRAINT `star_pk` PRIMARY KEY(`category`, `slug`, `visitor`)
);
