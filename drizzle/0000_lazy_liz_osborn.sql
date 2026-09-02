CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`balance_paise` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`category` text PRIMARY KEY NOT NULL,
	`monthly_limit_paise` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target_paise` integer NOT NULL,
	`current_paise` integer NOT NULL,
	`deadline` text NOT NULL,
	`kind` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`occurred_on` text NOT NULL,
	`account` text DEFAULT 'UPI' NOT NULL,
	`payment_method` text DEFAULT 'UPI' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
