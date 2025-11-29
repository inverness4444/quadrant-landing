ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at text;
--> statement-breakpoint
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at text;
--> statement-breakpoint
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority integer DEFAULT 2;
--> statement-breakpoint
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS channel text DEFAULT 'in_app';
--> statement-breakpoint
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS enabled integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS type text;
