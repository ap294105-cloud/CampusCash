CREATE INDEX `idx_transactions_date_type` ON `transactions` (`occurred_on`,`type`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category_date` ON `transactions` (`category`,`occurred_on`);