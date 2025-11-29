-- Risk cases table
CREATE TABLE IF NOT EXISTS risk_cases (
    id text primary key,
    workspace_id text not null references workspaces(id) on delete cascade,
    employee_id text not null references employees(id) on delete cascade,
    detected_at text not null default (CURRENT_TIMESTAMP),
    level text not null,
    source text not null,
    status text not null default 'open',
    title text not null,
    reason text,
    recommendation text,
    pilot_id text references pilot_runs(id) on delete set null,
    created_by_user_id text references users(id) on delete set null,
    owner_user_id text references users(id) on delete set null,
    resolved_at text,
    resolution_note text,
    created_at text not null default (CURRENT_TIMESTAMP),
    updated_at text not null default (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS risk_cases_workspace_status_level_idx ON risk_cases(workspace_id, status, level);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS risk_cases_workspace_employee_status_idx ON risk_cases(workspace_id, employee_id, status);
