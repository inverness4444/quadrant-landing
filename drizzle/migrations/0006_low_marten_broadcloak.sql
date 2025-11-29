CREATE TABLE `artifact_assignees` (
	`id` text PRIMARY KEY NOT NULL,
	`artifact_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`role` text DEFAULT 'assignee' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`artifact_id`) REFERENCES `artifacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `artifact_assignees_artifact_idx` ON `artifact_assignees` (`artifact_id`);--> statement-breakpoint
CREATE INDEX `artifact_assignees_employee_idx` ON `artifact_assignees` (`employee_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`integration_id` text,
	`employee_id` text,
	`external_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`summary` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`ingested_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`integration_id`) REFERENCES `integrations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_artifacts`(
	`id`,
	`workspace_id`,
	`integration_id`,
	`employee_id`,
	`external_id`,
	`type`,
	`title`,
	`url`,
	`summary`,
	`created_at`,
	`updated_at`,
	`ingested_at`
) SELECT
	`id`,
	`workspace_id`,
	NULL,
	`employee_id`,
	NULL,
	`type`,
	`title`,
	`link`,
	`description`,
	`created_at`,
	`updated_at`,
	`created_at`
FROM `artifacts`;--> statement-breakpoint
DROP TABLE `artifacts`;--> statement-breakpoint
ALTER TABLE `__new_artifacts` RENAME TO `artifacts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `artifacts_workspace_idx` ON `artifacts` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `artifacts_integration_idx` ON `artifacts` (`integration_id`);--> statement-breakpoint
CREATE INDEX `artifacts_employee_idx` ON `artifacts` (`employee_id`);--> statement-breakpoint
CREATE INDEX `artifacts_external_idx` ON `artifacts` (`workspace_id`,`integration_id`,`external_id`);--> statement-breakpoint
DROP INDEX `integrations_workspace_type_idx`;--> statement-breakpoint
ALTER TABLE `integrations` ADD `name` text DEFAULT 'Integration' NOT NULL;--> statement-breakpoint
CREATE INDEX `integrations_workspace_type_idx` ON `integrations` (`workspace_id`,`type`);--> statement-breakpoint
CREATE TABLE `__new_artifact_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`artifact_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`confidence` real DEFAULT 0.5 NOT NULL,
	FOREIGN KEY (`artifact_id`) REFERENCES `artifacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_artifact_skills`(
	`id`,
	`artifact_id`,
	`skill_id`,
	`confidence`
) SELECT
	lower(hex(randomblob(16))),
	`artifact_id`,
	`skill_id`,
	COALESCE(`weight`, 0.5)
FROM `artifact_skills`;--> statement-breakpoint
DROP TABLE `artifact_skills`;--> statement-breakpoint
ALTER TABLE `__new_artifact_skills` RENAME TO `artifact_skills`;--> statement-breakpoint
CREATE INDEX `artifact_skills_artifact_idx` ON `artifact_skills` (`artifact_id`);--> statement-breakpoint
CREATE INDEX `artifact_skills_skill_idx` ON `artifact_skills` (`skill_id`);
