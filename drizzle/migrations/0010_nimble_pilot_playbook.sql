CREATE TABLE IF NOT EXISTS `pilot_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`target_cycle_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_cycle_id`) REFERENCES `assessment_cycles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `pilot_runs_workspace_idx` ON `pilot_runs` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `pilot_runs_status_idx` ON `pilot_runs` (`workspace_id`,`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pilot_run_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`pilot_run_id` text NOT NULL,
	`team_id` text NOT NULL,
	FOREIGN KEY (`pilot_run_id`) REFERENCES `pilot_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pilot_run_teams_idx` ON `pilot_run_teams` (`pilot_run_id`,`team_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pilot_run_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`pilot_run_id` text NOT NULL,
	`key` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`due_date` text,
	`completed_at` text,
	FOREIGN KEY (`pilot_run_id`) REFERENCES `pilot_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pilot_run_steps_idx` ON `pilot_run_steps` (`pilot_run_id`);--> statement-breakpoint
CREATE INDEX `pilot_run_steps_key_idx` ON `pilot_run_steps` (`pilot_run_id`,`key`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pilot_run_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`pilot_run_id` text NOT NULL,
	`author_user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`related_team_id` text,
	`related_scenario_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`pilot_run_id`) REFERENCES `pilot_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_team_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`related_scenario_id`) REFERENCES `move_scenarios`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `pilot_run_notes_idx` ON `pilot_run_notes` (`pilot_run_id`);--> statement-breakpoint
CREATE INDEX `pilot_run_notes_team_idx` ON `pilot_run_notes` (`related_team_id`);
