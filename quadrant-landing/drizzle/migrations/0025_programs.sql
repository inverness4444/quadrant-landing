-- Program templates and workspace programs
CREATE TABLE IF NOT EXISTS program_templates (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  target_roles TEXT NOT NULL DEFAULT '[]',
  target_size_hint TEXT NOT NULL DEFAULT '',
  default_duration_days INTEGER NOT NULL DEFAULT 90,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_programs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_code TEXT NOT NULL REFERENCES program_templates(code),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft',
  started_at TEXT,
  planned_end_at TEXT,
  actual_end_at TEXT,
  target_employee_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS workspace_programs_workspace_idx ON workspace_programs (workspace_id);
CREATE INDEX IF NOT EXISTS workspace_programs_status_idx ON workspace_programs (workspace_id, status);
