import type { RiskLevel, RiskStatus } from "@/drizzle/schema";

export type RiskCaseSummary = {
  id: string;
  workspaceId: string;
  employeeId: string;
  employeeName: string;
  employeeRole?: string | null;
  level: RiskLevel;
  status: RiskStatus;
  source: string;
  title: string;
  reason?: string | null;
  recommendation?: string | null;
  pilotId?: string | null;
  ownerUserId?: string | null;
  detectedAt: Date;
  updatedAt: Date;
};

export type RiskListResult = {
  items: RiskCaseSummary[];
  total: number;
  openCount: number;
  highCount: number;
};
