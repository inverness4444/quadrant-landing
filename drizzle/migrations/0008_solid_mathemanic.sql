CREATE TABLE `assessment_cycle_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`self_status` text NOT NULL,
	`manager_status` text NOT NULL,
	`final_status` text NOT NULL,
	`manager_employee_id` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `assessment_cycles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`manager_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `assessment_participants_cycle_idx` ON `assessment_cycle_participants` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `assessment_participants_employee_idx` ON `assessment_cycle_participants` (`employee_id`);--> statement-breakpoint
CREATE TABLE `assessment_cycle_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_id` text NOT NULL,
	`team_id` text NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `assessment_cycles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assessment_cycle_teams_cycle_idx` ON `assessment_cycle_teams` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `assessment_cycle_teams_team_idx` ON `assessment_cycle_teams` (`team_id`);--> statement-breakpoint
CREATE TABLE `assessment_cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`created_by_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assessment_cycles_workspace_idx` ON `assessment_cycles` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `assessment_cycles_status_idx` ON `assessment_cycles` (`status`);--> statement-breakpoint
CREATE TABLE `skill_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`self_level` integer,
	`manager_level` integer,
	`final_level` integer,
	`self_comment` text,
	`manager_comment` text,
	`final_comment` text,
	`status` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `assessment_cycles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_assessments_cycle_idx` ON `skill_assessments` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `skill_assessments_employee_idx` ON `skill_assessments` (`employee_id`);--> statement-breakpoint
CREATE INDEX `skill_assessments_skill_idx` ON `skill_assessments` (`skill_id`);