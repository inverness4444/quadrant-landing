CREATE TABLE `quest_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`quest_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	`mentor_employee_id` text,
	FOREIGN KEY (`quest_id`) REFERENCES `quests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mentor_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `quest_assignments_quest_idx` ON `quest_assignments` (`quest_id`);--> statement-breakpoint
CREATE INDEX `quest_assignments_employee_idx` ON `quest_assignments` (`employee_id`);--> statement-breakpoint
CREATE TABLE `quest_step_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`quest_assignment_id` text NOT NULL,
	`step_id` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`quest_assignment_id`) REFERENCES `quest_assignments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`step_id`) REFERENCES `quest_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quest_step_progress_assignment_idx` ON `quest_step_progress` (`quest_assignment_id`);--> statement-breakpoint
CREATE INDEX `quest_step_progress_step_idx` ON `quest_step_progress` (`step_id`);--> statement-breakpoint
CREATE TABLE `quest_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`quest_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`order_index` integer NOT NULL,
	`required` integer DEFAULT true NOT NULL,
	`related_skill_id` text,
	`suggested_artifacts_count` integer,
	FOREIGN KEY (`quest_id`) REFERENCES `quests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `quest_steps_quest_idx` ON `quest_steps` (`quest_id`);--> statement-breakpoint
CREATE TABLE `quest_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`target_role` text,
	`difficulty` text NOT NULL,
	`estimated_duration_weeks` integer,
	`created_by_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quest_templates_workspace_idx` ON `quest_templates` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `quests` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`template_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text NOT NULL,
	`owner_employee_id` text NOT NULL,
	`related_team_id` text,
	`priority` text NOT NULL,
	`goal_type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `quest_templates`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_team_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `quests_workspace_idx` ON `quests` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `quests_status_idx` ON `quests` (`status`);--> statement-breakpoint
CREATE INDEX `quests_team_idx` ON `quests` (`related_team_id`);