CREATE TABLE IF NOT EXISTS `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`team_id` text,
	`pilot_run_id` text,
	`generated_from` text DEFAULT 'manual',
	`status` text NOT NULL DEFAULT 'draft',
	`created_by_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`pilot_run_id`) REFERENCES `pilot_runs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reports_workspace_idx` ON `reports` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`workspace_id`,`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `report_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`key` text,
	`title` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`content_markdown` text DEFAULT '' NOT NULL,
	`is_auto_generated` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_sections_report_idx` ON `report_sections` (`report_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `meeting_agendas` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`report_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`scheduled_at` text,
	`duration_minutes` integer,
	`created_by_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `meeting_agenda_workspace_idx` ON `meeting_agendas` (`workspace_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `meeting_agenda_items` (
	`id` text PRIMARY KEY NOT NULL,
	`agenda_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`body_markdown` text DEFAULT '' NOT NULL,
	`related_team_id` text,
	`related_pilot_run_id` text,
	`related_scenario_id` text,
	`is_auto_generated` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`agenda_id`) REFERENCES `meeting_agendas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_team_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`related_pilot_run_id`) REFERENCES `pilot_runs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`related_scenario_id`) REFERENCES `move_scenarios`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `meeting_agenda_items_idx` ON `meeting_agenda_items` (`agenda_id`);
