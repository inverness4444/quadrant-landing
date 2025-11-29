CREATE TABLE IF NOT EXISTS `skill_role_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`role_code` text,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_role_profiles_workspace_idx` ON `skill_role_profiles` (`workspace_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `skill_role_profile_items` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`target_level` integer NOT NULL,
	`weight` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `skill_role_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_role_profile_items_profile_idx` ON `skill_role_profile_items` (`profile_id`);
--> statement-breakpoint
CREATE INDEX `skill_role_profile_items_skill_idx` ON `skill_role_profile_items` (`skill_id`);
