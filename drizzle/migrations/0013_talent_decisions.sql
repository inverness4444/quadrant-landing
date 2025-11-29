CREATE TABLE IF NOT EXISTS `talent_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`type` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`status` text DEFAULT 'proposed' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`title` text NOT NULL,
	`rationale` text NOT NULL,
	`risks` text,
	`timeframe` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `talent_decisions_workspace_idx` ON `talent_decisions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `talent_decisions_employee_idx` ON `talent_decisions` (`employee_id`);--> statement-breakpoint
CREATE INDEX `talent_decisions_status_idx` ON `talent_decisions` (`status`);--> statement-breakpoint
CREATE INDEX `talent_decisions_type_idx` ON `talent_decisions` (`type`);
