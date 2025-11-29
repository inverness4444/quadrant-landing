ALTER TABLE `quarterly_reports` ADD COLUMN `payload` text;
--> statement-breakpoint
ALTER TABLE `quarterly_reports` ADD COLUMN `generated_at` integer;
--> statement-breakpoint
ALTER TABLE `quarterly_reports` ADD COLUMN `generated_by_user_id` text REFERENCES users(id);
