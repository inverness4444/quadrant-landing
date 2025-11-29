-- Workspace onboarding state
CREATE TABLE IF NOT EXISTS workspace_onboarding_state (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  is_completed INTEGER NOT NULL DEFAULT 0,
  current_step TEXT NOT NULL DEFAULT 'company_info',
  completed_steps TEXT NOT NULL DEFAULT '[]',
  last_updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS workspace_onboarding_state_workspace_idx ON workspace_onboarding_state (workspace_id);
