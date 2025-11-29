CREATE TABLE `job_role_skill_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`job_role_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`required_level` integer NOT NULL,
	`importance` text NOT NULL,
	FOREIGN KEY (`job_role_id`) REFERENCES `job_roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_role_skill_req_role_idx` ON `job_role_skill_requirements` (`job_role_id`);--> statement-breakpoint
CREATE INDEX `job_role_skill_req_skill_idx` ON `job_role_skill_requirements` (`skill_id`);--> statement-breakpoint
CREATE TABLE `job_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`level_band` text,
	`is_leadership` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_roles_workspace_idx` ON `job_roles` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `move_scenario_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`scenario_id` text NOT NULL,
	`type` text NOT NULL,
	`team_id` text,
	`from_employee_id` text,
	`to_employee_id` text,
	`job_role_id` text,
	`skill_id` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`estimated_time_months` integer,
	`estimated_cost_hire` integer,
	`estimated_cost_develop` integer,
	`impact_on_risk` integer,
	FOREIGN KEY (`scenario_id`) REFERENCES `move_scenarios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`from_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`to_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`job_role_id`) REFERENCES `job_roles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `move_actions_scenario_idx` ON `move_scenario_actions` (`scenario_id`);--> statement-breakpoint
CREATE INDEX `move_actions_team_idx` ON `move_scenario_actions` (`team_id`);--> statement-breakpoint
CREATE TABLE `move_scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`created_by_user_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `move_scenarios_workspace_idx` ON `move_scenarios` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `move_scenarios_status_idx` ON `move_scenarios` (`status`);