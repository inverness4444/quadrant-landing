CREATE TABLE IF NOT EXISTS program_templates (
    id text primary key,
    code text not null unique,
    name text not null,
    description text not null,
    target_roles text not null default '[]',
    target_size_hint text not null default '',
    default_duration_days integer not null default 90,
    created_at text not null default (CURRENT_TIMESTAMP),
    updated_at text not null default (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS workspace_programs (
    id text primary key,
    workspace_id text not null references workspaces(id) on delete cascade,
    template_code text not null references program_templates(code) on delete cascade,
    name text not null,
    description text not null,
    owner_id text not null references users(id),
    status text not null default 'draft',
    started_at text,
    planned_end_at text,
    actual_end_at text,
    target_employee_ids text not null default '[]',
    created_at text not null default (CURRENT_TIMESTAMP),
    updated_at text not null default (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS workspace_programs_idx ON workspace_programs(workspace_id, status);
