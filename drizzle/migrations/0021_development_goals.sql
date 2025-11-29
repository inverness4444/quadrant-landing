CREATE TABLE IF NOT EXISTS development_goals (
    id text primary key,
    workspace_id text not null references workspaces(id) on delete cascade,
    employee_id text not null references employees(id) on delete cascade,
    title text not null,
    description text,
    status text not null default 'active',
    priority integer not null default 2,
    created_by text not null references users(id) on delete cascade,
    created_at text not null default (CURRENT_TIMESTAMP),
    updated_at text not null default (CURRENT_TIMESTAMP),
    due_date text,
    target_skill_code text,
    target_level integer,
    role_profile_id text references role_profiles(id) on delete set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS development_goals_workspace_employee_idx ON development_goals(workspace_id, employee_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS development_goals_status_idx ON development_goals(workspace_id, status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS development_goal_checkins (
    id text primary key,
    goal_id text not null references development_goals(id) on delete cascade,
    workspace_id text not null,
    employee_id text not null,
    created_by text not null references users(id) on delete cascade,
    created_at text not null default (CURRENT_TIMESTAMP),
    note text not null,
    status text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS development_goal_checkins_goal_idx ON development_goal_checkins(goal_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS development_goal_checkins_workspace_employee_idx ON development_goal_checkins(workspace_id, employee_id);
