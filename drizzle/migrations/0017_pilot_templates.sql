-- Add pilot templates and linkage to pilots
ALTER TABLE pilot_runs ADD COLUMN IF NOT EXISTS template_id text;
--> statement-breakpoint
ALTER TABLE pilot_runs ADD COLUMN IF NOT EXISTS origin text DEFAULT 'manual';
--> statement-breakpoint
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS template_id text;
--> statement-breakpoint
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS origin text DEFAULT 'manual';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS pilot_templates (
    id text primary key,
    workspace_id text references workspaces(id) on delete cascade,
    slug text not null,
    title text not null,
    description text,
    target_role text,
    target_skill_id text references skills(id) on delete set null,
    suggested_duration_weeks integer,
    intensity_level text,
    is_global integer default 0,
    is_archived integer default 0,
    created_at text not null default (CURRENT_TIMESTAMP),
    updated_at text not null default (CURRENT_TIMESTAMP),
    created_by_user_id text references users(id) on delete set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS pilot_templates_slug_workspace_idx ON pilot_templates(slug, workspace_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS pilot_templates_global_idx ON pilot_templates(is_global, is_archived);

CREATE TABLE IF NOT EXISTS pilot_template_steps (
    id text primary key,
    template_id text not null references pilot_templates(id) on delete cascade,
    order_index integer not null,
    title text not null,
    description text,
    expected_outcome text,
    suggested_due_offset_weeks integer,
    is_required integer default 1
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS pilot_template_steps_template_idx ON pilot_template_steps(template_id);
