CREATE TABLE IF NOT EXISTS `quarterly_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`year` integer NOT NULL,
	`quarter` integer NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`is_locked` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quarterly_reports_workspace_idx` ON `quarterly_reports` (`workspace_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `quarterly_reports_workspace_period_idx` ON `quarterly_reports` (`workspace_id`,`year`,`quarter`);
