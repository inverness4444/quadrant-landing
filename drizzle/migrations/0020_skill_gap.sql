CREATE TABLE IF NOT EXISTS role_profiles (
    id text primary key,
    workspace_id text not null references workspaces(id) on delete cascade,
    name text not null,
    description text,
    is_default integer not null default 0,
    created_at text not null default (CURRENT_TIMESTAMP),
    updated_at text not null default (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS role_profiles_workspace_idx ON role_profiles(workspace_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS role_profile_skill_requirements (
    id text primary key,
    role_profile_id text not null references role_profiles(id) on delete cascade,
    skill_code text not null,
    level_required integer not null,
    weight real not null default 1.0,
    created_at text not null default (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rpsr_role_profile_idx ON role_profile_skill_requirements(role_profile_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS employee_role_assignments (
    id text primary key,
    workspace_id text not null,
    employee_id text not null,
    role_profile_id text not null references role_profiles(id) on delete cascade,
    is_primary integer not null default 1,
    assigned_at text not null default (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS era_workspace_employee_idx ON employee_role_assignments(workspace_id, employee_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS employee_skill_ratings (
    id text primary key,
    workspace_id text not null,
    employee_id text not null,
    skill_code text not null,
    level integer not null,
    source text not null,
    rated_at text not null default (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS esr_workspace_employee_idx ON employee_skill_ratings(workspace_id, employee_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS esr_unique_skill_source_idx ON employee_skill_ratings(workspace_id, employee_id, skill_code, source);
