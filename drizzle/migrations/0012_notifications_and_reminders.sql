CREATE TABLE IF NOT EXISTS `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`url` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_workspace_idx` ON `notifications` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`workspace_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_read_idx` ON `notifications` (`workspace_id`,`user_id`,`is_read`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `reminder_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`key` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`days_before` integer,
	`stale_days` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminder_rules_workspace_idx` ON `reminder_rules` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `reminder_rules_key_idx` ON `reminder_rules` (`workspace_id`,`key`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `reminder_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`type` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL DEFAULT 'running',
	`error_message` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminder_jobs_workspace_idx` ON `reminder_jobs` (`workspace_id`);
