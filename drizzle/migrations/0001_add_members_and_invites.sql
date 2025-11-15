CREATE TABLE `members` (
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `workspace_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `members_workspace_idx` ON `members` (`workspace_id`);
--> statement-breakpoint
CREATE INDEX `members_user_idx` ON `members` (`user_id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `members` (`user_id`, `workspace_id`, `role`, `created_at`, `updated_at`)
SELECT `owner_user_id`, `id`, 'owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM `workspaces`;
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`token` text NOT NULL,
	`status` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invites_workspace_idx` ON `invites` (`workspace_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `invites_token_idx` ON `invites` (`token`);
--> statement-breakpoint
CREATE INDEX `invites_email_workspace_idx` ON `invites` (`email`, `workspace_id`);
--> statement-breakpoint
CREATE INDEX `invites_status_idx` ON `invites` (`status`);
