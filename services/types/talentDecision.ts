export type TalentDecisionType =
  | "promote"
  | "lateral_move"
  | "role_change"
  | "keep_in_place"
  | "hire_external"
  | "monitor_risk";

export type TalentDecisionStatus = "proposed" | "approved" | "implemented" | "rejected";

export type TalentDecisionSourceType = "pilot" | "report" | "meeting" | "manual";

export type TalentDecisionDTO = {
  id: string;
  workspaceId: string;
  employeeId: string;
  employeeName: string;
  employeeRole?: string | null;
  teamName?: string | null;

  type: TalentDecisionType;
  status: TalentDecisionStatus;
  priority: "low" | "medium" | "high";

  sourceType: TalentDecisionSourceType;
  sourceId?: string | null;
  sourceLabel?: string | null;

  title: string;
  rationale: string;
  risks?: string | null;
  timeframe?: string | null;

  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};
