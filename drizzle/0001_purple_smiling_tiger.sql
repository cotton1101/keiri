CREATE TABLE `account_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('income','expense','asset','liability') NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`categoryId` int,
	`name` varchar(100) NOT NULL,
	`type` enum('income','expense','asset','liability') NOT NULL,
	`code` varchar(10) NOT NULL DEFAULT '',
	`description` text,
	`isDefault` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessName` varchar(255) NOT NULL DEFAULT '',
	`representativeName` varchar(255) NOT NULL DEFAULT '',
	`postalCode` varchar(10) NOT NULL DEFAULT '',
	`address` text,
	`phone` varchar(20) NOT NULL DEFAULT '',
	`email` varchar(320) NOT NULL DEFAULT '',
	`taxId` varchar(50) NOT NULL DEFAULT '',
	`bankName` varchar(100) NOT NULL DEFAULT '',
	`bankBranch` varchar(100) NOT NULL DEFAULT '',
	`bankAccountType` varchar(20) NOT NULL DEFAULT '',
	`bankAccountNumber` varchar(20) NOT NULL DEFAULT '',
	`bankAccountName` varchar(100) NOT NULL DEFAULT '',
	`fiscalYearStart` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactPerson` varchar(255) NOT NULL DEFAULT '',
	`email` varchar(320) NOT NULL DEFAULT '',
	`phone` varchar(20) NOT NULL DEFAULT '',
	`postalCode` varchar(10) NOT NULL DEFAULT '',
	`address` text,
	`memo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
	`unitPrice` decimal(12,0) NOT NULL,
	`amount` decimal(12,0) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `invoice_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` int,
	`invoiceNumber` varchar(50) NOT NULL,
	`status` enum('draft','sent','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
	`issueDate` bigint NOT NULL,
	`dueDate` bigint NOT NULL,
	`subtotal` decimal(12,0) NOT NULL DEFAULT '0',
	`taxRate` decimal(5,2) NOT NULL DEFAULT '10.00',
	`taxAmount` decimal(12,0) NOT NULL DEFAULT '0',
	`totalAmount` decimal(12,0) NOT NULL DEFAULT '0',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plan` enum('free','premium') NOT NULL DEFAULT 'free',
	`startDate` bigint,
	`endDate` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('income','expense') NOT NULL,
	`accountId` int NOT NULL,
	`amount` decimal(12,0) NOT NULL,
	`date` bigint NOT NULL,
	`description` varchar(500) NOT NULL DEFAULT '',
	`memo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
