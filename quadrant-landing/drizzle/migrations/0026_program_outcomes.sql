-- Program outcomes
CREATE TABLE IF NOT EXISTS program_outcomes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL REFERENCES workspace_programs(id) ON DELETE CASCADE,
  summary_title TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  metrics TEXT NOT NULL DEFAULT '[]',
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  recommendations TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, program_id)
);

CREATE INDEX IF NOT EXISTS program_outcomes_workspace_idx ON program_outcomes (workspace_id);
CREATE INDEX IF NOT EXISTS program_outcomes_program_idx ON program_outcomes (program_id);
