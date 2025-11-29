CREATE TABLE `onboarding_states` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`steps` text DEFAULT '{}' NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES workspaces(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_states_workspace_id_unique` ON `onboarding_states` (`workspace_id`);
--> statement-breakpoint
INSERT INTO `onboarding_states` (
	`id`,
	`workspace_id`,
	`steps`,
	`is_completed`,
	`created_at`,
	`updated_at`
)
SELECT
	lower(hex(randomblob(16))),
	`workspaces`.`id`,
	'{"invitedMembers":false,"createdEmployee":false,"createdSkill":false,"createdTrack":false,"connectedIntegration":false}',
	0,
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
FROM `workspaces`;
