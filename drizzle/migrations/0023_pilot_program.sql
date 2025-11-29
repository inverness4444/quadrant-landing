ALTER TABLE pilot_runs ADD COLUMN IF NOT EXISTS start_date text;
--> statement-breakpoint
ALTER TABLE pilot_runs ADD COLUMN IF NOT EXISTS end_date text;
--> statement-breakpoint
ALTER TABLE pilot_runs ADD COLUMN IF NOT EXISTS target_audience text;
--> statement-breakpoint
ALTER TABLE pilot_runs ADD COLUMN IF NOT EXISTS success_criteria text;
--> statement-breakpoint
ALTER TABLE pilot_runs ADD COLUMN IF NOT EXISTS notes text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS pilot_run_participants (
    id text primary key,
    pilot_run_id text not null references pilot_runs(id) on delete cascade,
    workspace_id text not null references workspaces(id) on delete cascade,
    employee_id text not null references employees(id) on delete cascade,
    role_in_pilot text,
    created_at text not null default (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS pilot_run_participants_pilot_idx ON pilot_run_participants(pilot_run_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS pilot_run_participants_workspace_employee_idx ON pilot_run_participants(workspace_id, employee_id);
