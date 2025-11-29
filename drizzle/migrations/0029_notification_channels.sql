CREATE TABLE IF NOT EXISTS `notification_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`target` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`preferences` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `notification_channels_workspace_idx` ON `notification_channels` (`workspace_id`);
CREATE INDEX IF NOT EXISTS `notification_channels_user_idx` ON `notification_channels` (`workspace_id`,`user_id`);
