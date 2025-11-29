CREATE TABLE `pilot_step_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`pilot_id` text NOT NULL,
	`step_id` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`notes` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`pilot_id`) REFERENCES `pilots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`step_id`) REFERENCES `pilot_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_step_statuses_pilot_step_idx` ON `pilot_step_statuses` (`pilot_id`,`step_id`);--> statement-breakpoint
CREATE INDEX `pilot_step_statuses_pilot_idx` ON `pilot_step_statuses` (`pilot_id`);--> statement-breakpoint
CREATE TABLE `pilot_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`pilot_id` text NOT NULL,
	`key` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`mandatory` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`pilot_id`) REFERENCES `pilots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pilot_steps_pilot_idx` ON `pilot_steps` (`pilot_id`);--> statement-breakpoint
CREATE INDEX `pilot_steps_key_idx` ON `pilot_steps` (`pilot_id`,`key`);--> statement-breakpoint
CREATE TABLE `pilots` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`start_date` text,
	`end_date` text,
	`goals` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pilots_workspace_idx` ON `pilots` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `pilots_workspace_status_idx` ON `pilots` (`workspace_id`,`status`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_onboarding_states` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`steps` text DEFAULT '{}' NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_onboarding_states`("id", "workspace_id", "steps", "is_completed", "created_at", "updated_at") SELECT "id", "workspace_id", "steps", "is_completed", "created_at", "updated_at" FROM `onboarding_states`;--> statement-breakpoint
DROP TABLE `onboarding_states`;--> statement-breakpoint
ALTER TABLE `__new_onboarding_states` RENAME TO `onboarding_states`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_states_workspace_id_unique` ON `onboarding_states` (`workspace_id`);