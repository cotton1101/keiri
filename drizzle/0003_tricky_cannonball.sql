CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`invoiceId` int,
	`toEmail` varchar(320) NOT NULL,
	`toName` varchar(255) NOT NULL DEFAULT '',
	`subject` varchar(500) NOT NULL,
	`body` text,
	`documentType` enum('invoice','quote','order') NOT NULL DEFAULT 'invoice',
	`emailStatus` enum('sent','failed','pending') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tax_filings` ADD `incomeTax` decimal(12,0) DEFAULT '0' NOT NULL;