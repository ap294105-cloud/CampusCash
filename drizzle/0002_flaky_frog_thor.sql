CREATE TABLE `student_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`balance_paise` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_student_accounts_user` ON `student_accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `student_budgets` (
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`monthly_limit_paise` integer NOT NULL,
	PRIMARY KEY(`user_id`, `category`)
);
--> statement-breakpoint
CREATE TABLE `student_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`target_paise` integer NOT NULL,
	`current_paise` integer NOT NULL,
	`deadline` text NOT NULL,
	`kind` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_student_goals_user` ON `student_goals` (`user_id`);--> statement-breakpoint
CREATE TABLE `student_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`demo_initialized` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `student_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
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
--> statement-breakpoint
CREATE INDEX `idx_student_transactions_user_date_type` ON `student_transactions` (`user_id`,`occurred_on`,`type`);--> statement-breakpoint
CREATE INDEX `idx_student_transactions_user_category_date` ON `student_transactions` (`user_id`,`category`,`occurred_on`);