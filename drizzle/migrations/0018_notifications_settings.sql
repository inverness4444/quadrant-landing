-- New notifications settings and archiving flag
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_archived integer DEFAULT 0;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS notification_settings (
    id text primary key,
    workspace_id text not null references workspaces(id) on delete cascade,
    user_id text not null references users(id) on delete cascade,
    email_enabled integer default 1,
    email_daily_digest integer default 1,
    email_weekly_digest integer default 0,
    in_app_enabled integer default 1,
    timezone text,
    created_at text not null default (CURRENT_TIMESTAMP),
    updated_at text not null default (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS notification_settings_workspace_user_idx ON notification_settings(workspace_id, user_id);
