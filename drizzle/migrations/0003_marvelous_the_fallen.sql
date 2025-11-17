CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`max_members` integer,
	`max_integrations` integer,
	`max_employees` integer,
	`max_artifacts` integer,
	`is_default` integer DEFAULT false NOT NULL,
	`price_per_month` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plans_code_idx` ON `plans` (`code`);--> statement-breakpoint
CREATE INDEX `plans_is_default_idx` ON `plans` (`is_default`);--> statement-breakpoint
INSERT INTO `plans` (
	`id`,
	`code`,
	`name`,
	`description`,
	`max_members`,
	`max_integrations`,
	`max_employees`,
	`max_artifacts`,
	`is_default`,
	`price_per_month`,
	`created_at`,
	`updated_at`
) VALUES
	('plan_free', 'free', 'Free', 'Базовый тариф для старта с демо-данными', 20, 1, 20, NULL, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('plan_growth', 'growth', 'Growth', 'Расширенный тариф для растущих команд', 100, 3, 100, NULL, 0, 200, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('plan_scale', 'scale', 'Scale', 'Тариф для крупных enterprise-команд', 500, 5, 500, NULL, 0, 500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
ALTER TABLE `workspaces` ADD `plan_id` text REFERENCES plans(id);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `trial_ends_at` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `billing_email` text;--> statement-breakpoint
UPDATE `workspaces`
SET `plan_id` = (
	SELECT `id`
	FROM `plans`
	WHERE `code` = 'free'
)
WHERE `plan_id` IS NULL;--> statement-breakpoint
UPDATE `workspaces`
SET `billing_email` = (
	SELECT `email`
	FROM `users`
	WHERE `users`.`id` = `workspaces`.`owner_user_id`
)
WHERE `billing_email` IS NULL;
