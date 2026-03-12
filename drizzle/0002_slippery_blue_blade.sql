CREATE TABLE `recurring_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('income','expense') NOT NULL,
	`accountId` int NOT NULL,
	`amount` decimal(12,0) NOT NULL,
	`description` varchar(500) NOT NULL DEFAULT '',
	`frequency` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
	`dayOfMonth` int NOT NULL DEFAULT 1,
	`isActive` int NOT NULL DEFAULT 1,
	`lastGeneratedDate` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recurring_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tax_filings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fiscalYear` int NOT NULL,
	`filingType` enum('blue','white') NOT NULL,
	`status` enum('draft','completed') NOT NULL DEFAULT 'draft',
	`totalIncome` decimal(12,0) NOT NULL DEFAULT '0',
	`totalExpense` decimal(12,0) NOT NULL DEFAULT '0',
	`netIncome` decimal(12,0) NOT NULL DEFAULT '0',
	`specialDeduction` decimal(12,0) NOT NULL DEFAULT '0',
	`taxableIncome` decimal(12,0) NOT NULL DEFAULT '0',
	`breakdownData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tax_filings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `filingType` enum('blue','white') DEFAULT 'white' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `receiptUrl` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `importSource` varchar(50);