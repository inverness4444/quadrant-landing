-- Role skill requirements
CREATE TABLE IF NOT EXISTS role_skill_requirements (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES role_profiles(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  required_level INTEGER NOT NULL,
  importance INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, role_id, skill_id)
);

CREATE INDEX IF NOT EXISTS role_skill_req_workspace_idx ON role_skill_requirements (workspace_id);
